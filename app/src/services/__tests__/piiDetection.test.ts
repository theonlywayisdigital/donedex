import {
  detectPII,
  maskText,
  maskForStorage,
  shouldSkipDetection,
  fieldTypeContainsPII,
  getWarningMessage,
  getSeverityStyle,
  getPIIAction,
  PII_PATTERNS,
  DEFAULT_PII_CONFIG,
  type PIIHandlingConfig,
} from '../piiDetection';

describe('PII Detection Service', () => {
  describe('detectPII', () => {
    describe('Email Detection', () => {
      it('should detect email addresses', () => {
        const result = detectPII('Contact john.doe@example.com for details');
        expect(result.hasDetections).toBe(true);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].category).toBe('email');
        expect(result.matches[0].severity).toBe('high');
      });

      it('should detect multiple email addresses', () => {
        const result = detectPII('Email john@test.com or jane@test.org');
        expect(result.hasDetections).toBe(true);
        expect(result.matches.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Phone Number Detection', () => {
      it('should detect UK phone numbers', () => {
        const result = detectPII('Call me at 07911 123456');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('phone');
        expect(result.matches[0].severity).toBe('high');
      });

      it('should detect international phone numbers', () => {
        const result = detectPII('Phone: +44 7911 123456');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('phone');
      });

      it('should detect US phone format', () => {
        const result = detectPII('Number: +1-555-123-4567');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('phone');
      });
    });

    describe('UK National Insurance Number Detection', () => {
      it('should detect NI numbers', () => {
        const result = detectPII('NI: AB 12 34 56 C');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('ukNI');
        expect(result.matches[0].severity).toBe('critical');
      });

      it('should detect NI numbers without spaces', () => {
        const result = detectPII('NI number AB123456C');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('ukNI');
      });
    });

    describe('US Social Security Number Detection', () => {
      it('should detect SSN with dashes', () => {
        const result = detectPII('SSN is 123-45-6789');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('usSSN');
        expect(result.matches[0].severity).toBe('critical');
      });

      it('should detect SSN with spaces', () => {
        const result = detectPII('SSN: 123 45 6789');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('usSSN');
      });
    });

    describe('Credit Card Detection', () => {
      it('should detect credit card numbers', () => {
        const result = detectPII('Card: 4111-1111-1111-1111');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('creditCard');
        expect(result.matches[0].severity).toBe('critical');
      });

      it('should detect credit card with spaces', () => {
        const result = detectPII('Card 4111 1111 1111 1111');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('creditCard');
      });
    });

    describe('UK Postcode Detection', () => {
      it('should detect UK postcodes', () => {
        const result = detectPII('Address: SW1A 1AA');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('ukPostcode');
        expect(result.matches[0].severity).toBe('low');
      });

      it('should detect postcodes without space', () => {
        const result = detectPII('Postcode: M11AA');
        expect(result.hasDetections).toBe(true);
        expect(result.matches[0].category).toBe('ukPostcode');
      });
    });

    describe('Empty/Short Text Handling', () => {
      it('should return empty result for null text', () => {
        // @ts-expect-error Testing null input
        const result = detectPII(null);
        expect(result.hasDetections).toBe(false);
        expect(result.matches).toHaveLength(0);
      });

      it('should return empty result for very short text', () => {
        const result = detectPII('Hi');
        expect(result.hasDetections).toBe(false);
      });
    });

    describe('Field Type Exemptions', () => {
      it('should skip detection for email field type', () => {
        const result = detectPII('john@test.com', { fieldType: 'email' });
        expect(result.hasDetections).toBe(false);
      });

      it('should skip detection for phone field type', () => {
        const result = detectPII('07911123456', { fieldType: 'phone' });
        expect(result.hasDetections).toBe(false);
      });

      it('should detect PII when skipExemptFields is false', () => {
        const result = detectPII('john@test.com', {
          fieldType: 'email',
          skipExemptFields: false,
        });
        expect(result.hasDetections).toBe(true);
      });
    });

    describe('Severity Calculation', () => {
      it('should return highestSeverity as critical when critical PII found', () => {
        const result = detectPII('SSN: 123-45-6789');
        expect(result.highestSeverity).toBe('critical');
        expect(result.hasCritical).toBe(true);
      });

      it('should return highestSeverity as high for email/phone', () => {
        const result = detectPII('Email: john@test.com');
        expect(result.highestSeverity).toBe('high');
        expect(result.hasCritical).toBe(false);
      });

      it('should return highestSeverity as low for postcode only', () => {
        const result = detectPII('Postcode: SW1A 1AA');
        expect(result.highestSeverity).toBe('low');
      });
    });
  });

  describe('maskText', () => {
    it('should mask text showing first 2 and last 2 chars', () => {
      expect(maskText('john.doe@example.com')).toBe('jo...om');
    });

    it('should return *** for very short text', () => {
      expect(maskText('abc')).toBe('***');
    });

    it('should handle 5-6 char text', () => {
      expect(maskText('12345')).toBe('1***5');
    });
  });

  describe('maskForStorage', () => {
    it('should return [REDACTED] for critical PII', () => {
      expect(maskForStorage('123-45-6789', 'usSSN')).toBe('[REDACTED]');
      expect(maskForStorage('AB123456C', 'ukNI')).toBe('[REDACTED]');
      expect(maskForStorage('4111111111111111', 'creditCard')).toBe('[REDACTED]');
    });

    it('should mask non-critical PII', () => {
      expect(maskForStorage('john@test.com', 'email')).toBe('jo...om');
    });
  });

  describe('shouldSkipDetection', () => {
    it('should return true for PII field types', () => {
      expect(shouldSkipDetection('email')).toBe(true);
      expect(shouldSkipDetection('phone')).toBe(true);
      expect(shouldSkipDetection('signature')).toBe(true);
    });

    it('should return false for regular field types', () => {
      expect(shouldSkipDetection('text')).toBe(false);
      expect(shouldSkipDetection('number')).toBe(false);
    });
  });

  describe('fieldTypeContainsPII', () => {
    it('should return true for PII field types', () => {
      expect(fieldTypeContainsPII('email')).toBe(true);
      expect(fieldTypeContainsPII('contractor')).toBe(true);
    });

    it('should return false for non-PII field types', () => {
      expect(fieldTypeContainsPII('text')).toBe(false);
    });
  });

  describe('getWarningMessage', () => {
    it('should return empty string for no detections', () => {
      const result = { hasDetections: false, matches: [], highestSeverity: null, hasCritical: false };
      expect(getWarningMessage(result)).toBe('');
    });

    it('should return critical message for critical PII', () => {
      const result = detectPII('SSN: 123-45-6789');
      const message = getWarningMessage(result);
      expect(message).toContain('Sensitive personal data');
      expect(message).toContain('compliance');
    });

    it('should return high severity message for email', () => {
      const result = detectPII('john@test.com');
      const message = getWarningMessage(result);
      expect(message).toContain('Personal information');
      expect(message).toContain('reference ID');
    });
  });

  describe('getSeverityStyle', () => {
    it('should return red colors for critical severity', () => {
      const style = getSeverityStyle('critical');
      expect(style.borderColor).toBe('#DC2626');
    });

    it('should return amber colors for high severity', () => {
      const style = getSeverityStyle('high');
      expect(style.borderColor).toBe('#F59E0B');
    });

    it('should return warning colors for low severity', () => {
      const style = getSeverityStyle('low');
      expect(style.borderColor).toBe('#D97706');
    });
  });

  describe('PII_PATTERNS', () => {
    it('should have all expected pattern keys', () => {
      expect(PII_PATTERNS).toHaveProperty('email');
      expect(PII_PATTERNS).toHaveProperty('phone');
      expect(PII_PATTERNS).toHaveProperty('ukNI');
      expect(PII_PATTERNS).toHaveProperty('usSSN');
      expect(PII_PATTERNS).toHaveProperty('creditCard');
      expect(PII_PATTERNS).toHaveProperty('ukPostcode');
    });

    it('should have correct severity levels', () => {
      expect(PII_PATTERNS.email.severity).toBe('high');
      expect(PII_PATTERNS.usSSN.severity).toBe('critical');
      expect(PII_PATTERNS.ukPostcode.severity).toBe('low');
    });
  });

  describe('getPIIAction', () => {
    describe('with default warn strategy', () => {
      it('should allow proceed with no detections', () => {
        const result = detectPII('No personal data here');
        const action = getPIIAction(result);

        expect(action.canProceed).toBe(true);
        expect(action.showWarning).toBe(false);
        expect(action.requireAcknowledgment).toBe(false);
        expect(action.isBlocked).toBe(false);
      });

      it('should show warning for email detection', () => {
        const result = detectPII('Contact john@example.com');
        const action = getPIIAction(result);

        expect(action.canProceed).toBe(true);
        expect(action.showWarning).toBe(true);
        expect(action.isBlocked).toBe(false);
      });

      it('should require acknowledgment for critical PII', () => {
        const result = detectPII('SSN: 123-45-6789');
        const action = getPIIAction(result);

        expect(action.canProceed).toBe(true);
        expect(action.showWarning).toBe(true);
        expect(action.requireAcknowledgment).toBe(true);
        expect(action.isBlocked).toBe(false);
      });

      it('should not require acknowledgment when config disabled', () => {
        const result = detectPII('SSN: 123-45-6789');
        const config: PIIHandlingConfig = {
          ...DEFAULT_PII_CONFIG,
          requireAcknowledgment: false,
        };
        const action = getPIIAction(result, config);

        expect(action.requireAcknowledgment).toBe(false);
      });
    });

    describe('with block-critical strategy', () => {
      const blockCriticalConfig: PIIHandlingConfig = {
        ...DEFAULT_PII_CONFIG,
        strategy: 'block-critical',
      };

      it('should block critical PII', () => {
        const result = detectPII('SSN: 123-45-6789');
        const action = getPIIAction(result, blockCriticalConfig);

        expect(action.canProceed).toBe(false);
        expect(action.isBlocked).toBe(true);
        expect(action.showWarning).toBe(true);
        expect(action.message).toContain('cannot be stored');
      });

      it('should allow non-critical PII with warning', () => {
        const result = detectPII('Contact john@example.com');
        const action = getPIIAction(result, blockCriticalConfig);

        expect(action.canProceed).toBe(true);
        expect(action.isBlocked).toBe(false);
        expect(action.showWarning).toBe(true);
      });
    });

    describe('with block-all strategy', () => {
      const blockAllConfig: PIIHandlingConfig = {
        ...DEFAULT_PII_CONFIG,
        strategy: 'block-all',
        warnThreshold: 'low',
      };

      it('should block any PII detection', () => {
        const result = detectPII('Contact john@example.com');
        const action = getPIIAction(result, blockAllConfig);

        expect(action.canProceed).toBe(false);
        expect(action.isBlocked).toBe(true);
      });

      it('should block even low severity PII', () => {
        const result = detectPII('Address: SW1A 1AA');
        const action = getPIIAction(result, blockAllConfig);

        expect(action.canProceed).toBe(false);
        expect(action.isBlocked).toBe(true);
      });
    });

    describe('with custom thresholds', () => {
      it('should only warn at high threshold', () => {
        const config: PIIHandlingConfig = {
          ...DEFAULT_PII_CONFIG,
          warnThreshold: 'high',
        };

        // Low severity should not trigger warning
        const lowResult = detectPII('Address: SW1A 1AA');
        const lowAction = getPIIAction(lowResult, config);
        expect(lowAction.showWarning).toBe(false);

        // High severity should trigger warning
        const highResult = detectPII('Email: test@example.com');
        const highAction = getPIIAction(highResult, config);
        expect(highAction.showWarning).toBe(true);
      });
    });
  });
});
