/**
 * Document Template Builder Service
 * Handles document upload and analysis for template creation using Claude Vision API
 */

import { supabase } from './supabase';
import type { ChatMessage, GeneratedTemplate } from '../types/templateBuilder';

/** Image data for the API */
interface ImageData {
  base64: string;
  mimeType: string;
}

/** Response from the document analysis Edge Function */
interface DocumentAnalysisResponse {
  message: string;
  quickReplies: string[];
  generatedTemplate: GeneratedTemplate | null;
}

/** Error response from the Edge Function */
interface DocumentAnalysisError {
  error: string;
}

/** Result type for service calls */
interface ServiceResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * Analyze a document (image or PDF pages) and generate a template
 * @param images Array of image data (base64 + mimeType) - supports multi-page documents
 * @param messages Optional follow-up conversation messages for refinement
 */
export async function analyzeDocument(
  images: ImageData[],
  messages?: ChatMessage[]
): Promise<ServiceResult<DocumentAnalysisResponse>> {
  try {
    console.log('Analyzing document with', images.length, 'image(s)');

    const { data, error } = await supabase.functions.invoke<DocumentAnalysisResponse>(
      'template-from-document',
      {
        body: {
          images,
          messages: messages ? formatMessagesForApi(messages) : undefined,
        },
      }
    );

    if (error) {
      console.error('Edge function error:', error);
      return {
        data: null,
        error: { message: error.message || 'Failed to analyze document' },
      };
    }

    // Check if response indicates an error
    if (data && 'error' in data) {
      const errorResponse = data as unknown as DocumentAnalysisError;
      return {
        data: null,
        error: { message: errorResponse.error },
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Document analysis error:', err);
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Refine an existing template through conversation
 * @param images Original document images
 * @param messages Full conversation history including refinement messages
 * @param currentTemplate The current template being refined
 */
export async function refineTemplate(
  images: ImageData[],
  messages: ChatMessage[],
  currentTemplate: GeneratedTemplate
): Promise<ServiceResult<DocumentAnalysisResponse>> {
  // Just call analyzeDocument with the full conversation
  // The Edge Function will handle the refinement based on the messages
  return analyzeDocument(images, messages);
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
 */
function formatMessagesForApi(
  messages: ChatMessage[]
): { role: 'user' | 'assistant'; content: string }[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Convert a file URI to base64
 * Works on both web and native platforms
 */
export async function fileToBase64(uri: string): Promise<string> {
  // For web blob URLs
  if (uri.startsWith('blob:')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // For data URLs (already base64)
  if (uri.startsWith('data:')) {
    return uri.split(',')[1];
  }

  // For native file:// URIs, we'll handle this in the component
  // using expo-file-system
  throw new Error('Unsupported URI format. Use compressImageToBase64 for native files.');
}

/**
 * Get MIME type from file extension or URI
 */
export function getMimeType(uri: string, fileName?: string): string {
  const name = fileName || uri;
  const extension = name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/jpeg'; // Default to JPEG
  }
}

/**
 * Validate that the file is a supported type
 */
export function isSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];
  return supportedTypes.includes(mimeType);
}

/**
 * Check if the file is a PDF
 */
export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}
