// Supabase Edge Function: stripe-webhook
// Handles incoming Stripe webhook events for subscription management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Email notification helper
async function sendEmailNotification(
  type: string,
  to: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, to, data }),
    });

    if (!response.ok) {
      console.error('Failed to send email notification:', await response.text());
    } else {
      console.log(`Email notification sent: ${type} to ${to}`);
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Webhook event handlers
const WEBHOOK_HANDLERS: Record<string, (event: Stripe.Event) => Promise<void>> = {
  'checkout.session.completed': handleCheckoutComplete,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'customer.subscription.trial_will_end': handleTrialEnding,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handlePaymentFailed,
  'invoice.finalized': handleInvoiceFinalized,
};

// Handler: Checkout session completed
async function handleCheckoutComplete(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orgId = session.metadata?.organisation_id;

  if (!orgId) {
    console.error('No organisation_id in checkout session metadata');
    return;
  }

  // Update organisation with Stripe customer ID
  const { error } = await supabase
    .from('organisations')
    .update({
      stripe_customer_id: session.customer as string,
      subscription_status: 'active',
    })
    .eq('id', orgId);

  if (error) {
    console.error('Error updating organisation after checkout:', error);
    throw error;
  }

  console.log(`Checkout completed for org ${orgId}`);
}

// Handler: Subscription created
async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  await updateSubscriptionStatus(subscription);
  console.log(`Subscription created: ${subscription.id}`);
}

// Handler: Subscription updated
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  await updateSubscriptionStatus(subscription);
  console.log(`Subscription updated: ${subscription.id}`);
}

// Handler: Subscription deleted/canceled
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // Get org by Stripe customer ID
  const { data: org } = await supabase
    .from('organisations')
    .select('id, current_plan_id, contact_email, name')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!org) {
    console.error('Organisation not found for customer:', subscription.customer);
    return;
  }

  // Get free plan
  const { data: freePlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('slug', 'free')
    .single();

  // Downgrade to free plan
  const { error } = await supabase
    .from('organisations')
    .update({
      subscription_status: 'canceled',
      current_plan_id: freePlan?.id,
      subscription_ends_at: null,
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error downgrading subscription:', error);
    throw error;
  }

  // Record subscription change
  await supabase.rpc('record_subscription_change', {
    p_org_id: org.id,
    p_plan_id: freePlan?.id,
    p_stripe_subscription_id: subscription.id,
    p_status: 'canceled',
  });

  // Send cancellation email
  if (org.contact_email) {
    await sendEmailNotification('subscription_canceled', org.contact_email, {
      organisationName: org.name,
    });
  }

  console.log(`Subscription canceled for org ${org.id}, downgraded to free`);
}

// Handler: Trial ending soon (3 days before)
async function handleTrialEnding(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // Get org by Stripe customer ID
  const { data: org } = await supabase
    .from('organisations')
    .select('id, contact_email, name')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (org && org.contact_email) {
    const trialEndDate = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'soon';

    await sendEmailNotification('trial_ending', org.contact_email, {
      organisationName: org.name,
      daysRemaining: 3,
      trialEndDate,
    });

    console.log(`Trial ending notification sent for org ${org.id} (${org.name})`);
  }
}

// Handler: Invoice paid
async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  await syncInvoice(invoice);

  // Send receipt email
  if (invoice.customer && invoice.amount_paid > 0) {
    const { data: org } = await supabase
      .from('organisations')
      .select('id, contact_email, billing_email, name')
      .eq('stripe_customer_id', invoice.customer)
      .single();

    if (org) {
      const emailTo = org.billing_email || org.contact_email;
      if (emailTo) {
        await sendEmailNotification('invoice_paid', emailTo, {
          organisationName: org.name,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          paidDate: new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          invoiceNumber: invoice.number || invoice.id,
          invoicePdfUrl: invoice.invoice_pdf,
        });
      }
    }
  }

  console.log(`Invoice paid: ${invoice.id}`);
}

// Handler: Invoice payment failed
async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  await syncInvoice(invoice);

  // Update org status to past_due and send email
  if (invoice.customer) {
    const { data: org } = await supabase
      .from('organisations')
      .select('id, contact_email, billing_email, name')
      .eq('stripe_customer_id', invoice.customer)
      .single();

    if (org) {
      await supabase
        .from('organisations')
        .update({ subscription_status: 'past_due' })
        .eq('id', org.id);

      const emailTo = org.billing_email || org.contact_email;
      if (emailTo) {
        await sendEmailNotification('payment_failed', emailTo, {
          organisationName: org.name,
          amount: invoice.amount_due,
          currency: invoice.currency,
        });
      }
    }
  }

  console.log(`Payment failed for invoice: ${invoice.id}`);
}

// Handler: Invoice finalized
async function handleInvoiceFinalized(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  await syncInvoice(invoice);
  console.log(`Invoice finalized: ${invoice.id}`);
}

// Helper: Update subscription status
async function updateSubscriptionStatus(subscription: Stripe.Subscription) {
  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    paused: 'paused',
  };

  const status = statusMap[subscription.status] || 'active';

  // Get org by Stripe customer ID
  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!org) {
    console.error('Organisation not found for customer:', subscription.customer);
    return;
  }

  // Update organisation
  const { error } = await supabase
    .from('organisations')
    .update({
      subscription_status: status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      subscription_ends_at: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

// Helper: Sync invoice to database
async function syncInvoice(invoice: Stripe.Invoice) {
  // Get org by Stripe customer ID
  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!org) {
    console.log('Organisation not found for invoice, skipping sync');
    return;
  }

  const invoiceData = {
    organisation_id: org.id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription as string,
    status: invoice.status || 'draft',
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    currency: invoice.currency,
    tax: invoice.tax || 0,
    invoice_pdf_url: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    due_date: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString()
      : null,
    paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
    finalized_at: invoice.status_transitions?.finalized_at
      ? new Date(invoice.status_transitions.finalized_at * 1000).toISOString()
      : null,
  };

  // Upsert invoice
  const { error } = await supabase
    .from('invoices')
    .upsert(invoiceData, { onConflict: 'stripe_invoice_id' });

  if (error) {
    console.error('Error syncing invoice:', error);
    throw error;
  }
}

// Log webhook event
async function logWebhookEvent(event: Stripe.Event, error?: string) {
  // Get org ID if possible
  let orgId = null;
  let customerId = null;

  const data = event.data.object as Record<string, unknown>;
  if (data.metadata && typeof data.metadata === 'object') {
    const metadata = data.metadata as Record<string, string>;
    orgId = metadata.organisation_id;
  }
  if (data.customer) {
    customerId = data.customer as string;
    // Try to get org from customer ID
    if (!orgId) {
      const { data: org } = await supabase
        .from('organisations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      orgId = org?.id;
    }
  }

  await supabase.from('billing_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    organisation_id: orgId,
    stripe_customer_id: customerId,
    payload: event,
    processed_at: error ? null : new Date().toISOString(),
    error: error || null,
  });
}

// Main request handler
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook signature
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received webhook event: ${event.type}`);

  // Process the event
  const handler = WEBHOOK_HANDLERS[event.type];
  if (handler) {
    try {
      await handler(event);
      await logWebhookEvent(event);
      console.log(`Successfully processed ${event.type}`);
    } catch (err) {
      console.error(`Error processing ${event.type}:`, err);
      await logWebhookEvent(event, err.message);
      // Still return 200 to prevent Stripe from retrying
      // Error is logged for debugging
    }
  } else {
    console.log(`Unhandled event type: ${event.type}`);
    await logWebhookEvent(event);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
