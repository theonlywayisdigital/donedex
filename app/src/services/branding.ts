/**
 * Branding Service
 * Handles fetching, updating, and managing organisation branding settings
 */

import { supabase } from './supabase';
import { compressImage } from './imageCompression';
import type {
  OrganisationBranding,
  BrandingContext,
  UpdateBrandingInput,
} from '../types/branding';

const LOGO_BUCKET = 'organisation-logos';

/**
 * Fetch organisation branding settings
 */
export async function fetchOrganisationBranding(
  orgId: string
): Promise<{ data: OrganisationBranding | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('organisations')
    .select('logo_path, primary_color, secondary_color, display_name')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching organisation branding:', error);
    return { data: null, error: { message: error.message } };
  }

  return {
    data: data as OrganisationBranding,
    error: null,
  };
}

/**
 * Update organisation branding settings
 */
export async function updateOrganisationBranding(
  orgId: string,
  input: UpdateBrandingInput
): Promise<{ error: { message: string } | null }> {
  const updateData: Record<string, unknown> = {};

  if (input.logo_path !== undefined) {
    updateData.logo_path = input.logo_path;
  }
  if (input.primary_color !== undefined) {
    updateData.primary_color = input.primary_color;
  }
  if (input.secondary_color !== undefined) {
    updateData.secondary_color = input.secondary_color;
  }
  if (input.display_name !== undefined) {
    updateData.display_name = input.display_name;
  }

  const { error } = await supabase
    .from('organisations')
    .update(updateData as never)
    .eq('id', orgId);

  if (error) {
    console.error('Error updating organisation branding:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Upload organisation logo
 * Compresses the image and uploads to storage
 */
export async function uploadOrganisationLogo(
  orgId: string,
  imageUri: string
): Promise<{ data: string | null; error: { message: string } | null }> {
  try {
    // Compress the image (max 500px for logo, 90% quality)
    const compressed = await compressImage(imageUri, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9,
    });

    // Generate filename with timestamp to bust cache
    const filename = `${orgId}/logo_${Date.now()}.jpg`;

    // Fetch the compressed image as a blob
    const response = await fetch(compressed.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return { data: null, error: { message: uploadError.message } };
    }

    // Update organisation with new logo path
    const { error: updateError } = await updateOrganisationBranding(orgId, {
      logo_path: filename,
    });

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: filename, error: null };
  } catch (err) {
    console.error('Error in uploadOrganisationLogo:', err);
    return { data: null, error: { message: 'Failed to upload logo' } };
  }
}

/**
 * Delete organisation logo
 */
export async function deleteOrganisationLogo(
  orgId: string,
  logoPath: string
): Promise<{ error: { message: string } | null }> {
  try {
    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove([logoPath]);

    if (deleteError) {
      console.error('Error deleting logo from storage:', deleteError);
      // Continue anyway to clear the database reference
    }

    // Clear logo_path in organisation
    const { error: updateError } = await updateOrganisationBranding(orgId, {
      logo_path: null,
    });

    if (updateError) {
      return { error: updateError };
    }

    return { error: null };
  } catch (err) {
    console.error('Error in deleteOrganisationLogo:', err);
    return { error: { message: 'Failed to delete logo' } };
  }
}

/**
 * Get public URL for a logo
 */
export function getLogoUrl(logoPath: string): string {
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(logoPath);
  return data.publicUrl;
}

/**
 * Build branding context for use in templates
 * Combines organisation data with branding settings, falling back to defaults
 */
export function buildBrandingContext(
  orgName: string,
  branding: OrganisationBranding | null
): BrandingContext {
  const defaultBranding: BrandingContext = {
    orgName: 'Donedex',
    logoUrl: null,
    primaryColor: '#0F4C5C',
    secondaryColor: '#1F6F8B',
  };

  if (!branding) {
    return {
      ...defaultBranding,
      orgName,
    };
  }

  return {
    orgName: branding.display_name || orgName,
    logoUrl: branding.logo_path ? getLogoUrl(branding.logo_path) : null,
    primaryColor: branding.primary_color || defaultBranding.primaryColor,
    secondaryColor: branding.secondary_color || defaultBranding.secondaryColor,
  };
}

/**
 * Fetch branding context for an organisation (convenience function)
 * Fetches org name and branding in one call
 */
export async function fetchBrandingContext(
  orgId: string
): Promise<{ data: BrandingContext | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('organisations')
    .select('name, logo_path, primary_color, secondary_color, display_name')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching branding context:', error);
    return { data: null, error: { message: error.message } };
  }

  const org = data as {
    name: string;
    logo_path: string | null;
    primary_color: string;
    secondary_color: string;
    display_name: string | null;
  };

  const branding: OrganisationBranding = {
    logo_path: org.logo_path,
    primary_color: org.primary_color,
    secondary_color: org.secondary_color,
    display_name: org.display_name,
  };

  return {
    data: buildBrandingContext(org.name, branding),
    error: null,
  };
}

/**
 * Reset branding to defaults
 */
export async function resetBrandingToDefaults(
  orgId: string,
  currentLogoPath: string | null
): Promise<{ error: { message: string } | null }> {
  // Delete logo if exists
  if (currentLogoPath) {
    await deleteOrganisationLogo(orgId, currentLogoPath);
  }

  // Reset colors and display name
  const { error } = await updateOrganisationBranding(orgId, {
    primary_color: '#0F4C5C',
    secondary_color: '#1F6F8B',
    display_name: null,
    logo_path: null,
  });

  return { error };
}
