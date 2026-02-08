"use strict";
/**
 * Create Customer Portal Cloud Function
 * Creates a Stripe Customer Portal session for billing management
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
exports.createCustomerPortalHttp = exports.createCustomerPortal = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
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
exports.createCustomerPortal = (0, https_1.onCall)({ region: 'europe-west2' }, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { organisationId, returnUrl = 'https://app.donedex.com/settings/billing', } = request.data;
    if (!organisationId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing organisationId');
    }
    const db = admin.firestore();
    // Verify user has access to this organisation
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('permission-denied', 'User not found');
    }
    const userData = userDoc.data();
    // Check if user is in this organisation with proper role
    if (userData.organisation_id !== organisationId) {
        throw new https_1.HttpsError('permission-denied', 'Access denied to this organisation');
    }
    // Only owners and admins can access billing portal
    if (!['owner', 'admin'].includes(userData.role)) {
        throw new https_1.HttpsError('permission-denied', 'Only organisation owners and admins can access billing');
    }
    // Get organisation's Stripe customer ID
    const orgDoc = await db.collection('organisations').doc(organisationId).get();
    if (!orgDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Organisation not found');
    }
    const org = orgDoc.data();
    if (!org.stripe_customer_id) {
        throw new https_1.HttpsError('failed-precondition', 'No billing account. Please upgrade to a paid plan first.');
    }
    // Create Stripe Customer Portal session
    const session = await getStripe().billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: returnUrl,
    });
    return {
        url: session.url,
    };
});
// HTTP version
exports.createCustomerPortalHttp = (0, https_1.onRequest)({ cors: true, region: 'europe-west2' }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { organisationId, returnUrl = 'https://app.donedex.com/settings/billing', } = req.body;
        if (!organisationId) {
            res.status(400).json({ error: 'Missing organisationId' });
            return;
        }
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            res.status(403).json({ error: 'User not found' });
            return;
        }
        const userData = userDoc.data();
        if (userData.organisation_id !== organisationId) {
            res.status(403).json({ error: 'Access denied to this organisation' });
            return;
        }
        if (!['owner', 'admin'].includes(userData.role)) {
            res.status(403).json({ error: 'Only organisation owners and admins can access billing' });
            return;
        }
        const orgDoc = await db.collection('organisations').doc(organisationId).get();
        if (!orgDoc.exists) {
            res.status(404).json({ error: 'Organisation not found' });
            return;
        }
        const org = orgDoc.data();
        if (!org.stripe_customer_id) {
            res.status(400).json({ error: 'No billing account. Please upgrade to a paid plan first.' });
            return;
        }
        const session = await getStripe().billingPortal.sessions.create({
            customer: org.stripe_customer_id,
            return_url: returnUrl,
        });
        res.status(200).json({ url: session.url });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=customerPortal.js.map