/**
 * HTML Generator for PDF Export
 * Shared between native and web implementations
 */

import { getSignatureUrl, getPhotoUrl } from '../reports';
import type { ExportOptions, ExportOptionsWithImages, ResponseDisplay, ImageDataMap } from './types';
import { DEFAULT_BRANDING, BrandingContext } from '../../types/branding';

/**
 * Format a date string for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse media paths from response_value (could be single path or JSON array)
 */
function getMediaPaths(value: string | null | undefined): string[] {
  if (!value) return [];
  // Skip pending upload placeholders
  if (value.includes('pending upload')) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
}

/**
 * Get display text and color for a response value
 */
export async function getResponseDisplay(
  value: string | null | undefined,
  itemType: string
): Promise<ResponseDisplay> {
  if (!value) {
    return { text: 'Not answered', color: '#6B7280' };
  }

  switch (itemType) {
    // Basic types
    case 'pass_fail':
      return value === 'pass'
        ? { text: 'Pass', color: '#059669' }
        : { text: 'Fail', color: '#DC2626' };

    case 'yes_no':
      return value === 'yes'
        ? { text: 'Yes', color: '#059669' }
        : { text: 'No', color: '#DC2626' };

    case 'condition':
      if (value === 'good') return { text: 'Good', color: '#059669' };
      if (value === 'fair') return { text: 'Fair', color: '#D97706' };
      return { text: 'Poor', color: '#DC2626' };

    case 'severity':
      if (value === 'low') return { text: 'Low', color: '#059669' };
      if (value === 'medium') return { text: 'Medium', color: '#D97706' };
      return { text: 'High', color: '#DC2626' };

    case 'multi_select':
    case 'checklist':
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return { text: parsed.join(', '), color: '#111827' };
        }
        // Checklist format: { "item1": true, "item2": false }
        if (typeof parsed === 'object') {
          const checked = Object.entries(parsed)
            .filter(([_, v]) => v === true)
            .map(([k]) => k);
          const total = Object.keys(parsed).length;
          return { text: `${checked.length}/${total} completed`, color: '#111827' };
        }
        return { text: value, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    // Rating types
    case 'rating':
      const rating = parseInt(value, 10);
      if (!isNaN(rating)) {
        const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
        return { text: stars, color: '#D97706' };
      }
      return { text: value, color: '#111827' };

    case 'rating_numeric':
      const numRating = parseInt(value, 10);
      if (!isNaN(numRating)) {
        return { text: `${numRating}/10`, color: '#0F4C5C' }; // Uses theme primary
      }
      return { text: value, color: '#111827' };

    case 'slider':
      const sliderVal = parseFloat(value);
      if (!isNaN(sliderVal)) {
        return { text: `${Math.round(sliderVal)}%`, color: '#0F4C5C' }; // Uses theme primary
      }
      return { text: value, color: '#111827' };

    case 'traffic_light':
      if (value === 'green') return { text: 'Green', color: '#059669' };
      if (value === 'amber') return { text: 'Amber', color: '#D97706' };
      if (value === 'red') return { text: 'Red', color: '#DC2626' };
      return { text: value, color: '#111827' };

    // Date & Time
    case 'date':
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return { text: date.toLocaleDateString(), color: '#111827' };
        }
        return { text: value, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    case 'time':
      return { text: value, color: '#111827' };

    case 'datetime':
    case 'auto_timestamp':
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return { text: date.toLocaleString(), color: '#111827' };
        }
        return { text: value, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    case 'expiry_date':
      try {
        const expiryDate = new Date(value);
        if (!isNaN(expiryDate.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const dateText = expiryDate.toLocaleDateString();
          if (diffDays < 0) {
            return { text: `${dateText} (Expired)`, color: '#DC2626' };
          } else if (diffDays <= 30) {
            return { text: `${dateText} (${diffDays} days left)`, color: '#D97706' };
          }
          return { text: dateText, color: '#059669' };
        }
        return { text: value, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    // Measurement types
    case 'counter':
    case 'number':
      return { text: value, color: '#111827' };

    case 'measurement':
    case 'temperature':
      try {
        const parsed = JSON.parse(value);
        return { text: `${parsed.value} ${parsed.unit}`, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    case 'currency':
      try {
        const parsed = JSON.parse(value);
        return { text: `${parsed.currency}${parsed.amount}`, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    case 'meter_reading':
      return { text: value, color: '#111827' };

    // Declaration
    case 'declaration':
      try {
        const parsed = JSON.parse(value);
        if (parsed.acknowledged) {
          const timestamp = parsed.acknowledgedAt
            ? ` at ${new Date(parsed.acknowledgedAt).toLocaleString()}`
            : '';
          return { text: `Acknowledged${timestamp}`, color: '#059669' };
        }
        return { text: 'Not acknowledged', color: '#6B7280' };
      } catch {
        return { text: value, color: '#111827' };
      }

    // Signature
    case 'signature':
      try {
        const parsed = JSON.parse(value);
        const signatureUrl = await getSignatureUrl(parsed.path);
        const signerText = parsed.signerName ? ` (${parsed.signerName})` : '';
        return {
          text: `Signature captured${signerText}`,
          color: '#059669',
          isSignature: true,
          signatureUrl,
        };
      } catch {
        // Handle both base64 data URLs and storage paths
        // Base64 starts with "data:", storage paths don't
        const isBase64 = value.startsWith('data:');
        return {
          text: 'Signature captured',
          color: '#059669',
          isSignature: true,
          signatureUrl: isBase64 ? value : await getSignatureUrl(value),
        };
      }

    // Witness (name + signature)
    case 'witness':
      try {
        const parsed = JSON.parse(value);
        const hasSignature = !!parsed.signaturePath;
        const text = parsed.name
          ? `${parsed.name}${hasSignature ? ' (signed)' : ''}`
          : hasSignature ? 'Signed' : 'Not completed';
        return {
          text,
          color: hasSignature ? '#059669' : '#6B7280',
          isSignature: hasSignature,
          signatureUrl: hasSignature ? await getSignatureUrl(parsed.signaturePath) : undefined,
        };
      } catch {
        return { text: value, color: '#111827' };
      }

    // Contractor
    case 'contractor':
      try {
        const parsed = JSON.parse(value);
        const parts = [parsed.name, parsed.company, parsed.phone].filter(Boolean);
        return { text: parts.join(' • ') || 'Not provided', color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    // Location & Assets
    case 'gps_location':
      try {
        const parsed = JSON.parse(value);
        if (parsed.latitude && parsed.longitude) {
          return { text: `${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)}`, color: '#111827' };
        }
        return { text: value, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    case 'barcode_scan':
    case 'asset_lookup':
    case 'person_picker':
      return { text: value, color: '#111827' };

    // Auto weather
    case 'auto_weather':
      try {
        const parsed = JSON.parse(value);
        return { text: `${parsed.condition}, ${parsed.temperature}`, color: '#111827' };
      } catch {
        return { text: value, color: '#111827' };
      }

    // Media types - photos with actual image embedding
    case 'photo':
    case 'photo_before_after':
    case 'annotated_photo': {
      const photoPaths = getMediaPaths(value);
      if (photoPaths.length > 0) {
        const photoUrls = await Promise.all(photoPaths.map((p) => getPhotoUrl(p)));
        return {
          text: `${photoPaths.length} photo(s)`,
          color: '#059669',
          photoUrls,
        };
      }
      return { text: 'Photo attached', color: '#059669' };
    }

    // Instruction (display only, no value)
    case 'instruction':
      return { text: '(Information)', color: '#6B7280' };

    default:
      return { text: value, color: '#111827' };
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Collect all image URLs from the export options
 * Used to pre-load images as base64 before generating PDF
 */
export async function collectImageUrls(options: ExportOptions): Promise<string[]> {
  const urls: string[] = [];
  const { template, responses, branding } = options;

  // Add logo URL if present
  if (branding?.logoUrl) {
    urls.push(branding.logoUrl);
  }

  // Collect URLs from all responses
  for (const section of template.template_sections) {
    for (const item of section.template_items) {
      const response = responses.get(item.id);
      if (!response?.response_value) continue;

      const value = response.response_value;

      // Handle signature
      if (item.item_type === 'signature') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.path) {
            urls.push(await getSignatureUrl(parsed.path));
          }
        } catch {
          if (!value.startsWith('data:') && !value.startsWith('blob:')) {
            urls.push(await getSignatureUrl(value));
          }
        }
      }

      // Handle witness signature
      if (item.item_type === 'witness') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.signaturePath) {
            urls.push(await getSignatureUrl(parsed.signaturePath));
          }
        } catch {
          // Not JSON, skip
        }
      }

      // Handle photos
      if (['photo', 'photo_before_after', 'annotated_photo'].includes(item.item_type)) {
        const paths = getMediaPaths(value);
        for (const path of paths) {
          const photoUrl = await getPhotoUrl(path);
          urls.push(photoUrl);
        }
      }
    }
  }

  return urls;
}

/**
 * Get image source - use base64 from map if available, otherwise use URL
 */
function getImageSrc(url: string, imageDataMap?: ImageDataMap): string {
  if (imageDataMap?.has(url)) {
    return imageDataMap.get(url)!;
  }
  return url;
}

/**
 * Generate HTML content for the PDF
 */
export async function generateHtml(options: ExportOptionsWithImages): Promise<string> {
  const { report, template, responses, branding, imageDataMap } = options;

  // Use custom branding or fall back to defaults
  const brand: BrandingContext = branding || DEFAULT_BRANDING;
  const primaryColor = brand.primaryColor;
  const secondaryColor = brand.secondaryColor;
  const brandName = brand.orgName;
  const logoUrl = brand.logoUrl;

  const statusColor = report.status === 'submitted' ? '#059669' : '#D97706';
  const statusText = report.status === 'submitted' ? 'Completed' : 'Draft';

  // Generate sections HTML with async handling
  const sectionPromises = template.template_sections.map(async (section) => {
    const itemPromises = section.template_items.map(async (item) => {
      const response = responses.get(item.id);
      const display = await getResponseDisplay(response?.response_value, item.item_type);

      let notesHtml = '';
      if (response?.notes) {
        notesHtml = `
          <div class="notes">
            <strong>Notes:</strong> ${escapeHtml(response.notes)}
          </div>
        `;
      }

      let severityHtml = '';
      if (response?.severity) {
        const severityColor =
          response.severity === 'low'
            ? '#059669'
            : response.severity === 'medium'
            ? '#D97706'
            : '#DC2626';
        severityHtml = `
          <div class="severity">
            <strong>Severity:</strong>
            <span style="color: ${severityColor}; font-weight: 600;">
              ${response.severity.charAt(0).toUpperCase() + response.severity.slice(1)}
            </span>
          </div>
        `;
      }

      // Handle signature images
      let signatureHtml = '';
      if (display.isSignature && display.signatureUrl) {
        const signatureSrc = getImageSrc(display.signatureUrl, imageDataMap);
        signatureHtml = `
          <div class="signature-container">
            <img src="${signatureSrc}" alt="Signature" class="signature-image" />
          </div>
        `;
      }

      // Handle photo galleries
      let photoGalleryHtml = '';
      if (display.photoUrls && display.photoUrls.length > 0) {
        photoGalleryHtml = `
          <div class="photo-gallery">
            ${display.photoUrls.map((url: string) => `
              <img src="${getImageSrc(url, imageDataMap)}" alt="Photo" class="photo-image" />
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="item">
          <div class="item-row">
            <span class="item-label">
              ${escapeHtml(item.label)}
              ${item.is_required ? '<span class="required">*</span>' : ''}
            </span>
            <span class="item-value" style="color: ${display.color};">
              ${escapeHtml(display.text)}
            </span>
          </div>
          ${signatureHtml}
          ${photoGalleryHtml}
          ${notesHtml}
          ${severityHtml}
        </div>
      `;
    });

    const itemsHtml = (await Promise.all(itemPromises)).join('');

    return `
      <div class="section">
        <h3 class="section-title">${escapeHtml(section.name)}</h3>
        ${itemsHtml}
      </div>
    `;
  });

  const sectionsHtml = (await Promise.all(sectionPromises)).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inspection Report</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 12mm 20mm 12mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #111827;
          background: #FFFFFF;
          padding: 20px 24px;
          max-width: 210mm;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid ${primaryColor};
        }

        .logo {
          max-height: 40px;
          max-width: 120px;
          object-fit: contain;
          margin-right: 12px;
        }

        .header-with-logo {
          display: flex;
          align-items: center;
        }

        .header-left h1 {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 2px;
        }

        .header-left .subtitle {
          font-size: 12px;
          color: #6B7280;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          background-color: ${statusColor}20;
          color: ${statusColor};
          white-space: nowrap;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          background-color: #F9FAFB;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          border: 1px solid #E5E7EB;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 9px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 1px;
        }

        .info-value {
          font-size: 11px;
          font-weight: 500;
          color: #111827;
        }

        .section {
          margin-bottom: 16px;
          page-break-inside: auto;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: ${primaryColor};
          padding: 6px 8px;
          background-color: ${primaryColor}10;
          border-left: 3px solid ${primaryColor};
          margin-bottom: 8px;
          page-break-after: avoid;
        }

        .item {
          background-color: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          padding: 8px 10px;
          margin-bottom: 6px;
          page-break-inside: avoid;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .item-label {
          font-size: 11px;
          color: #111827;
          flex: 1;
        }

        .required {
          color: #DC2626;
          margin-left: 2px;
          font-size: 10px;
        }

        .item-value {
          font-size: 11px;
          font-weight: 600;
          text-align: right;
          flex-shrink: 0;
        }

        .notes {
          margin-top: 6px;
          padding: 6px 8px;
          background-color: #F9FAFB;
          border-radius: 3px;
          font-size: 10px;
          color: #374151;
          border-left: 2px solid #D1D5DB;
        }

        .severity {
          margin-top: 6px;
          font-size: 10px;
        }

        .signature-container {
          margin-top: 8px;
          padding: 12px;
          background-color: #F9FAFB;
          border-radius: 6px;
          text-align: left;
          border: 1px solid #E5E7EB;
        }

        .signature-image {
          max-width: 280px;
          max-height: 120px;
          object-fit: contain;
        }

        .photo-gallery {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
        }

        .photo-image {
          width: 180px;
          height: 135px;
          border-radius: 6px;
          border: 1px solid #E5E7EB;
          object-fit: cover;
        }

        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          font-size: 9px;
          color: #9CA3AF;
        }

        .draft-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 100px;
          font-weight: 700;
          color: rgba(220, 38, 38, 0.08);
          pointer-events: none;
          z-index: 0;
          letter-spacing: 12px;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .header {
            page-break-after: avoid;
          }

          .info-grid {
            page-break-after: avoid;
          }

          .section {
            page-break-inside: auto;
          }

          .section-title {
            page-break-after: avoid;
          }

          .item {
            page-break-inside: avoid;
            orphans: 3;
            widows: 3;
          }

          .photo-gallery {
            page-break-inside: avoid;
          }

          .signature-container {
            page-break-inside: avoid;
          }

          .footer {
            page-break-before: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${report.status !== 'submitted' ? '<div class="draft-watermark">DRAFT</div>' : ''}
      <div class="header">
        <div class="header-with-logo">
          ${logoUrl ? `<img src="${getImageSrc(logoUrl, imageDataMap)}" alt="${escapeHtml(brandName)} logo" class="logo" />` : ''}
          <div class="header-left">
            <h1>${escapeHtml(report.template?.name || 'Inspection Report')}</h1>
            <div class="subtitle">${escapeHtml(report.record?.name || 'Unknown Record')}</div>
          </div>
        </div>
        <div class="status-badge">${statusText}</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Record</span>
          <span class="info-value">${escapeHtml(report.record?.name || 'Unknown')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Inspector</span>
          <span class="info-value">${escapeHtml(report.user_profile?.full_name || 'Unknown')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Started</span>
          <span class="info-value">${formatDateTime(report.started_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${report.submitted_at ? 'Submitted' : 'Last Updated'}</span>
          <span class="info-value">${formatDateTime(report.submitted_at || report.started_at)}</span>
        </div>
      </div>

      ${sectionsHtml}

      <div class="footer">
        Generated by ${escapeHtml(brandName)} • ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;
}
