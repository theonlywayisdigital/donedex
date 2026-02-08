"use strict";
/**
 * Stripe Webhook Cloud Function
 * Handles incoming Stripe webhook events for subscription management
 * Migrated from Supabase Edge Function
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const sendEmail_1 = require("../email/sendEmail");
// Lazy initialization for Stripe
let stripeClient = null;
function getStripe() {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        stripeClient = new stripe_1.default(secretKey, { apiVersion: '2023-10-16' });
    }
    return stripeClient;
}
const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || '';
// Get Firestore instance
function getDb() {
    return admin.firestore();
}
// Helper: Update subscription status
async function updateSubscriptionStatus(subscription) {
    const db = getDb();
    const statusMap = {
        trialing: 'trialing',
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'unpaid',
        paused: 'paused',
    };
    const status = statusMap[subscription.status] || 'active';
    // Get org by Stripe customer ID
    const orgsQuery = await db.collection('organisations')
        .where('stripe_customer_id', '==', subscription.customer)
        .limit(1)
        .get();
    if (orgsQuery.empty) {
        console.error('Organisation not found for customer:', subscription.customer);
        return;
    }
    const orgDoc = orgsQuery.docs[0];
    // Update organisation
    await orgDoc.ref.update({
        subscription_status: status,
        trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        subscription_ends_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
    });
}
// Helper: Sync invoice to database
async function syncInvoice(invoice) {
    const db = getDb();
    const orgsQuery = await db.collection('organisations')
        .where('stripe_customer_id', '==', invoice.customer)
        .limit(1)
        .get();
    if (orgsQuery.empty) {
        console.log('Organisation not found for invoice, skipping sync');
        return;
    }
    const orgDoc = orgsQuery.docs[0];
    const invoiceData = {
        organisation_id: orgDoc.id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
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
        updated_at: new Date().toISOString(),
    };
    // Upsert invoice by stripe_invoice_id
    const existingInvoice = await db.collection('invoices')
        .where('stripe_invoice_id', '==', invoice.id)
        .limit(1)
        .get();
    if (existingInvoice.empty) {
        await db.collection('invoices').add(Object.assign(Object.assign({}, invoiceData), { created_at: new Date().toISOString() }));
    }
    else {
        await existingInvoice.docs[0].ref.update(invoiceData);
    }
}
// Handler: Checkout session completed
async function handleCheckoutComplete(event) {
    var _a, _b, _c, _d, _e;
    const db = getDb();
    const session = event.data.object;
    const orgId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.organisation_id;
    if (!orgId) {
        console.error('No organisation_id in checkout session metadata');
        return;
    }
    // Check if this is a storage add-on purchase
    if (((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.add_on_type) === 'storage') {
        const quantityBlocks = parseInt(((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.quantity_blocks) || '1', 10);
        const subscriptionId = session.subscription;
        let subscriptionItemId = null;
        if (subscriptionId) {
            const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
            subscriptionItemId = ((_d = subscription.items.data[0]) === null || _d === void 0 ? void 0 : _d.id) || null;
        }
        // Check for existing addon
        const existingAddon = await db.collection('storage_addons')
            .where('organisation_id', '==', orgId)
            .limit(1)
            .get();
        const addonData = {
            organisation_id: orgId,
            quantity_blocks: quantityBlocks,
            block_size_gb: 10,
            price_per_block_monthly_gbp: 500,
            stripe_subscription_item_id: subscriptionItemId,
            stripe_price_id: ((_e = session.metadata) === null || _e === void 0 ? void 0 : _e.stripe_price_id) || null,
            is_active: true,
            updated_at: new Date().toISOString(),
        };
        if (existingAddon.empty) {
            await db.collection('storage_addons').add(Object.assign(Object.assign({}, addonData), { created_at: new Date().toISOString() }));
        }
        else {
            await existingAddon.docs[0].ref.update(addonData);
        }
        console.log(`Storage add-on purchased for org ${orgId}: ${quantityBlocks} blocks`);
        return;
    }
    // Standard plan subscription checkout
    await db.collection('organisations').doc(orgId).update({
        stripe_customer_id: session.customer,
        subscription_status: 'active',
    });
    console.log(`Checkout completed for org ${orgId}`);
}
// Handler: Subscription created
async function handleSubscriptionCreated(event) {
    const subscription = event.data.object;
    await updateSubscriptionStatus(subscription);
    console.log(`Subscription created: ${subscription.id}`);
}
// Handler: Subscription updated
async function handleSubscriptionUpdated(event) {
    const subscription = event.data.object;
    await updateSubscriptionStatus(subscription);
    console.log(`Subscription updated: ${subscription.id}`);
}
// Handler: Subscription deleted/canceled
async function handleSubscriptionDeleted(event) {
    const db = getDb();
    const subscription = event.data.object;
    const orgsQuery = await db.collection('organisations')
        .where('stripe_customer_id', '==', subscription.customer)
        .limit(1)
        .get();
    if (orgsQuery.empty) {
        console.error('Organisation not found for customer:', subscription.customer);
        return;
    }
    const orgDoc = orgsQuery.docs[0];
    const org = orgDoc.data();
    // Get free plan
    const freePlanQuery = await db.collection('subscription_plans')
        .where('slug', '==', 'free')
        .limit(1)
        .get();
    const freePlanId = freePlanQuery.empty ? null : freePlanQuery.docs[0].id;
    // Downgrade to free plan
    await orgDoc.ref.update({
        subscription_status: 'canceled',
        current_plan_id: freePlanId,
        subscription_ends_at: null,
    });
    // Send cancellation email
    if (org.contact_email) {
        // Generate and send email
        const primaryColor = '#0F4C5C';
        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">Subscription Canceled</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-radius: 0 0 12px 12px;">
    <p>Hi ${org.name},</p>
    <p>Your Donedex subscription has been canceled. We're sorry to see you go!</p>
    <p>Your account has been moved to our free tier. All your data is safe and accessible.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://app.donedex.com/settings/billing" style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Resubscribe</a>
    </div>
  </div>
</body>
</html>`;
        await (0, sendEmail_1.sendEmailWithResend)(org.contact_email, 'Your Donedex subscription has been canceled', emailHtml);
    }
    // Deactivate storage add-ons
    const addonsQuery = await db.collection('storage_addons')
        .where('organisation_id', '==', orgDoc.id)
        .where('is_active', '==', true)
        .get();
    for (const addon of addonsQuery.docs) {
        await addon.ref.update({ is_active: false });
    }
    console.log(`Subscription canceled for org ${orgDoc.id}, downgraded to free`);
}
// Handler: Trial ending soon
async function handleTrialEnding(event) {
    const db = getDb();
    const subscription = event.data.object;
    const orgsQuery = await db.collection('organisations')
        .where('stripe_customer_id', '==', subscription.customer)
        .limit(1)
        .get();
    if (orgsQuery.empty)
        return;
    const org = orgsQuery.docs[0].data();
    if (org.contact_email) {
        const trialEndDate = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            })
            : 'soon';
        const primaryColor = '#0F4C5C';
        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">Your Trial is Ending Soon</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-radius: 0 0 12px 12px;">
    <p>Hi ${org.name},</p>
    <p>Your free trial of Donedex ends in <strong>3 days</strong> (${trialEndDate}).</p>
    <p>Add your payment details to continue using all features without interruption.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://app.donedex.com/settings/billing" style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Upgrade Now</a>
    </div>
  </div>
</body>
</html>`;
        await (0, sendEmail_1.sendEmailWithResend)(org.contact_email, `Your Donedex trial ends in 3 days`, emailHtml);
        console.log(`Trial ending notification sent for org ${org.name}`);
    }
}
// Handler: Invoice paid
async function handleInvoicePaid(event) {
    var _a;
    const db = getDb();
    const invoice = event.data.object;
    await syncInvoice(invoice);
    if (invoice.customer && invoice.amount_paid > 0) {
        const orgsQuery = await db.collection('organisations')
            .where('stripe_customer_id', '==', invoice.customer)
            .limit(1)
            .get();
        if (!orgsQuery.empty) {
            const org = orgsQuery.docs[0].data();
            const emailTo = org.billing_email || org.contact_email;
            if (emailTo) {
                const primaryColor = '#0F4C5C';
                const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">Payment Received</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-radius: 0 0 12px 12px;">
    <p>Hi ${org.name},</p>
    <p>Thank you for your payment!</p>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <table style="width: 100%;">
        <tr><td style="color: #6B7280;">Amount Paid</td><td style="text-align: right; font-weight: 600;">${((_a = invoice.currency) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'GBP'} ${(invoice.amount_paid / 100).toFixed(2)}</td></tr>
        <tr><td style="color: #6B7280;">Invoice Number</td><td style="text-align: right;">${invoice.number || invoice.id}</td></tr>
      </table>
    </div>
    ${invoice.invoice_pdf ? `<div style="text-align: center;"><a href="${invoice.invoice_pdf}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Download Invoice PDF</a></div>` : ''}
  </div>
</body>
</html>`;
                await (0, sendEmail_1.sendEmailWithResend)(emailTo, 'Receipt for your Donedex payment', emailHtml);
            }
        }
    }
    console.log(`Invoice paid: ${invoice.id}`);
}
// Handler: Invoice payment failed
async function handlePaymentFailed(event) {
    var _a;
    const db = getDb();
    const invoice = event.data.object;
    await syncInvoice(invoice);
    if (invoice.customer) {
        const orgsQuery = await db.collection('organisations')
            .where('stripe_customer_id', '==', invoice.customer)
            .limit(1)
            .get();
        if (!orgsQuery.empty) {
            const orgDoc = orgsQuery.docs[0];
            const org = orgDoc.data();
            await orgDoc.ref.update({ subscription_status: 'past_due' });
            const emailTo = org.billing_email || org.contact_email;
            if (emailTo) {
                const primaryColor = '#0F4C5C';
                const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">Payment Failed</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-radius: 0 0 12px 12px;">
    <p>Hi ${org.name},</p>
    <p>We weren't able to process your payment of <strong>${((_a = invoice.currency) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'GBP'} ${(invoice.amount_due / 100).toFixed(2)}</strong>.</p>
    <p>Please update your payment method to avoid any interruption to your service.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://app.donedex.com/settings/billing" style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Update Payment Method</a>
    </div>
  </div>
</body>
</html>`;
                await (0, sendEmail_1.sendEmailWithResend)(emailTo, 'Action required: Payment failed', emailHtml);
            }
        }
    }
    console.log(`Payment failed for invoice: ${invoice.id}`);
}
// Handler: Invoice finalized
async function handleInvoiceFinalized(event) {
    const invoice = event.data.object;
    await syncInvoice(invoice);
    console.log(`Invoice finalized: ${invoice.id}`);
}
// Webhook event handlers map
const WEBHOOK_HANDLERS = {
    'checkout.session.completed': handleCheckoutComplete,
    'customer.subscription.created': handleSubscriptionCreated,
    'customer.subscription.updated': handleSubscriptionUpdated,
    'customer.subscription.deleted': handleSubscriptionDeleted,
    'customer.subscription.trial_will_end': handleTrialEnding,
    'invoice.paid': handleInvoicePaid,
    'invoice.payment_failed': handlePaymentFailed,
    'invoice.finalized': handleInvoiceFinalized,
};
// Log webhook event
async function logWebhookEvent(event, error) {
    const db = getDb();
    let orgId = null;
    let customerId = null;
    const data = event.data.object;
    if (data.metadata && typeof data.metadata === 'object') {
        const metadata = data.metadata;
        orgId = metadata.organisation_id;
    }
    if (data.customer) {
        customerId = data.customer;
        if (!orgId) {
            const orgsQuery = await db.collection('organisations')
                .where('stripe_customer_id', '==', customerId)
                .limit(1)
                .get();
            if (!orgsQuery.empty) {
                orgId = orgsQuery.docs[0].id;
            }
        }
    }
    await db.collection('billing_events').add({
        stripe_event_id: event.id,
        event_type: event.type,
        organisation_id: orgId,
        stripe_customer_id: customerId,
        payload: JSON.parse(JSON.stringify(event)),
        processed_at: error ? null : new Date().toISOString(),
        error: error || null,
        created_at: new Date().toISOString(),
    });
}
// Main webhook handler
exports.stripeWebhook = (0, https_1.onRequest)({ region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY'] }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'stripe-signature, content-type');
        res.status(200).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).send('Missing stripe-signature header');
        return;
    }
    let event;
    try {
        event = getStripe().webhooks.constructEvent(req.rawBody, signature, getWebhookSecret());
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    console.log(`Received webhook event: ${event.type}`);
    const handler = WEBHOOK_HANDLERS[event.type];
    if (handler) {
        try {
            await handler(event);
            await logWebhookEvent(event);
            console.log(`Successfully processed ${event.type}`);
        }
        catch (err) {
            console.error(`Error processing ${event.type}:`, err);
            await logWebhookEvent(event, err.message);
        }
    }
    else {
        console.log(`Unhandled event type: ${event.type}`);
        await logWebhookEvent(event);
    }
    res.status(200).json({ received: true });
});
//# sourceMappingURL=webhook.js.map