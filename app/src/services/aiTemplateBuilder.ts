/**
 * AI Template Builder Service
 * Handles communication with the template-builder-chat Cloud Function
 *
 * Uses Firebase Cloud Functions (HTTP callable)
 */

import { auth } from './firebase';
import type {
  TemplateBuilderChatRequest,
  TemplateBuilderChatResponse,
  TemplateBuilderChatError,
  ConversationStep,
  ChatMessage,
} from '../types/templateBuilder';

/** Result type for service calls */
interface ServiceResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// Cloud Function URL - update this with your deployed function URL
const CLOUD_FUNCTION_BASE_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL ||
  'https://europe-west2-donedex-72116.cloudfunctions.net';

/**
 * Send a chat message to the AI template builder
 */
export async function sendChatMessage(
  messages: { role: 'user' | 'assistant'; content: string }[],
  currentStep: ConversationStep
): Promise<ServiceResult<TemplateBuilderChatResponse>> {
  try {
    // Get current user's ID token for authentication
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/templateBuilderChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        messages,
        currentStep,
      } as TemplateBuilderChatRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloud function error:', errorText);
      return {
        data: null,
        error: { message: `Failed to communicate with AI: ${response.status}` },
      };
    }

    const data = await response.json();

    // Check if response indicates an error
    if (data && 'error' in data) {
      const errorResponse = data as TemplateBuilderChatError;
      return {
        data: null,
        error: { message: errorResponse.error },
      };
    }

    return { data: data as TemplateBuilderChatResponse, error: null };
  } catch (err) {
    console.error('Service error:', err);
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Generate a unique ID for chat messages
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new chat message object
 */
export function createChatMessage(
  role: 'user' | 'assistant',
  content: string
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date(),
  };
}

/**
 * Convert ChatMessage array to the format expected by the Cloud Function
 * Filters out leading assistant messages since Claude API expects user-first
 */
export function formatMessagesForApi(
  messages: ChatMessage[]
): { role: 'user' | 'assistant'; content: string }[] {
  // Find the first user message and start from there
  const firstUserIndex = messages.findIndex((msg) => msg.role === 'user');
  if (firstUserIndex === -1) {
    return [];
  }

  return messages.slice(firstUserIndex).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}
