// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout session for subscription payments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Default URLs for development
const DEFAULT_SUCCESS_URL = 'donedex://onboarding/payment-success';
const DEFAULT_CANCEL_URL = 'donedex://onboarding/payment-canceled';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Parse request body
    const {
      organisationId,
      planId,
      billingInterval = 'monthly',
      userCount,
      addOnType,
      quantityBlocks,
      successUrl = DEFAULT_SUCCESS_URL,
      cancelUrl = DEFAULT_CANCEL_URL,
    } = await req.json();

    // Validate required fields
    if (!organisationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: organisationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get organisation details
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('id, name, billing_email, contact_email, stripe_customer_id')
      .eq('id', organisationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organisation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.billing_email || org.contact_email,
        name: org.name,
        metadata: {
          organisation_id: organisationId,
          supabase_org_id: organisationId,
        },
      });
      customerId = customer.id;

      await supabase
        .from('organisations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organisationId);
    }

    let session: Stripe.Checkout.Session;

    // ---- STORAGE ADD-ON CHECKOUT ----
    if (addOnType === 'storage') {
      const STORAGE_ADDON_PRICE_ID = Deno.env.get('STRIPE_STORAGE_ADDON_PRICE_ID') || '';
      const blocks = quantityBlocks || 1;

      if (!STORAGE_ADDON_PRICE_ID) {
        return new Response(
          JSON.stringify({ error: 'Storage add-on price not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STORAGE_ADDON_PRICE_ID,
            quantity: blocks,
          },
        ],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          organisation_id: organisationId,
          add_on_type: 'storage',
          quantity_blocks: String(blocks),
        },
      });
    }
    // ---- PLAN SUBSCRIPTION CHECKOUT ----
    else {
      if (!planId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: planId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: 'Plan not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build line items (base plan + per-user if applicable)
      const lineItems: Array<{ price: string; quantity: number }> = [];

      // Base plan price
      const basePriceId = billingInterval === 'annual'
        ? plan.stripe_price_id_annual
        : plan.stripe_price_id_monthly;

      if (!basePriceId) {
        return new Response(
          JSON.stringify({ error: `No Stripe price configured for ${billingInterval} billing` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lineItems.push({ price: basePriceId, quantity: 1 });

      // Per-user price (additional users beyond base_users_included)
      const perUserPriceId = billingInterval === 'annual'
        ? plan.stripe_per_user_price_id_annual
        : plan.stripe_per_user_price_id_monthly;

      if (perUserPriceId && userCount && userCount > (plan.base_users_included || 0)) {
        const additionalUsers = userCount - (plan.base_users_included || 0);
        lineItems.push({ price: perUserPriceId, quantity: additionalUsers });
      }

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: lineItems,
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            organisation_id: organisationId,
            plan_id: planId,
            billing_interval: billingInterval,
          },
        },
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          organisation_id: organisationId,
          plan_id: planId,
          billing_interval: billingInterval,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
      });

      // Update onboarding state with checkout session ID
      await supabase
        .from('onboarding_state')
        .update({
          stripe_checkout_session_id: session.id,
          selected_plan_id: planId,
          billing_interval: billingInterval,
        })
        .eq('organisation_id', organisationId);
    }

    // Return checkout URL
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
