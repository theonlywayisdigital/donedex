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

// Field types reference for Claude's system prompt
const FIELD_TYPES_REFERENCE = `
AVAILABLE FIELD TYPES:

BASIC (most common):
- pass_fail: Binary pass/fail check with Pass/Fail buttons
- yes_no: Binary yes/no question
- condition: Three-level assessment (Good/Fair/Poor)
- severity: Hazard rating (Low/Medium/High)
- text: Free text input
- number: Numeric input
- select: Single choice dropdown (requires custom options)
- multi_select: Multiple choice checkboxes (requires custom options)

RATING & SCALES:
- rating_stars: 1-5 star rating
- slider: 0-100% drag slider
- traffic_light: Red/Amber/Green buttons

DATE & TIME:
- date: Date picker
- time: Time picker
- datetime: Combined date and time
- expiry_date: Date with overdue warning

MEASUREMENT & COUNTING:
- counter: Tap +/- buttons to count items
- measurement: Number + unit (m, cm, ft)
- temperature: Number with °C/°F

EVIDENCE & MEDIA:
- photo: Optional photo capture
- photo_required: Mandatory photo capture
- signature: Draw signature on screen

ADVANCED:
- declaration: Text acknowledgment with checkbox (for sign-offs)
- checklist: Nested checkboxes within an item
- instruction: Display-only text (no input, for guidance)

PHOTO RULES (for any field):
- "never": No photo option
- "on_fail": Photo required if answer indicates issue (fail, no, poor, high, medium, red, amber)
- "always": Photo always required
`;

const SYSTEM_PROMPT = `You are an AI assistant helping users create inspection templates for Donedex - a commercial property/asset inspection app.

You have a natural conversation with the user to understand what they need to inspect. Be friendly, helpful, and use your knowledge to make smart suggestions.

${FIELD_TYPES_REFERENCE}

HOW TO HAVE THE CONVERSATION:

1. Listen to what the user says and understand their context
2. Ask clarifying questions naturally - don't follow a rigid script
3. Use your knowledge about inspections, safety requirements, compliance, and best practices
4. Suggest things they might not have thought of based on their industry/context
5. When you have enough information, generate the template

EXAMPLES OF GOOD CONVERSATIONS:

User: "I need to check my restaurant kitchen each morning"
You: "Great! For a restaurant kitchen morning check, you'll want to cover food safety, equipment, and cleanliness. A few questions - do you need to check fridge/freezer temperatures? And do you have gas appliances that need safety checks?"

User: "We do vehicle inspections for our delivery fleet"
You: "Makes sense. For fleet vehicle inspections, the key areas are usually: exterior condition, tyres, lights, fluids, and safety equipment. How many vehicles do you have, and is this a pre-trip check or a weekly/monthly inspection? That'll help me know how detailed to make it."

User: "Shopping centre daily opening"
You: "For a shopping centre opening check, I'd typically include: access points and security, car parks, common areas, fire safety equipment, escalators/lifts, and general cleanliness. Does your centre have any specific areas like a food court, cinema, or outdoor spaces that need checking?"

KEY PRINCIPLES:

- Be conversational, not robotic
- Make intelligent suggestions based on industry knowledge
- Ask about specifics that matter (compliance requirements, team size, specific hazards)
- Don't ask too many questions - 2-4 exchanges is usually enough
- When ready, generate a comprehensive template

GENERATING THE TEMPLATE:

When you have enough context, output the template in this format:

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

FIELD TYPE SELECTION GUIDE:

- Safety checks → pass_fail with photo_rule: "on_fail"
- Condition assessments → condition (good/fair/poor)
- Hazard severity → severity (low/medium/high)
- Counts/quantities → counter
- Temperatures → temperature
- Meter readings → meter_reading
- Yes/no questions → yes_no
- Free text notes → text
- Sign-off → signature
- Mandatory evidence → photo_required

Generate practical, industry-appropriate templates. Include 3-8 items per section. Most items should be quick-tap fields for efficiency.`;

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
