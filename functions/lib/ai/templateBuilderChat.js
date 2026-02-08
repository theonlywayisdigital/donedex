"use strict";
/**
 * Template Builder Chat Cloud Function
 * AI-powered conversational template builder using Google Gemini API
 * Migrated from Anthropic Claude to Gemini for cost savings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateBuilderChatHttp = exports.templateBuilderChat = void 0;
const https_1 = require("firebase-functions/v2/https");
const generative_ai_1 = require("@google/generative-ai");
// Lazy initialization for Gemini
let geminiClient = null;
function getGemini() {
    if (!geminiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        geminiClient = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
}
// Complete field types reference for Dexter
const FIELD_TYPES_REFERENCE = `
AVAILABLE FIELD TYPES (44 total):

BASIC (9 types):
- pass_fail: Binary pass/fail check with Pass/Fail buttons
- yes_no: Binary yes/no question
- condition: Three-level assessment (Good/Fair/Poor)
- severity: Hazard rating (Low/Medium/High)
- text: Free text input (single line)
- textarea: Multi-line text input (for longer notes)
- number: Numeric input
- select: Single choice dropdown (requires options array)
- multi_select: Multiple choice checkboxes (requires options array)

RATING & SCALES (4 types):
- rating: 1-5 star rating
- rating_numeric: 1-10 numeric scale
- slider: 0-100% drag slider
- traffic_light: Red/Amber/Green buttons

DATE & TIME (4 types):
- date: Date picker
- time: Time picker
- datetime: Combined date and time picker
- expiry_date: Date with overdue warning (for certificates, licenses)

MEASUREMENT & COUNTING (5 types):
- counter: Tap +/- buttons to count items
- measurement: Number + unit selector (m, cm, ft, in)
- temperature: Number with °C/°F toggle
- meter_reading: For utility meters (electric, gas, water, mileage)
- currency: Money amount with currency symbol

EVIDENCE & MEDIA (4 types):
- photo: Photo capture (use photo_rule to control when required)
- photo_before_after: Side-by-side before/after comparison photos
- signature: Draw signature on screen
- annotated_photo: Photo with markup/annotation tools

LOCATION & ASSETS (3 types):
- gps_location: Capture GPS coordinates with map view
- barcode_scan: Scan barcodes/QR codes (for equipment/asset IDs)
- asset_lookup: Search and link to existing assets in system

PEOPLE (3 types):
- person_picker: Select from team members
- contractor: Third-party contractor details (name, company, registration)
- witness: Witness details for incidents/sign-offs

SMART/ADVANCED (8 types):
- instruction: Display-only guidance text (no input, for user guidance)
- declaration: Acknowledgment checkbox with legal text (for sign-offs)
- checklist: Nested sub-items within a single field
- repeater: Add multiple entries (e.g., list of defects)
- auto_timestamp: Automatically captures date/time when section completed
- auto_weather: Automatically captures weather conditions
- conditional: Shows/hides based on other field values
- title: Section heading text (display only)

COMPOSITE FIELD GROUPS (6 types):
- composite_person_name: First name + Last name fields
- composite_contact: Name + Phone + Email grouped
- composite_address_uk: UK address format (street, city, county, postcode)
- composite_address_us: US address format (street, city, state, zip)
- composite_address_intl: International address format
- composite_vehicle: Vehicle details (reg, make, model, mileage)

PHOTO RULES (for any field):
- "never": No photo option
- "on_fail": Photo required if answer indicates issue (fail, no, poor, high, medium, red, amber)
- "on_pass": Photo required if answer indicates good condition
- "always": Photo always required
`;
const SYSTEM_PROMPT = `You are Dexter, the AI template building assistant for Donedex.

You're a friendly guide who helps anyone create inspection templates through simple conversation - warm, patient, and making it easy for users who might not be tech-savvy.

${FIELD_TYPES_REFERENCE}

=== IMPORTANT DISCLAIMER ===

WHENEVER the user mentions regulations, compliance, legal requirements, or industry standards:

You MUST include this disclaimer (naturally worded, not copy-pasted):
"Just a heads up - while I can help structure your template, Dexter and Donedex aren't experts in your specific field or local regulations. Please always verify compliance requirements with the relevant authorities in your area. We can't be held responsible for regulatory compliance."

=== CRITICAL CONVERSATION RULE ===

ASK ONLY ONE QUESTION AT A TIME. Never ask multiple questions in a single response.

=== CONVERSATION FLOW ===

Keep responses SHORT (2-3 sentences max). Ask ONE question, wait for the answer, then ask the next.

PHASE 1 - UNDERSTAND (2-4 questions):
Ask about: Industry → What they're inspecting → Context/frequency

PHASE 2 - DETAILS (2-4 questions based on their answers):
Ask about: Specific areas/sections → Evidence needs → Compliance requirements → Sign-off needs

PHASE 3 - CONFIRM & GENERATE:
Briefly summarise what you'll create, then generate the template.

=== GENERATING THE TEMPLATE ===

When ready, say something like "I've got everything I need! Here's your template:" then output:

\`\`\`template_json
{
  "name": "Template Name",
  "description": "Brief description",
  "sections": [
    {
      "name": "Section Name",
      "sort_order": 1,
      "items": [
        {
          "label": "Item label",
          "item_type": "pass_fail",
          "is_required": true,
          "photo_rule": "on_fail",
          "options": null
        }
      ]
    }
  ]
}
\`\`\`

Remember: ONE question at a time. Keep it simple and conversational. Anyone should be able to use this.`;
function extractTemplateJson(content) {
    const templateMatch = content.match(/```template_json\s*([\s\S]*?)```/);
    if (templateMatch) {
        try {
            return JSON.parse(templateMatch[1].trim());
        }
        catch (e) {
            console.error('Failed to parse template JSON:', e);
            return null;
        }
    }
    return null;
}
function extractQuickReplies(content) {
    const quickRepliesFormatMatch = content.match(/QUICK_REPLIES:\s*\[([\s\S]*?)\]/i);
    if (quickRepliesFormatMatch) {
        try {
            return JSON.parse(`[${quickRepliesFormatMatch[1]}]`);
        }
        catch (_a) {
            const items = quickRepliesFormatMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            if (items.length > 0 && items[0]) {
                return items;
            }
        }
    }
    return ['Yes', 'No', 'Tell me more'];
}
function cleanMessageContent(content) {
    let cleaned = content.replace(/```json[\s\S]*?```/g, '').trim();
    cleaned = cleaned.replace(/```template_json[\s\S]*?```/g, '').trim();
    cleaned = cleaned.replace(/QUICK_REPLIES:\s*\[[\s\S]*?\]/gi, '').trim();
    return cleaned;
}
function determineSuggestedStep(currentStep, hasTemplate, messageContent) {
    if (hasTemplate)
        return 'generation';
    const lowerContent = messageContent.toLowerCase();
    if (currentStep === 'intent') {
        if (lowerContent.includes('what kind of inspection') || lowerContent.includes('what type of inspection')) {
            return 'context';
        }
        return 'intent';
    }
    if (currentStep === 'context') {
        if (lowerContent.includes('should cover') || lowerContent.includes('sections') || lowerContent.includes('look right')) {
            return 'refinement';
        }
        return 'context';
    }
    return currentStep;
}
// Convert chat messages to Gemini format
function convertToGeminiMessages(messages) {
    return messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
    }));
}
async function generateChatResponse(messages) {
    const gemini = getGemini();
    const model = gemini.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
            maxOutputTokens: 2048,
        },
    });
    const geminiMessages = convertToGeminiMessages(messages);
    const result = await model.generateContent({ contents: geminiMessages });
    const response = result.response;
    return response.text() || '';
}
exports.templateBuilderChat = (0, https_1.onCall)({ region: 'europe-west2', secrets: ['GEMINI_API_KEY'] }, async (request) => {
    const { messages, currentStep } = request.data;
    if (!messages || messages.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Messages array is required');
    }
    const assistantContent = await generateChatResponse(messages);
    // Parse the response
    const generatedTemplate = extractTemplateJson(assistantContent);
    const quickReplies = extractQuickReplies(assistantContent);
    const cleanedMessage = cleanMessageContent(assistantContent);
    const suggestedStep = determineSuggestedStep(currentStep, generatedTemplate !== null, assistantContent);
    const chatResponse = {
        message: cleanedMessage,
        quickReplies,
        suggestedStep,
        generatedTemplate,
    };
    return chatResponse;
});
// HTTP version
exports.templateBuilderChatHttp = (0, https_1.onRequest)({ cors: true, region: 'europe-west2', secrets: ['GEMINI_API_KEY'] }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { messages, currentStep } = req.body;
        if (!messages || messages.length === 0) {
            res.status(400).json({ error: 'Messages array is required' });
            return;
        }
        const assistantContent = await generateChatResponse(messages);
        const generatedTemplate = extractTemplateJson(assistantContent);
        const quickReplies = extractQuickReplies(assistantContent);
        const cleanedMessage = cleanMessageContent(assistantContent);
        const suggestedStep = determineSuggestedStep(currentStep, generatedTemplate !== null, assistantContent);
        res.status(200).json({
            message: cleanedMessage,
            quickReplies,
            suggestedStep,
            generatedTemplate,
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=templateBuilderChat.js.map