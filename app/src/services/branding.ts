/**
 * Branding Service
 * Handles fetching, updating, and managing organisation branding settings
 *
 * Migrated to Firebase/Firestore
 */

import { db, storage } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collections } from './firestore';
import { compressImage } from './imageCompression';
import type {
  OrganisationBranding,
  BrandingContext,
  UpdateBrandingInput,
} from '../types/branding';

const LOGO_FOLDER = 'organisation-logos';

/**
 * Fetch organisation branding settings
 */
export async function fetchOrganisationBranding(
  orgId: string
): Promise<{ data: OrganisationBranding | null; error: { message: string } | null }> {
  try {
    const orgRef = doc(db, collections.organisations, orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      return { data: null, error: { message: 'Organisation not found' } };
    }

    const orgData = orgSnap.data();
    return {
      data: {
        logo_path: orgData.logo_path || null,
        primary_color: orgData.primary_color || null,
        secondary_color: orgData.secondary_color || null,
        display_name: orgData.display_name || null,
      } as OrganisationBranding,
      error: null,
    };
  } catch (err) {
    console.error('Error fetching organisation branding:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch branding';
    return { data: null, error: { message } };
  }
}

/**
 * Update organisation branding settings
 */
export async function updateOrganisationBranding(
  orgId: string,
  input: UpdateBrandingInput
): Promise<{ error: { message: string } | null }> {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

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

    const orgRef = doc(db, collections.organisations, orgId);
    await updateDoc(orgRef, updateData);

    return { error: null };
  } catch (err) {
    console.error('Error updating organisation branding:', err);
    const message = err instanceof Error ? err.message : 'Failed to update branding';
    return { error: { message } };
  }
}

/**
 * Upload organisation logo
 * Compresses the image and uploads to Firebase Storage
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
    const filename = `${LOGO_FOLDER}/${orgId}/logo_${Date.now()}.jpg`;

    // Fetch the compressed image as a blob
    const response = await fetch(compressed.uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
    });

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
    const message = err instanceof Error ? err.message : 'Failed to upload logo';
    return { data: null, error: { message } };
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
    // Delete from Firebase Storage
    try {
      const storageRef = ref(storage, logoPath);
      await deleteObject(storageRef);
    } catch (deleteErr) {
      console.error('Error deleting logo from storage:', deleteErr);
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
    const message = err instanceof Error ? err.message : 'Failed to delete logo';
    return { error: { message } };
  }
}

/**
 * Get public URL for a logo from Firebase Storage
 */
export async function getLogoUrl(logoPath: string): Promise<string> {
  try {
    const storageRef = ref(storage, logoPath);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error('Error getting logo URL:', err);
    return '';
  }
}

/**
 * Build branding context for use in templates
 * Combines organisation data with branding settings, falling back to defaults
 */
export function buildBrandingContext(
  orgName: string,
  branding: OrganisationBranding | null,
  logoUrl?: string | null
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
    logoUrl: logoUrl || null,
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
  try {
    const orgRef = doc(db, collections.organisations, orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      return { data: null, error: { message: 'Organisation not found' } };
    }

    const orgData = orgSnap.data();

    const branding: OrganisationBranding = {
      logo_path: orgData.logo_path || null,
      primary_color: orgData.primary_color || null,
      secondary_color: orgData.secondary_color || null,
      display_name: orgData.display_name || null,
    };

    // Get logo URL if path exists
    let logoUrl: string | null = null;
    if (branding.logo_path) {
      logoUrl = await getLogoUrl(branding.logo_path);
    }

    return {
      data: buildBrandingContext(orgData.name, branding, logoUrl),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching branding context:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch branding context';
    return { data: null, error: { message } };
  }
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
