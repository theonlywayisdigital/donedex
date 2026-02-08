"use strict";
/**
 * Firebase Cloud Functions for Donedex
 * Migrated from Supabase Edge Functions
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateFromDocumentHttp = exports.templateFromDocument = exports.templateBuilderChatHttp = exports.templateBuilderChat = exports.createCustomerPortalHttp = exports.createCustomerPortal = exports.createCheckoutSessionHttp = exports.createCheckoutSession = exports.stripeWebhook = exports.provisionOrgUsersHttp = exports.provisionOrgUsers = exports.sendInviteHttp = exports.sendInvite = exports.sendEmailHttp = exports.sendEmail = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Email functions
var sendEmail_1 = require("./email/sendEmail");
Object.defineProperty(exports, "sendEmail", { enumerable: true, get: function () { return sendEmail_1.sendEmail; } });
Object.defineProperty(exports, "sendEmailHttp", { enumerable: true, get: function () { return sendEmail_1.sendEmailHttp; } });
// Auth functions
var sendInvite_1 = require("./auth/sendInvite");
Object.defineProperty(exports, "sendInvite", { enumerable: true, get: function () { return sendInvite_1.sendInvite; } });
Object.defineProperty(exports, "sendInviteHttp", { enumerable: true, get: function () { return sendInvite_1.sendInviteHttp; } });
var provisionOrgUsers_1 = require("./auth/provisionOrgUsers");
Object.defineProperty(exports, "provisionOrgUsers", { enumerable: true, get: function () { return provisionOrgUsers_1.provisionOrgUsers; } });
Object.defineProperty(exports, "provisionOrgUsersHttp", { enumerable: true, get: function () { return provisionOrgUsers_1.provisionOrgUsersHttp; } });
// Stripe functions
var webhook_1 = require("./stripe/webhook");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return webhook_1.stripeWebhook; } });
var checkoutSession_1 = require("./stripe/checkoutSession");
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return checkoutSession_1.createCheckoutSession; } });
Object.defineProperty(exports, "createCheckoutSessionHttp", { enumerable: true, get: function () { return checkoutSession_1.createCheckoutSessionHttp; } });
var customerPortal_1 = require("./stripe/customerPortal");
Object.defineProperty(exports, "createCustomerPortal", { enumerable: true, get: function () { return customerPortal_1.createCustomerPortal; } });
Object.defineProperty(exports, "createCustomerPortalHttp", { enumerable: true, get: function () { return customerPortal_1.createCustomerPortalHttp; } });
// AI functions
var templateBuilderChat_1 = require("./ai/templateBuilderChat");
Object.defineProperty(exports, "templateBuilderChat", { enumerable: true, get: function () { return templateBuilderChat_1.templateBuilderChat; } });
Object.defineProperty(exports, "templateBuilderChatHttp", { enumerable: true, get: function () { return templateBuilderChat_1.templateBuilderChatHttp; } });
var templateFromDocument_1 = require("./ai/templateFromDocument");
Object.defineProperty(exports, "templateFromDocument", { enumerable: true, get: function () { return templateFromDocument_1.templateFromDocument; } });
Object.defineProperty(exports, "templateFromDocumentHttp", { enumerable: true, get: function () { return templateFromDocument_1.templateFromDocumentHttp; } });
//# sourceMappingURL=index.js.map