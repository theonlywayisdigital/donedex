// Supabase Edge Function: template-from-document
// Analyzes uploaded documents (images/PDFs) to create inspection templates using Claude Vision API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// CORS headers for Expo/React Native
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

You're analyzing an existing inspection form, checklist, or report to convert it into a digital template. Your job is to:
1. Read and understand the document structure
2. Extract all sections and items
3. Choose the most appropriate field types for each item
4. Create a well-structured template

${FIELD_TYPES_REFERENCE}

=== DOCUMENT ANALYSIS GUIDELINES ===

WHEN ANALYZING A DOCUMENT:

1. IDENTIFY THE DOCUMENT TYPE:
   - Checklist (items to tick off)
   - Inspection form (structured questions)
   - Report template (sections with fields)
   - Audit sheet (compliance items)
   - Survey form (questions with responses)

2. EXTRACT SECTIONS:
   - Look for headers, dividers, or groupings
   - Preserve the original section names where possible
   - If no clear sections, create logical groupings

3. FOR EACH ITEM, DETERMINE:
   - The label/question text (clean it up if needed)
   - The best field type from the 44 available
   - Whether it appears to be required
   - What photo_rule makes sense (usually "on_fail" for inspections)

4. FIELD TYPE SELECTION RULES:
   - Checkboxes/tick boxes → pass_fail or yes_no
   - Good/Fair/Poor ratings → condition
   - Temperature fields → temperature (not number)
   - Date fields → date or expiry_date (if it's a certificate/expiry)
   - Address fields → composite_address_uk/us/intl
   - Signature boxes → signature
   - Notes/comments → textarea
   - Multiple choice → select with options array
   - Numeric measurements → measurement or number

5. PRESERVE ORIGINAL STRUCTURE:
   - Keep items in the same order as the document
   - Maintain section groupings
   - Don't add items that aren't in the document

=== OUTPUT FORMAT ===

First, give a brief summary (2-3 sentences) of what you found in the document.

Then output the template in this exact format:

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

After the template, ALWAYS include this note:

"**Review your field types:** I've made my best guess at field types, but you should review them in the editor. Click 'Review & Edit' to check each field has the right type - you can change text fields to dropdowns, add pass/fail options, and more."

Then ask if they want to make any changes before reviewing. Keep it brief and friendly.

=== IMPORTANT DISCLAIMER ===

If the document appears to be related to regulations, compliance, safety, or legal requirements, include this disclaimer (naturally worded):

"Just a heads up - while I've converted your form into a digital template, Dexter and Donedex aren't experts in your specific field or local regulations. Please verify that this template meets all your compliance requirements."

=== HANDLING POOR QUALITY DOCUMENTS ===

If the image is:
- Too blurry to read: Ask them to retake with better focus
- Partially visible: Note what you could read and ask if there's more
- Handwritten and unclear: Make your best interpretation and note any uncertainties
- Multiple pages: Analyze all visible pages and combine into one template

=== FOLLOW-UP CONVERSATIONS ===

After generating the initial template, users may ask to:
- Add more sections or items
- Remove items
- Change field types
- Rename sections or items
- Reorder sections

Handle these requests conversationally, and output an updated template_json block with the changes.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ImageData {
  base64: string;
  mimeType: string;
}

interface DocumentAnalysisRequest {
  images: ImageData[];           // Array of images (for multi-page PDFs)
  messages?: ChatMessage[];      // Optional follow-up conversation
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
  // If we have a template, suggest refinement options
  if (hasTemplate) {
    return [
      'Looks good, use this template',
      'Add more sections',
      'Change some field types',
      'Remove some items',
    ];
  }

  // Default suggestions
  return ['Try again with a clearer image', 'Describe what I should look for'];
}

function cleanMessageContent(content: string): string {
  // Remove template_json blocks from the display message
  let cleaned = content.replace(/```template_json[\s\S]*?```/g, '').trim();
  // Remove any trailing whitespace
  return cleaned.trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const { images, messages }: DocumentAnalysisRequest = await req.json();

    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    // Build the Claude message with images
    const imageContent = images.map((img) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mimeType,
        data: img.base64,
      },
    }));

    // Determine the text prompt
    let textPrompt = 'Please analyze this document and create an inspection template from it.';

    if (images.length > 1) {
      textPrompt = `Please analyze these ${images.length} pages of the document and create a single comprehensive inspection template from them.`;
    }

    // If there are follow-up messages, use the last user message as the prompt
    if (messages && messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        textPrompt = lastUserMessage.content;
      }
    }

    // Build the initial message with images and text
    const initialUserContent = [
      ...imageContent,
      {
        type: 'text' as const,
        text: textPrompt,
      },
    ];

    // Build the full conversation
    const claudeMessages: { role: string; content: any }[] = [
      {
        role: 'user',
        content: initialUserContent,
      },
    ];

    // Add follow-up messages if this is a refinement conversation
    if (messages && messages.length > 1) {
      // Find where the assistant responses are in the conversation
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (i === 0) continue; // Skip the first user message (it's part of the image content)

        if (msg.role === 'assistant') {
          claudeMessages.push({
            role: 'assistant',
            content: msg.content,
          });
        } else if (msg.role === 'user' && i > 0) {
          claudeMessages.push({
            role: 'user',
            content: msg.content,
          });
        }
      }
    }

    // Call Claude API with vision
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Claude API error:', response.status, errorBody);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResponse = await response.json();
    const assistantContent = claudeResponse.content[0]?.text || '';

    // Parse the response
    const generatedTemplate = extractTemplateJson(assistantContent);
    const quickReplies = extractQuickReplies(assistantContent, generatedTemplate !== null);
    const cleanedMessage = cleanMessageContent(assistantContent);

    const analysisResponse: DocumentAnalysisResponse = {
      message: cleanedMessage,
      quickReplies,
      generatedTemplate,
    };

    return new Response(JSON.stringify(analysisResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
