import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ReportsStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName, VideoPlayer } from '../../components/ui';
import {
  fetchReportById,
  fetchReportResponses,
  ReportWithDetails,
  ReportResponse,
  getPhotoUrl,
  getVideoUrl,
  getSignatureUrl,
} from '../../services/reports';
import { fetchTemplateWithSections, TemplateWithSections } from '../../services/templates';
import { exportReportToPdf, printReport } from '../../services/pdfExport/index';
import { fetchBrandingContext } from '../../services/branding';
import { BrandingContext } from '../../types/branding';

type ScreenRouteProp = RouteProp<ReportsStackParamList, 'ReportDetail'>;

interface ResponseWithPhotos extends ReportResponse {
  photos?: { id: string; storage_path: string }[];
}

export function ReportDetailScreen() {
  const route = useRoute<ScreenRouteProp>();
  const { reportId } = route.params;

  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [template, setTemplate] = useState<TemplateWithSections | null>(null);
  const [responses, setResponses] = useState<Map<string, ResponseWithPhotos>>(new Map());
  const [branding, setBranding] = useState<BrandingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load report
      const { data: reportData, error: reportError } = await fetchReportById(reportId);
      if (reportError || !reportData) {
        console.error('Error loading report:', reportError?.message);
        return;
      }
      setReport(reportData);

      // Load template structure
      const { data: templateData } = await fetchTemplateWithSections(reportData.template_id);
      setTemplate(templateData);

      // Load responses
      const { data: responsesData } = await fetchReportResponses(reportId);
      const responsesMap = new Map<string, ResponseWithPhotos>();
      responsesData.forEach((r) => {
        responsesMap.set(r.template_item_id, r);
      });
      setResponses(responsesMap);

      // Load branding for PDF export
      const { data: brandingData } = await fetchBrandingContext(reportData.organisation_id);
      if (brandingData) {
        setBranding(brandingData);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = async () => {
    if (!report || !template) return;

    setExporting(true);
    const result = await exportReportToPdf({
      report,
      template,
      responses: responses as Map<string, ReportResponse>,
      branding: branding || undefined,
    });
    setExporting(false);

    if (!result.success) {
      showNotification('Export Failed', result.error || 'Unable to export PDF');
    }
  };

  const handlePrint = async () => {
    if (!report || !template) return;

    setExporting(true);
    const result = await printReport({
      report,
      template,
      responses: responses as Map<string, ReportResponse>,
      branding: branding || undefined,
    });
    setExporting(false);

    if (!result.success) {
      showNotification('Print Failed', result.error || 'Unable to print report');
    }
  };

  const getResponseDisplay = (response: ResponseWithPhotos | undefined, itemType: string): { text: string; color: string; icon?: IconName } => {
    if (!response || !response.response_value) {
      return { text: 'Not answered', color: colors.text.tertiary };
    }

    const value = response.response_value;

    switch (itemType) {
      case 'pass_fail':
        return value === 'pass'
          ? { text: 'Pass', color: colors.success, icon: 'check-circle' }
          : { text: 'Fail', color: colors.danger, icon: 'x-circle' };

      case 'yes_no':
        return value === 'yes'
          ? { text: 'Yes', color: colors.success, icon: 'check-circle' }
          : { text: 'No', color: colors.danger, icon: 'x-circle' };

      case 'condition':
        if (value === 'good') return { text: 'Good', color: colors.success, icon: 'check-circle' };
        if (value === 'fair') return { text: 'Fair', color: colors.warning, icon: 'alert-triangle' };
        return { text: 'Poor', color: colors.danger, icon: 'x-circle' };

      case 'severity':
        if (value === 'low') return { text: 'Low', color: colors.success, icon: 'check-circle' };
        if (value === 'medium') return { text: 'Medium', color: colors.warning, icon: 'alert-triangle' };
        return { text: 'High', color: colors.danger, icon: 'x-circle' };

      case 'rating':
        const rating = parseInt(value, 10);
        return { text: `${rating}/5`, color: colors.warning, icon: 'star' };

      case 'datetime':
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return { text: date.toLocaleString(), color: colors.text.primary };
          }
          return { text: value, color: colors.text.primary };
        } catch {
          return { text: value, color: colors.text.primary };
        }

      case 'declaration':
        try {
          const parsed = JSON.parse(value);
          if (parsed.acknowledged) {
            const timestamp = parsed.acknowledgedAt
              ? new Date(parsed.acknowledgedAt).toLocaleString()
              : '';
            return {
              text: `Acknowledged${timestamp ? ` at ${timestamp}` : ''}`,
              color: colors.success,
              icon: 'check-circle',
            };
          }
          return { text: 'Not acknowledged', color: colors.text.tertiary };
        } catch {
          return { text: value, color: colors.text.primary };
        }

      case 'signature':
        // Mark for special rendering
        return { text: '__SIGNATURE__', color: colors.success, icon: 'check-circle' };

      case 'photo':
      case 'photo_before_after':
      case 'annotated_photo':
        return { text: 'Photo captured', color: colors.success, icon: 'camera' };

      case 'video':
        return { text: 'Video captured', color: colors.success, icon: 'video' };

      case 'witness':
        // Mark for special rendering (has name + signature)
        return { text: '__WITNESS__', color: colors.success, icon: 'check-circle' };

      default:
        return { text: value, color: colors.text.primary };
    }
  };

  // Check if value is a base64 image
  const isBase64Image = (value: string | null | undefined): boolean => {
    if (!value) return false;
    return value.startsWith('data:image/');
  };

  // Parse response_value which may be single path or JSON array
  const getMediaPaths = (responseValue: string | null): string[] => {
    if (!responseValue) return [];
    // Skip pending upload placeholders
    if (responseValue.includes('pending upload')) return [];
    try {
      const parsed = JSON.parse(responseValue);
      return Array.isArray(parsed) ? parsed : [responseValue];
    } catch {
      return [responseValue];
    }
  };

  // Check if value is a storage path (not base64 or blob)
  const isStoragePath = (value: string): boolean => {
    return !value.startsWith('data:') && !value.startsWith('blob:') && !value.includes('pending upload');
  };

  const renderResponseValue = (response: ResponseWithPhotos | undefined, itemType: string) => {
    const display = getResponseDisplay(response, itemType);

    // Handle signature with image preview
    if (itemType === 'signature' && response?.response_value) {
      const value = response.response_value;

      // Try to get signature image URL
      let signatureUri: string | null = null;

      if (isBase64Image(value)) {
        // Direct base64 data
        signatureUri = value;
      } else {
        // Try parsing as JSON (may contain path and signerName)
        try {
          const parsed = JSON.parse(value);
          if (parsed.path) {
            signatureUri = getSignatureUrl(parsed.path);
          }
        } catch {
          // Not JSON, treat as storage path directly
          if (isStoragePath(value)) {
            signatureUri = getSignatureUrl(value);
          }
        }
      }

      if (signatureUri) {
        return (
          <View style={styles.signatureContainer}>
            <Image
              source={{ uri: signatureUri }}
              style={styles.signatureImage}
              resizeMode="contain"
            />
            <View style={styles.responseValueContainer}>
              <Icon name="check-circle" size={16} color={colors.success} style={styles.responseIcon} />
              <Text style={[styles.responseValue, { color: colors.success }]}>Captured</Text>
            </View>
          </View>
        );
      }

      // Fallback to text indicator
      return (
        <View style={styles.responseValueContainer}>
          <Icon name="check-circle" size={18} color={colors.success} style={styles.responseIcon} />
          <Text style={[styles.responseValue, { color: colors.success }]}>Signature captured</Text>
        </View>
      );
    }

    // Handle witness type (name + signature)
    if (itemType === 'witness' && response?.response_value) {
      try {
        const parsed = JSON.parse(response.response_value);
        const hasSignature = !!parsed.signaturePath;
        const signatureUri = hasSignature ? getSignatureUrl(parsed.signaturePath) : null;

        return (
          <View style={styles.witnessContainer}>
            {parsed.name && (
              <Text style={styles.witnessName}>{parsed.name}</Text>
            )}
            {signatureUri && (
              <View style={styles.signatureContainer}>
                <Image
                  source={{ uri: signatureUri }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {!signatureUri && !parsed.name && (
              <View style={styles.responseValueContainer}>
                <Text style={[styles.responseValue, { color: colors.text.tertiary }]}>Not completed</Text>
              </View>
            )}
          </View>
        );
      } catch {
        return (
          <View style={styles.responseValueContainer}>
            <Text style={[styles.responseValue, { color: colors.text.primary }]}>{response.response_value}</Text>
          </View>
        );
      }
    }

    // Handle photo types (photo, photo_before_after, annotated_photo)
    const isPhotoType = ['photo', 'photo_before_after', 'annotated_photo'].includes(itemType);
    if (isPhotoType && response?.response_value) {
      const paths = getMediaPaths(response.response_value);
      if (paths.length > 0) {
        return (
          <View style={styles.photoGallery}>
            {paths.map((path, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedPhoto(path)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: getPhotoUrl(path) }}
                  style={styles.photoThumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        );
      }
      // Fallback for pending uploads or invalid paths
      return (
        <View style={styles.responseValueContainer}>
          <Icon name="camera" size={18} color={colors.success} style={styles.responseIcon} />
          <Text style={[styles.responseValue, { color: colors.success }]}>Photo captured</Text>
        </View>
      );
    }

    // Handle video with player
    if (itemType === 'video' && response?.response_value) {
      const paths = getMediaPaths(response.response_value);
      if (paths.length > 0) {
        return (
          <View style={styles.videoContainer}>
            <View style={styles.responseValueContainer}>
              <Icon name="video" size={18} color={colors.success} style={styles.responseIcon} />
              <Text style={[styles.responseValue, { color: colors.success }]}>
                {paths.length === 1 ? 'Video captured' : `${paths.length} videos captured`}
              </Text>
            </View>
            {paths.map((path, index) => {
              const videoUrl = isStoragePath(path) ? getVideoUrl(path) : path;
              return (
                <View key={index} style={styles.videoPlayerWrapper}>
                  <VideoPlayer uri={videoUrl} thumbnailMode />
                </View>
              );
            })}
          </View>
        );
      }
      // Fallback for pending uploads
      return (
        <View style={styles.responseValueContainer}>
          <Icon name="video" size={18} color={colors.success} style={styles.responseIcon} />
          <Text style={[styles.responseValue, { color: colors.success }]}>Video captured</Text>
        </View>
      );
    }

    if (itemType === 'multi_select' && response?.response_value) {
      try {
        const values = JSON.parse(response.response_value);
        return (
          <View style={styles.multiSelectContainer}>
            {values.map((v: string, i: number) => (
              <View key={i} style={styles.multiSelectChip}>
                <Text style={styles.multiSelectChipText}>{v}</Text>
              </View>
            ))}
          </View>
        );
      } catch {
        return <Text style={[styles.responseValue, { color: display.color }]}>{display.text}</Text>;
      }
    }

    return (
      <View style={styles.responseValueContainer}>
        {display.icon && (
          <Icon name={display.icon} size={18} color={display.color} style={styles.responseIcon} />
        )}
        <Text style={[styles.responseValue, { color: display.color }]}>{display.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Report not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Report Header */}
        <View style={styles.header}>
          <Text style={styles.templateName}>{report.template?.name || 'Unknown Template'}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  (report.status === 'submitted' ? colors.success : colors.warning) + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: report.status === 'submitted' ? colors.success : colors.warning },
              ]}
            >
              {report.status === 'submitted' ? 'Completed' : 'Draft'}
            </Text>
          </View>
        </View>

        {/* Report Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Record</Text>
            <Text style={styles.infoValue}>{report.record?.name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inspector</Text>
            <Text style={styles.infoValue}>{report.user_profile?.full_name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Started</Text>
            <Text style={styles.infoValue}>{formatDateTime(report.started_at)}</Text>
          </View>
          {report.submitted_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted</Text>
              <Text style={styles.infoValue}>{formatDateTime(report.submitted_at)}</Text>
            </View>
          )}
        </View>

        {/* Export Actions */}
        <View style={styles.exportActions}>
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.exportButtonText}>Export PDF</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.printButton, exporting && styles.exportButtonDisabled]}
            onPress={handlePrint}
            disabled={exporting}
          >
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>
        </View>

        {/* Sections and Responses */}
        {template?.template_sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionName}>{section.name}</Text>

            {section.template_items.map((item) => {
              const response = responses.get(item.id);

              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {item.is_required && <Text style={styles.requiredIndicator}>*</Text>}
                  </View>

                  {renderResponseValue(response, item.item_type)}

                  {response?.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{response.notes}</Text>
                    </View>
                  )}

                  {response?.severity && (
                    <View style={styles.severityContainer}>
                      <Text style={styles.severityLabel}>Severity:</Text>
                      <Text
                        style={[
                          styles.severityValue,
                          {
                            color:
                              response.severity === 'low'
                                ? colors.success
                                : response.severity === 'medium'
                                ? colors.warning
                                : colors.danger,
                          },
                        ]}
                      >
                        {response.severity.charAt(0).toUpperCase() + response.severity.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Photo Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <TouchableOpacity
          style={styles.photoModal}
          activeOpacity={1}
          onPress={() => setSelectedPhoto(null)}
        >
          {selectedPhoto && (
            <Image
              source={{ uri: getPhotoUrl(selectedPhoto) }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.danger,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  templateName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  printButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  printButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  requiredIndicator: {
    fontSize: fontSize.body,
    color: colors.danger,
    marginLeft: spacing.xs,
  },
  responseValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseIcon: {
    marginRight: spacing.xs,
  },
  responseValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  signatureContainer: {
    alignItems: 'flex-start',
  },
  signatureImage: {
    width: 250,
    height: 100,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginBottom: spacing.xs,
  },
  witnessContainer: {
    alignItems: 'flex-start',
  },
  witnessName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  videoContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  videoPlayerWrapper: {
    marginTop: spacing.sm,
    width: '100%',
  },
  photoGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  multiSelectChip: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  multiSelectChipText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
  },
  notesContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.neutral[50],
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  notesLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  severityLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  severityValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '100%',
    height: '80%',
  },
});
