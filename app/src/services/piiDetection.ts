/**
 * PII Detection Service
 *
 * Detects potential Personal Identifiable Information (PII) in text fields.
 * Used to warn users about storing personal data in custom fields.
 *
 * Strategy: WARN, NOT BLOCK
 * - Detect common PII patterns (emails, phones, IDs)
 * - Show inline warnings during data entry
 * - Require acknowledgment for critical PII (SSN, NI numbers)
 * - Log detections for audit/compliance
 */

import type { PiiSeverity, PiiCategory } from '../types';

// ============================================
// Pattern Definitions
// ============================================

export interface PIIPatternConfig {
  pattern: RegExp;
  severity: PiiSeverity;
  label: string;
  description: string;
}

/**
 * PII detection patterns with severity levels.
 *
 * Severity:
 * - low: Common data that might be personal (postcodes)
 * - medium: Likely personal data
 * - high: Almost certainly personal data (emails, phones)
 * - critical: Sensitive personal data (SSN, NI, credit cards)
 */
export const PII_PATTERNS: Record<string, PIIPatternConfig> = {
  // Email - High confidence
  email: {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    severity: 'high',
    label: 'Email Address',
    description: 'Email addresses are personal data under GDPR',
  },

  // Phone Numbers - International formats
  phone: {
    // Matches: +44 7911 123456, (020) 7946 0958, 07911123456, +1-555-123-4567
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
    severity: 'high',
    label: 'Phone Number',
    description: 'Phone numbers are personal data under GDPR',
  },

  // UK National Insurance Number
  ukNI: {
    // Format: AB123456C (with optional spaces)
    pattern: /\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
    severity: 'critical',
    label: 'UK National Insurance Number',
    description: 'NI numbers are sensitive personal identifiers',
  },

  // US Social Security Number
  usSSN: {
    // Format: 123-45-6789 or 123 45 6789 or 123456789
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    severity: 'critical',
    label: 'US Social Security Number',
    description: 'SSNs are sensitive personal identifiers',
  },

  // Credit Card Numbers (basic pattern - 16 digits with optional separators)
  creditCard: {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    severity: 'critical',
    label: 'Credit Card Number',
    description: 'Credit card numbers are highly sensitive financial data',
  },

  // UK Postcode (partial address indicator)
  ukPostcode: {
    // Format: SW1A 1AA, M1 1AA, etc.
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
    severity: 'low',
    label: 'UK Postcode',
    description: 'Postcodes can identify location when combined with other data',
  },

  // IBAN (International Bank Account Number)
  iban: {
    // Format: GB82WEST12345698765432 (starts with 2-letter country code)
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
    severity: 'critical',
    label: 'IBAN',
    description: 'Bank account numbers are sensitive financial data',
  },

  // UK Sort Code + Account Number combination
  ukBankAccount: {
    // Format: 12-34-56 12345678
    pattern: /\b\d{2}[-\s]?\d{2}[-\s]?\d{2}\s+\d{8}\b/g,
    severity: 'critical',
    label: 'UK Bank Account',
    description: 'Bank account details are sensitive financial data',
  },
};

/**
 * Field types that legitimately contain PII and should skip detection.
 * These are structured field types designed for PII data.
 */
export const PII_FIELD_TYPES = [
  'email',
  'phone',
  'contractor',
  'witness',
  'person_picker',
  'signature',
  'gps_location',
] as const;

/**
 * Map field types to PII categories for auto-flagging
 */
export const FIELD_TYPE_PII_CATEGORY: Record<string, PiiCategory> = {
  email: 'email',
  phone: 'phone',
  contractor: 'name',
  person_picker: 'name',
  witness: 'name',
  signature: 'signature',
  gps_location: 'location',
};

// ============================================
// Detection Types
// ============================================

export type PIIDetectionType = keyof typeof PII_PATTERNS;

export interface PIIMatch {
  category: PIIDetectionType;
  severity: PiiSeverity;
  label: string;
  description: string;
  matchedText: string; // Masked for privacy
  startIndex: number;
  endIndex: number;
}

export interface PIIDetectionResult {
  hasDetections: boolean;
  matches: PIIMatch[];
  highestSeverity: PiiSeverity | null;
  hasCritical: boolean;
}

export interface PIIDetectionOptions {
  fieldType?: string;
  skipExemptFields?: boolean;
}

/**
 * Organization-level PII handling configuration.
 * Allows organizations to customize PII behavior based on their compliance needs.
 */
export interface PIIHandlingConfig {
  /** Strategy for handling PII detections */
  strategy: 'warn' | 'block-critical' | 'block-all';
  /** Minimum severity level to trigger warnings */
  warnThreshold: PiiSeverity;
  /** Minimum severity level to trigger blocking (if strategy allows) */
  blockThreshold: PiiSeverity;
  /** Require acknowledgment checkbox for critical PII */
  requireAcknowledgment: boolean;
  /** Show inline warnings during typing */
  showInlineWarnings: boolean;
}

/**
 * Default PII handling configuration.
 * Organizations can override these settings.
 */
export const DEFAULT_PII_CONFIG: PIIHandlingConfig = {
  strategy: 'warn',
  warnThreshold: 'low',
  blockThreshold: 'critical',
  requireAcknowledgment: true,
  showInlineWarnings: true,
};

/**
 * Determine the required action based on detection result and config.
 * Returns what the UI should do in response to PII detection.
 */
export interface PIIActionRequired {
  /** Whether the user can proceed with saving */
  canProceed: boolean;
  /** Whether to show a warning */
  showWarning: boolean;
  /** Whether acknowledgment checkbox is required */
  requireAcknowledgment: boolean;
  /** Specific message to show user */
  message: string;
  /** Whether submission is blocked */
  isBlocked: boolean;
}

/**
 * Get the required action based on detection result and configuration.
 */
export function getPIIAction(
  result: PIIDetectionResult,
  config: PIIHandlingConfig = DEFAULT_PII_CONFIG
): PIIActionRequired {
  // No detections - always allow
  if (!result.hasDetections) {
    return {
      canProceed: true,
      showWarning: false,
      requireAcknowledgment: false,
      message: '',
      isBlocked: false,
    };
  }

  const severityOrder: PiiSeverity[] = ['low', 'medium', 'high', 'critical'];
  const highestSeverityIndex = result.highestSeverity
    ? severityOrder.indexOf(result.highestSeverity)
    : -1;
  const warnThresholdIndex = severityOrder.indexOf(config.warnThreshold);
  const blockThresholdIndex = severityOrder.indexOf(config.blockThreshold);

  // Check if blocking is required
  const shouldBlock =
    (config.strategy === 'block-all' && highestSeverityIndex >= warnThresholdIndex) ||
    (config.strategy === 'block-critical' && highestSeverityIndex >= blockThresholdIndex);

  if (shouldBlock) {
    return {
      canProceed: false,
      showWarning: true,
      requireAcknowledgment: false,
      message: getBlockMessage(result),
      isBlocked: true,
    };
  }

  // Check if warning is required
  const showWarning = highestSeverityIndex >= warnThresholdIndex;

  if (!showWarning) {
    return {
      canProceed: true,
      showWarning: false,
      requireAcknowledgment: false,
      message: '',
      isBlocked: false,
    };
  }

  // Show warning - check if acknowledgment required
  const requireAck = config.requireAcknowledgment && result.hasCritical;

  return {
    canProceed: true,
    showWarning: true,
    requireAcknowledgment: requireAck,
    message: getWarningMessage(result),
    isBlocked: false,
  };
}

/**
 * Get a blocking message for when PII cannot be saved
 */
function getBlockMessage(result: PIIDetectionResult): string {
  const uniqueTypes = [...new Set(result.matches.map((m) => m.label))];

  if (result.hasCritical) {
    return `This field contains sensitive personal data (${uniqueTypes.join(', ')}) that cannot be stored in this field type. Please use an appropriate structured field or remove the sensitive data.`;
  }

  return `This field contains personal information (${uniqueTypes.join(', ')}) that is not allowed in this context. Please remove the personal data before saving.`;
}

// ============================================
// Core Detection Functions
// ============================================

/**
 * Check if a field type should skip PII detection
 * (because it's designed to hold PII data)
 */
export function shouldSkipDetection(fieldType: string): boolean {
  return (PII_FIELD_TYPES as readonly string[]).includes(fieldType);
}

/**
 * Check if a field type contains PII by design
 */
export function fieldTypeContainsPII(fieldType: string): boolean {
  return (PII_FIELD_TYPES as readonly string[]).includes(fieldType);
}

/**
 * Get the PII category for a field type
 */
export function getPIICategoryForFieldType(fieldType: string): PiiCategory {
  return FIELD_TYPE_PII_CATEGORY[fieldType] || null;
}

/**
 * Mask text for display/logging (privacy protection)
 * Shows first 2 and last 2 characters for context
 */
export function maskText(text: string): string {
  if (text.length <= 4) return '***';
  if (text.length <= 6) return `${text[0]}***${text[text.length - 1]}`;
  return `${text.slice(0, 2)}...${text.slice(-2)}`;
}

/**
 * Mask text for database storage (more aggressive masking)
 */
export function maskForStorage(text: string, category: PIIDetectionType): string {
  // For critical PII, only store category, not content
  if (['ukNI', 'usSSN', 'creditCard', 'ukBankAccount', 'iban'].includes(category)) {
    return '[REDACTED]';
  }
  return maskText(text);
}

/**
 * Main PII detection function
 *
 * @param text - Text to scan for PII patterns
 * @param options - Detection options (field type, skip exemptions)
 * @returns Detection result with matches and severity
 */
export function detectPII(
  text: string,
  options: PIIDetectionOptions = {}
): PIIDetectionResult {
  const { fieldType, skipExemptFields = true } = options;

  // Empty result for null/undefined/short text
  const emptyResult: PIIDetectionResult = {
    hasDetections: false,
    matches: [],
    highestSeverity: null,
    hasCritical: false,
  };

  // Skip detection for exempt field types (email, phone, etc.)
  if (skipExemptFields && fieldType && shouldSkipDetection(fieldType)) {
    return emptyResult;
  }

  // Skip detection for empty or very short text
  if (!text || text.length < 5) {
    return emptyResult;
  }

  const matches: PIIMatch[] = [];

  // Check each pattern
  for (const [category, config] of Object.entries(PII_PATTERNS)) {
    // Create new regex instance to reset lastIndex
    const regex = new RegExp(config.pattern.source, config.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Skip false positives
      if (!isFalsePositive(text, match[0], category as PIIDetectionType)) {
        matches.push({
          category: category as PIIDetectionType,
          severity: config.severity,
          label: config.label,
          description: config.description,
          matchedText: maskText(match[0]),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Deduplicate overlapping matches (keep highest severity)
  const deduped = deduplicateMatches(matches);

  // Calculate highest severity
  const severityOrder: PiiSeverity[] = ['low', 'medium', 'high', 'critical'];
  const highestSeverity =
    deduped.length > 0
      ? deduped.reduce(
          (highest, m) =>
            severityOrder.indexOf(m.severity) > severityOrder.indexOf(highest)
              ? m.severity
              : highest,
          'low' as PiiSeverity
        )
      : null;

  return {
    hasDetections: deduped.length > 0,
    matches: deduped,
    highestSeverity,
    hasCritical: deduped.some((m) => m.severity === 'critical'),
  };
}

// ============================================
// False Positive Handling
// ============================================

/**
 * Patterns that look like PII but aren't
 */
const FALSE_POSITIVE_PATTERNS = {
  // Serial numbers often look like SSNs
  serialNumber: /(?:serial|s\/n|model|part|ref)\s*#?\s*:?\s*/i,

  // Reference numbers
  referenceNumber: /(?:ref|order|invoice|po|quote|job|ticket)\s*#?\s*:?\s*/i,

  // Asset/equipment IDs
  assetId: /(?:asset|equipment|tag|ID|item)\s*#?\s*:?\s*/i,

  // Building/room references
  buildingRef: /(?:unit|suite|floor|room|bay|dock)\s*#?\s*:?\s*/i,

  // Phone numbers preceded by "Fax:" are usually business numbers
  faxNumber: /fax\s*:?\s*/i,
};

/**
 * Check if a match is likely a false positive based on context
 */
function isFalsePositive(
  fullText: string,
  matchedText: string,
  category: PIIDetectionType
): boolean {
  const matchIndex = fullText.indexOf(matchedText);
  const contextStart = Math.max(0, matchIndex - 30);
  const contextBefore = fullText.slice(contextStart, matchIndex).toLowerCase();

  // Check context-based false positives
  switch (category) {
    case 'usSSN':
      // SSN-like patterns preceded by reference/serial keywords
      if (
        FALSE_POSITIVE_PATTERNS.serialNumber.test(contextBefore) ||
        FALSE_POSITIVE_PATTERNS.referenceNumber.test(contextBefore) ||
        FALSE_POSITIVE_PATTERNS.assetId.test(contextBefore)
      ) {
        return true;
      }
      break;

    case 'phone':
      // Phone numbers that are clearly fax numbers
      if (FALSE_POSITIVE_PATTERNS.faxNumber.test(contextBefore)) {
        // Still PII, but less commonly personal - could be business fax
        // Keep this as not a false positive since business contacts can be PII too
      }
      break;

    case 'ukPostcode':
      // Postcodes in obviously non-personal contexts (e.g., property addresses)
      // Note: In an inspection app, property addresses are expected - low severity handles this
      break;
  }

  return false;
}

/**
 * Remove overlapping matches, keeping highest severity
 */
function deduplicateMatches(matches: PIIMatch[]): PIIMatch[] {
  if (matches.length <= 1) return matches;

  const severityOrder: PiiSeverity[] = ['low', 'medium', 'high', 'critical'];

  // Sort by start index, then by severity (highest first)
  const sorted = [...matches].sort((a, b) => {
    if (a.startIndex !== b.startIndex) {
      return a.startIndex - b.startIndex;
    }
    return severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity);
  });

  const result: PIIMatch[] = [];
  let lastEnd = -1;

  for (const match of sorted) {
    // Skip if this match overlaps with a previous one
    if (match.startIndex < lastEnd) {
      continue;
    }
    result.push(match);
    lastEnd = match.endIndex;
  }

  return result;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get a user-friendly warning message for a detection result
 */
export function getWarningMessage(result: PIIDetectionResult): string {
  if (!result.hasDetections) return '';

  const uniqueTypes = [...new Set(result.matches.map((m) => m.label))];

  if (result.hasCritical) {
    return `Sensitive personal data detected: ${uniqueTypes.join(', ')}. This data creates significant compliance obligations.`;
  }

  if (result.highestSeverity === 'high') {
    return `Personal information detected: ${uniqueTypes.join(', ')}. Consider using a reference ID instead.`;
  }

  return `This may contain personal information (${uniqueTypes.join(', ')}).`;
}

/**
 * Get severity-based styling hints
 */
export function getSeverityStyle(severity: PiiSeverity): {
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
} {
  switch (severity) {
    case 'critical':
      return {
        backgroundColor: '#FEF2F2',
        borderColor: '#DC2626',
        iconColor: '#DC2626',
      };
    case 'high':
      return {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        iconColor: '#F59E0B',
      };
    case 'medium':
      return {
        backgroundColor: '#FFFBEB',
        borderColor: '#D97706',
        iconColor: '#D97706',
      };
    case 'low':
    default:
      return {
        backgroundColor: '#FFFBEB',
        borderColor: '#D97706',
        iconColor: '#D97706',
      };
  }
}
