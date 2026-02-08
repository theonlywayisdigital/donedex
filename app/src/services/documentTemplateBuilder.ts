/**
 * Document Template Builder Service
 * Handles document upload and analysis for template creation using Claude Vision API
 *
 * Uses Firebase Cloud Functions (HTTP callable)
 */

import { auth } from './firebase';
import type { ChatMessage, GeneratedTemplate } from '../types/templateBuilder';

/** Image data for the API */
interface ImageData {
  base64: string;
  mimeType: string;
}

/** Response from the document analysis Cloud Function */
interface DocumentAnalysisResponse {
  message: string;
  quickReplies: string[];
  generatedTemplate: GeneratedTemplate | null;
}

/** Error response from the Cloud Function */
interface DocumentAnalysisError {
  error: string;
}

/** Result type for service calls */
interface ServiceResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// Cloud Function URL - update this with your deployed function URL
const CLOUD_FUNCTION_BASE_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL ||
  'https://europe-west2-donedex-72116.cloudfunctions.net';

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
    // Get current user's ID token for authentication
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/templateFromDocument`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        images,
        messages: messages ? formatMessagesForApi(messages) : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloud function error:', errorText);
      return {
        data: null,
        error: { message: `Failed to analyze document: ${response.status}` },
      };
    }

    const data = await response.json();

    // Check if response indicates an error
    if (data && 'error' in data) {
      const errorResponse = data as DocumentAnalysisError;
      return {
        data: null,
        error: { message: errorResponse.error },
      };
    }

    return { data: data as DocumentAnalysisResponse, error: null };
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
  // The Cloud Function will handle the refinement based on the messages
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
 * Convert ChatMessage array to the format expected by the Cloud Function
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
