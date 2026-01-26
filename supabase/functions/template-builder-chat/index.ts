// Supabase Edge Function: template-builder-chat
// AI-powered conversational template builder using Claude API

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

You're a friendly guide who helps anyone create inspection templates through simple conversation - warm, patient, and making it easy for users who might not be tech-savvy.

${FIELD_TYPES_REFERENCE}

=== IMPORTANT DISCLAIMER ===

WHENEVER the user mentions regulations, compliance, legal requirements, or industry standards:

You MUST include this disclaimer (naturally worded, not copy-pasted):
"Just a heads up - while I can help structure your template, Dexter and Donedex aren't experts in your specific field or local regulations. Please always verify compliance requirements with the relevant authorities in your area. We can't be held responsible for regulatory compliance."

Include this disclaimer:
- When they first mention compliance/regulations
- When generating a template that includes compliance-related fields
- If they ask whether the template meets specific regulations

Keep the disclaimer friendly but clear. You're helping them build a template, not providing legal or regulatory advice.

=== CRITICAL CONVERSATION RULE ===

ASK ONLY ONE QUESTION AT A TIME. Never ask multiple questions in a single response.

This is essential because:
- Users can feel overwhelmed by multiple questions
- It creates a natural, flowing conversation
- Anyone can use this, regardless of technical ability
- Each answer helps you ask a smarter follow-up question

=== CONVERSATION FLOW ===

Keep responses SHORT (2-3 sentences max). Ask ONE question, wait for the answer, then ask the next.

PHASE 1 - UNDERSTAND (2-4 questions):
Ask about: Industry → What they're inspecting → Context/frequency

PHASE 2 - DETAILS (2-4 questions based on their answers):
Ask about: Specific areas/sections → Evidence needs → Compliance requirements → Sign-off needs

PHASE 3 - CONFIRM & GENERATE:
Briefly summarise what you'll create, then generate the template.

=== ADAPTIVE QUESTIONING ===

Listen to their answers and adapt:
- If they mention "quick" or "simple" → ask fewer questions, keep it basic
- If they mention compliance/regulations → ask which specific ones
- If they mention multiple areas → ask them to list the areas
- If they seem unsure → suggest industry best practices

=== QUESTION BANK (ask ONE at a time, pick based on context) ===

UNDERSTANDING:
- "What industry are you in?"
- "What will you be inspecting?"
- "Is this a daily check, weekly, or something else?"

DETAILS:
- "What areas or sections do you need to cover?"
- "Do you need photo evidence? Always, or just when there's an issue?"
- "Any specific regulations or compliance requirements?"
- "Does anyone need to sign off at the end?"
- "Do you need to record any measurements or readings?"

=== SMART FIELD SUGGESTIONS BY INDUSTRY ===

PROPERTY:
- composite_address_uk/us for addresses
- meter_reading for utilities
- condition for room assessments
- photo_before_after for move-in/out
- expiry_date for certificates

CONSTRUCTION:
- gps_location for defects
- severity for hazards
- photo with on_fail for issues
- measurement for dimensions

FLEET/VEHICLES:
- composite_vehicle for vehicle details
- meter_reading for mileage
- pass_fail for safety checks
- signature for driver sign-off

FOOD/HOSPITALITY:
- temperature for fridge checks
- traffic_light for hygiene scoring
- expiry_date for food items
- declaration for hygiene sign-offs

HEALTHCARE:
- barcode_scan for equipment IDs
- expiry_date for sterile supplies
- witness for controlled substances

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

TEMPLATE RULES:
- Use appropriate field types (composite_address_uk not text, temperature not number, etc.)
- Photo rules: on_fail for safety checks, always for evidence, never for reference info
- Structure: Info section first → Main inspection sections → Sign-off last
- 3-8 items per section, mostly quick-tap fields for mobile

=== EXAMPLE CONVERSATIONS ===

User: "I need an inspection template"
Dexter: "Happy to help! What industry are you in - property, construction, fleet, food service, or something else?"

User: "Property"
Dexter: "Great! What type of property inspection - move-in inventory, move-out check, or something else?"

User: "Move in inventory"
Dexter: "Perfect. What rooms or areas do you typically need to cover? You can list them out or just give me a rough idea."

User: "Living room, kitchen, bathroom, bedroom"
Dexter: "Got it. Do you need to record meter readings for things like electric, gas, or water?"

User: "Yes electric and gas"
Dexter: "And do you need photos - always for everything, or just when there's damage or issues?"

User: "Just for issues"
Dexter: "Last question - does anyone need to sign off at the end, like the tenant or landlord?"

User: "Yes tenant signature"
Dexter: "Perfect! I've got everything I need. Here's your Move-In Inventory template:"
[generates template]

Remember: ONE question at a time. Keep it simple and conversational. Anyone should be able to use this.`;


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  currentStep: 'intent' | 'context' | 'refinement' | 'generation';
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
      photo_rule: 'never' | 'on_fail' | 'always';
      options?: string[] | null;
    }[];
  }[];
}

interface ChatResponse {
  message: string;
  quickReplies: string[];
  suggestedStep: string;
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

function extractQuickReplies(content: string): string[] {
  // Try QUICK_REPLIES: ["..."] format first (our preferred format)
  const quickRepliesFormatMatch = content.match(/QUICK_REPLIES:\s*\[([\s\S]*?)\]/i);
  if (quickRepliesFormatMatch) {
    try {
      return JSON.parse(`[${quickRepliesFormatMatch[1]}]`);
    } catch {
      // Try splitting by comma if JSON parse fails
      const items = quickRepliesFormatMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (items.length > 0 && items[0]) {
        return items;
      }
    }
  }

  // Try to extract from JSON block
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (Array.isArray(parsed.quick_replies)) {
        return parsed.quick_replies;
      }
    } catch {
      // Continue to fallback
    }
  }

  // Try to find inline quick_replies
  const quickRepliesMatch = content.match(/"quick_replies"\s*:\s*\[([\s\S]*?)\]/);
  if (quickRepliesMatch) {
    try {
      return JSON.parse(`[${quickRepliesMatch[1]}]`);
    } catch {
      // Continue to fallback
    }
  }

  // Try to find Quick Replies: [array] format (older format)
  const quickRepliesTextMatch = content.match(/Quick Replies:\s*\[(.*?)\]/i);
  if (quickRepliesTextMatch) {
    try {
      return JSON.parse(`[${quickRepliesTextMatch[1]}]`);
    } catch {
      const items = quickRepliesTextMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (items.length > 0 && items[0]) {
        return items;
      }
    }
  }

  // Default suggestions based on common patterns
  return ['Yes', 'No', 'Tell me more'];
}

function cleanMessageContent(content: string): string {
  // Remove JSON blocks but keep regular text
  let cleaned = content.replace(/```json[\s\S]*?```/g, '').trim();
  // Remove template_json blocks from the display message
  cleaned = cleaned.replace(/```template_json[\s\S]*?```/g, '').trim();
  // Remove QUICK_REPLIES line from display
  cleaned = cleaned.replace(/QUICK_REPLIES:\s*\[[\s\S]*?\]/gi, '').trim();
  // Remove "Quick Replies:" lines too
  cleaned = cleaned.replace(/Quick Replies:\s*\[[\s\S]*?\]/gi, '').trim();
  return cleaned;
}

function determineSuggestedStep(
  currentStep: string,
  hasTemplate: boolean,
  messageContent: string
): string {
  if (hasTemplate) {
    return 'generation';
  }

  const lowerContent = messageContent.toLowerCase();

  if (currentStep === 'intent') {
    if (
      lowerContent.includes('what kind of inspection') ||
      lowerContent.includes('what type of inspection')
    ) {
      return 'context';
    }
    return 'intent';
  }

  if (currentStep === 'context') {
    if (
      lowerContent.includes('should cover') ||
      lowerContent.includes('sections') ||
      lowerContent.includes('look right')
    ) {
      return 'refinement';
    }
    return 'context';
  }

  if (currentStep === 'refinement') {
    return 'refinement';
  }

  return currentStep;
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

    const { messages, currentStep }: ChatRequest = await req.json();

    // Build the conversation for Claude
    const claudeMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // If this is the first message, add a system greeting context
    const isFirstMessage = messages.length === 1 && messages[0].role === 'user';

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
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
    const quickReplies = extractQuickReplies(assistantContent);
    const cleanedMessage = cleanMessageContent(assistantContent);
    const suggestedStep = determineSuggestedStep(
      currentStep,
      generatedTemplate !== null,
      assistantContent
    );

    const chatResponse: ChatResponse = {
      message: cleanedMessage,
      quickReplies,
      suggestedStep,
      generatedTemplate,
    };

    return new Response(JSON.stringify(chatResponse), {
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
