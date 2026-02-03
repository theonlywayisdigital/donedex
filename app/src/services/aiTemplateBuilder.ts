/**
 * AI Template Builder Service
 * Handles communication with the template-builder-chat Edge Function
 */

import { supabase } from './supabase';
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

/**
 * Send a chat message to the AI template builder
 */
export async function sendChatMessage(
  messages: { role: 'user' | 'assistant'; content: string }[],
  currentStep: ConversationStep
): Promise<ServiceResult<TemplateBuilderChatResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke<TemplateBuilderChatResponse>(
      'template-builder-chat',
      {
        body: {
          messages,
          currentStep,
        } as TemplateBuilderChatRequest,
      }
    );

    if (error) {
      console.error('Edge function error:', error);
      // Try to get more details from the error
      const errorDetails = error.context?.body ? await error.context.body.text?.() : null;
      console.error('Error details:', errorDetails);
      return {
        data: null,
        error: { message: error.message || 'Failed to communicate with AI' },
      };
    }

    // Check if response indicates an error
    if (data && 'error' in data) {
      const errorResponse = data as unknown as TemplateBuilderChatError;
      return {
        data: null,
        error: { message: errorResponse.error },
      };
    }

    return { data, error: null };
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
 * Convert ChatMessage array to the format expected by the Edge Function
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
