/**
 * Organisation Branding Types
 * Used for customizing PDF exports, email templates, and reports screen
 */

/**
 * Organisation branding fields as stored in database
 */
export interface OrganisationBranding {
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  display_name: string | null;
}

/**
 * Branding context for use in templates (PDF, email)
 * Includes resolved logo URL and falls back to defaults
 */
export interface BrandingContext {
  orgName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Input for updating branding settings
 */
export interface UpdateBrandingInput {
  logo_path?: string | null;
  primary_color?: string;
  secondary_color?: string;
  display_name?: string | null;
}

/**
 * Default Donedex branding values
 */
export const DEFAULT_BRANDING: BrandingContext = {
  orgName: 'Donedex',
  logoUrl: null,
  primaryColor: '#0F4C5C',
  secondaryColor: '#1F6F8B',
};

/**
 * Color validation - must be valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Branding for email templates (sent to edge function)
 */
export interface EmailBranding {
  orgName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}
