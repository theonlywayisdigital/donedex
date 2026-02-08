/**
 * Template From Document Cloud Function
 * Analyzes uploaded documents (images/PDFs) to create inspection templates using Google Gemini Vision API
 * Migrated from Anthropic Claude to Gemini for cost savings
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization for Gemini
let geminiClient: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// Field types reference (abbreviated version)
const FIELD_TYPES_REFERENCE = `
AVAILABLE FIELD TYPES (44 total):

BASIC: pass_fail, yes_no, condition, severity, text, textarea, number, select, multi_select
RATING & SCALES: rating, rating_numeric, slider, traffic_light
DATE & TIME: date, time, datetime, expiry_date
MEASUREMENT: counter, measurement, temperature, meter_reading, currency
EVIDENCE: photo, photo_before_after, signature, annotated_photo
LOCATION: gps_location, barcode_scan, asset_lookup
PEOPLE: person_picker, contractor, witness
SMART: instruction, declaration, checklist, repeater, auto_timestamp, auto_weather, conditional, title
COMPOSITE: composite_person_name, composite_contact, composite_address_uk, composite_address_us, composite_address_intl, composite_vehicle

PHOTO RULES: "never", "on_fail", "on_pass", "always"
`;

const SYSTEM_PROMPT = `You are Dexter, the AI template building assistant for Donedex.

You're analyzing an existing inspection form, checklist, or report to convert it into a digital template. Your job is to:
1. Read and understand the document structure
2. Extract all sections and items
3. Choose the most appropriate field types for each item
4. Create a well-structured template

${FIELD_TYPES_REFERENCE}

=== DOCUMENT ANALYSIS GUIDELINES ===

1. IDENTIFY THE DOCUMENT TYPE:
   - Checklist (items to tick off)
   - Inspection form (structured questions)
   - Report template (sections with fields)
   - Audit sheet (compliance items)

2. EXTRACT SECTIONS:
   - Look for headers, dividers, or groupings
   - Preserve the original section names where possible

3. FOR EACH ITEM, DETERMINE:
   - The label/question text
   - The best field type from the 44 available
   - Whether it appears to be required
   - What photo_rule makes sense

4. FIELD TYPE SELECTION RULES:
   - Checkboxes/tick boxes → pass_fail or yes_no
   - Good/Fair/Poor ratings → condition
   - Temperature fields → temperature
   - Date fields → date or expiry_date
   - Address fields → composite_address_uk/us/intl
   - Signature boxes → signature
   - Notes/comments → textarea

=== OUTPUT FORMAT ===

First, give a brief summary (2-3 sentences) of what you found in the document.

Then output the template:

\`\`\`template_json
{
  "name": "Template Name",
  "description": "Brief description based on the document",
  "sections": [
    {
      "name": "Section Name",
      "sort_order": 1,
      "items": [
        {
          "label": "Item label from document",
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

After the template, include:
"**Review your field types:** I've made my best guess at field types, but you should review them in the editor."`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ImageData {
  base64: string;
  mimeType: string;
}

interface DocumentAnalysisRequest {
  images: ImageData[];
  messages?: ChatMessage[];
}

interface GeneratedTemplate {
  name: string;
  description: string;
  sections: {
    name: string;
    sort_order: number;
    items: {
      label: string;
      item_type: string;
      is_required: boolean;
      photo_rule: 'never' | 'on_fail' | 'on_pass' | 'always';
      options?: string[] | null;
    }[];
  }[];
}

interface DocumentAnalysisResponse {
  message: string;
  quickReplies: string[];
  generatedTemplate: GeneratedTemplate | null;
}

function extractTemplateJson(content: string): GeneratedTemplate | null {
  const templateMatch = content.match(/```template_json\s*([\s\S]*?)```/);
  if (templateMatch) {
    try {
      return JSON.parse(templateMatch[1].trim());
    } catch (e) {
      console.error('Failed to parse template JSON:', e);
      return null;
    }
  }
  return null;
}

function extractQuickReplies(content: string, hasTemplate: boolean): string[] {
  if (hasTemplate) {
    return [
      'Looks good, use this template',
      'Add more sections',
      'Change some field types',
      'Remove some items',
    ];
  }
  return ['Try again with a clearer image', 'Describe what I should look for'];
}

function cleanMessageContent(content: string): string {
  return content.replace(/```template_json[\s\S]*?```/g, '').trim();
}

// Build Gemini content parts with images
function buildGeminiParts(images: ImageData[], textPrompt: string): Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> {
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Add images first
  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  // Add text prompt last
  parts.push({ text: textPrompt });

  return parts;
}

async function analyzeDocument(images: ImageData[], messages?: ChatMessage[]): Promise<string> {
  const gemini = getGemini();
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 4096,
    },
  });

  // Determine the text prompt
  let textPrompt = images.length > 1
    ? `Please analyze these ${images.length} pages of the document and create a single comprehensive inspection template from them.`
    : 'Please analyze this document and create an inspection template from it.';

  if (messages && messages.length > 0) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      textPrompt = lastUserMessage.content;
    }
  }

  // Build content with images
  const parts = buildGeminiParts(images, textPrompt);

  // Build conversation history
  const contents: Array<{ role: 'user' | 'model'; parts: typeof parts }> = [
    { role: 'user', parts },
  ];

  // Add follow-up messages if this is a refinement conversation
  if (messages && messages.length > 1) {
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (i === 0) continue; // Skip the first user message (already included with images)

      if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      } else if (msg.role === 'user' && i > 0) {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      }
    }
  }

  const result = await model.generateContent({ contents });
  const response = result.response;

  return response.text() || '';
}

export const templateFromDocument = onCall<DocumentAnalysisRequest>({ region: 'europe-west2', secrets: ['GEMINI_API_KEY'] }, async (request) => {
  const { images, messages } = request.data;

  if (!images || images.length === 0) {
    throw new HttpsError('invalid-argument', 'No images provided');
  }

  const assistantContent = await analyzeDocument(images, messages);

  // Parse the response
  const generatedTemplate = extractTemplateJson(assistantContent);
  const quickReplies = extractQuickReplies(assistantContent, generatedTemplate !== null);
  const cleanedMessage = cleanMessageContent(assistantContent);

  const analysisResponse: DocumentAnalysisResponse = {
    message: cleanedMessage,
    quickReplies,
    generatedTemplate,
  };

  return analysisResponse;
});

// HTTP version
export const templateFromDocumentHttp = onRequest({ cors: true, region: 'europe-west2', secrets: ['GEMINI_API_KEY'] }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { images, messages } = req.body as DocumentAnalysisRequest;

    if (!images || images.length === 0) {
      res.status(400).json({ error: 'No images provided' });
      return;
    }

    const assistantContent = await analyzeDocument(images, messages);

    const generatedTemplate = extractTemplateJson(assistantContent);
    const quickReplies = extractQuickReplies(assistantContent, generatedTemplate !== null);
    const cleanedMessage = cleanMessageContent(assistantContent);

    res.status(200).json({
      message: cleanedMessage,
      quickReplies,
      generatedTemplate,
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
