import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ReportWithDetails, ReportResponse, getPhotoUrl, getSignatureUrl } from './reports';
import { TemplateWithSections } from './templates';

interface ExportOptions {
  report: ReportWithDetails;
  template: TemplateWithSections;
  responses: Map<string, ReportResponse>;
}

/**
 * Format a date string for display
 */
function formatDateTime(dateString: string): string {
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
 * Get display text and color for a response value
 */
function getResponseDisplay(
  value: string | null | undefined,
  itemType: string
): { text: string; color: string; isSignature?: boolean; signatureUrl?: string } {
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
        return { text: `${numRating}/10`, color: '#0F4C5C' };
      }
      return { text: value, color: '#111827' };

    case 'slider':
      const sliderVal = parseFloat(value);
      if (!isNaN(sliderVal)) {
        return { text: `${Math.round(sliderVal)}%`, color: '#0F4C5C' };
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
        const signatureUrl = getSignatureUrl(parsed.path);
        const signerText = parsed.signerName ? ` (${parsed.signerName})` : '';
        return {
          text: `Signature captured${signerText}`,
          color: '#059669',
          isSignature: true,
          signatureUrl,
        };
      } catch {
        return {
          text: 'Signature captured',
          color: '#059669',
          isSignature: true,
          signatureUrl: getSignatureUrl(value),
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
          signatureUrl: hasSignature ? getSignatureUrl(parsed.signaturePath) : undefined,
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

    // Media types (photo)
    case 'photo':
    case 'photo_before_after':
    case 'annotated_photo':
      return { text: 'Media attached', color: '#059669' };

    // Instruction (display only, no value)
    case 'instruction':
      return { text: '(Information)', color: '#6B7280' };

    default:
      return { text: value, color: '#111827' };
  }
}

/**
 * Generate HTML content for the PDF
 */
function generateHtml(options: ExportOptions): string {
  const { report, template, responses } = options;

  const statusColor = report.status === 'submitted' ? '#059669' : '#D97706';
  const statusText = report.status === 'submitted' ? 'Completed' : 'Draft';

  // Generate sections HTML
  const sectionsHtml = template.template_sections
    .map((section) => {
      const itemsHtml = section.template_items
        .map((item) => {
          const response = responses.get(item.id);
          const display = getResponseDisplay(response?.response_value, item.item_type);

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
            signatureHtml = `
              <div class="signature-container">
                <img src="${display.signatureUrl}" alt="Signature" class="signature-image" />
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
              ${notesHtml}
              ${severityHtml}
            </div>
          `;
        })
        .join('');

      return `
        <div class="section">
          <h3 class="section-title">${escapeHtml(section.name)}</h3>
          ${itemsHtml}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inspection Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #111827;
          padding: 20px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #0F4C5C;
        }

        .header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .header-left .subtitle {
          font-size: 14px;
          color: #6B7280;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          background-color: ${statusColor}20;
          color: ${statusColor};
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background-color: #F9FAFB;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 11px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .info-value {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          padding-bottom: 8px;
          border-bottom: 1px solid #E5E7EB;
          margin-bottom: 12px;
        }

        .item {
          background-color: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .item-label {
          font-size: 13px;
          color: #111827;
        }

        .required {
          color: #DC2626;
          margin-left: 2px;
        }

        .item-value {
          font-size: 13px;
          font-weight: 600;
        }

        .notes {
          margin-top: 8px;
          padding: 8px;
          background-color: #F9FAFB;
          border-radius: 4px;
          font-size: 12px;
          color: #374151;
        }

        .severity {
          margin-top: 8px;
          font-size: 12px;
        }

        .signature-container {
          margin-top: 8px;
          padding: 8px;
          background-color: #F9FAFB;
          border-radius: 4px;
          text-align: center;
        }

        .signature-image {
          max-width: 200px;
          max-height: 80px;
          object-fit: contain;
        }

        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          font-size: 11px;
          color: #9CA3AF;
        }

        @media print {
          body {
            padding: 0;
          }

          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>${escapeHtml(report.template?.name || 'Inspection Report')}</h1>
          <div class="subtitle">${escapeHtml(report.record?.name || 'Unknown Record')}</div>
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
        Generated by Donedex • ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
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
 * Generate and share a PDF report
 */
export async function exportReportToPdf(options: ExportOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const html = generateHtml(options);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not available on this device' };
    }

    // Share the PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Inspection Report',
      UTI: 'com.adobe.pdf',
    });

    return { success: true };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PDF',
    };
  }
}

/**
 * Print a report directly
 */
export async function printReport(options: ExportOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const html = generateHtml(options);

    await Print.printAsync({
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Error printing report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to print report',
    };
  }
}
