import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName, ProBadge, UpgradeModal } from '../../components/ui';
import { Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useBillingStore } from '../../store/billingStore';
import {
  fetchLibraryRecordTypesWithTemplates,
  copyLibraryTemplateToOrg,
  LibraryTemplateSection,
} from '../../services/library';
import type { LibraryRecordType, LibraryTemplate } from '../../types';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'NewTemplate'>;

// Map library icon names to our IconName type
const iconNameMap: Record<string, IconName> = {
  'truck': 'truck',
  'map-pin': 'map-pin',
  'building': 'building',
  'wrench': 'wrench',
  'user': 'user',
  'folder-kanban': 'folder-kanban',
  'building-2': 'building-2',
  'heart': 'heart',
  'door-open': 'door-open',
  'calendar': 'calendar',
  'clipboard-list': 'clipboard-list',
  'folder': 'folder',
  'play-circle': 'play-circle',
};

function getIconName(icon: string): IconName {
  return iconNameMap[icon] || 'folder';
}

interface LibraryRecordTypeWithTemplates extends LibraryRecordType {
  library_templates: LibraryTemplate[];
}

export function NewTemplateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { organisation, user } = useAuthStore();
  // Subscribe to billing state to trigger re-render when data loads
  const billing = useBillingStore((state) => state.billing);
  const canUseAITemplates = useBillingStore((state) => state.canUseAITemplates);
  const canUseStarterTemplates = useBillingStore((state) => state.canUseStarterTemplates);

  const [libraryData, setLibraryData] = useState<LibraryRecordTypeWithTemplates[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [upgradeDescription, setUpgradeDescription] = useState('');

  // Calculate feature access - will re-calculate when billing state changes
  const aiTemplatesAllowed = canUseAITemplates();
  const starterTemplatesAllowed = canUseStarterTemplates();

  // Debug logging
  console.log('[NewTemplateScreen] Feature check:', {
    hasBilling: !!billing,
    planName: billing?.current_plan?.name,
    aiTemplatesAllowed,
    starterTemplatesAllowed,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const libraryResult = await fetchLibraryRecordTypesWithTemplates();

    if (!libraryResult.error) {
      setLibraryData(libraryResult.data);
    }

    setLoading(false);
  };

  const handleCreateBlank = () => {
    navigation.replace('TemplateEditor', {});
  };

  const handleCreateWithAI = () => {
    if (aiTemplatesAllowed) {
      navigation.navigate('AITemplateBuilder' as any);
    } else {
      setUpgradeFeature('AI Templates');
      setUpgradeDescription('Create inspection templates with AI by describing what you need. This feature is available on the Pro plan.');
      setShowUpgradeModal(true);
    }
  };

  const handleSelectTemplate = (template: LibraryTemplate) => {
    if (starterTemplatesAllowed) {
      setPreviewTemplate(template);
      setShowPreview(true);
    } else {
      setUpgradeFeature('Starter Templates');
      setUpgradeDescription('Access our library of pre-built inspection templates to get started quickly. This feature is available on the Pro plan.');
      setShowUpgradeModal(true);
    }
  };

  const handleUseTemplate = async () => {
    if (!previewTemplate || !organisation?.id || !user?.id) return;

    setSaving(true);

    // Templates are company-wide, no record type selection needed
    const { data, error } = await copyLibraryTemplateToOrg(
      previewTemplate.id,
      organisation.id,
      user.id
    );

    setSaving(false);
    setShowPreview(false);
    setPreviewTemplate(null);

    if (error) {
      showNotification('Error', error.message);
      return;
    }

    if (data) {
      // Navigate to editor to customize
      navigation.replace('TemplateEditor', { templateId: data.id });
    }
  };

  const getFilteredTemplates = (): LibraryTemplate[] => {
    let templates: LibraryTemplate[];
    if (!selectedCategory) {
      // Return all templates from all categories
      templates = libraryData.flatMap((type) => type.library_templates);
    } else {
      const category = libraryData.find((t) => t.id === selectedCategory);
      templates = category?.library_templates || [];
    }
    // Sort Demo templates to the top
    return templates.sort((a, b) => {
      const aIsDemo = a.record_type_id === 'demo';
      const bIsDemo = b.record_type_id === 'demo';
      if (aIsDemo && !bIsDemo) return -1;
      if (!aIsDemo && bIsDemo) return 1;
      return 0;
    });
  };

  const renderPreviewModal = () => {
    if (!previewTemplate) return null;

    const sections = previewTemplate.sections as unknown as LibraryTemplateSection[];
    const recordType = libraryData.find((t) => t.id === previewTemplate.record_type_id);
    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

    return (
      <Modal visible={showPreview} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.previewCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Preview</Text>
            <TouchableOpacity
              onPress={handleUseTemplate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              ) : (
                <Text style={styles.previewUse}>Use</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewContent}>
            {/* Template info */}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTemplateName}>{previewTemplate.name}</Text>
              {previewTemplate.description && (
                <Text style={styles.previewDescription}>{previewTemplate.description}</Text>
              )}
              <View style={styles.previewMeta}>
                {recordType && (
                  <View style={[styles.previewBadge, { backgroundColor: recordType.color + '20' }]}>
                    <Icon name={getIconName(recordType.icon)} size={14} color={recordType.color} />
                    <Text style={[styles.previewBadgeText, { color: recordType.color }]}>
                      {recordType.name}
                    </Text>
                  </View>
                )}
                <Text style={styles.previewStats}>
                  {sections.length} sections, {totalItems} items
                </Text>
              </View>
            </View>

            {/* Sections preview */}
            {sections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>
                  {section.name} ({section.items.length})
                </Text>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.previewItem}>
                    <Text style={styles.previewItemLabel}>
                      {item.label}
                      {item.is_required && <Text style={styles.required}> *</Text>}
                    </Text>
                    <Text style={styles.previewItemType}>{item.item_type.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Text style={styles.previewHint}>
              You can customize this template after adding it
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  const filteredTemplates = getFilteredTemplates();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Start from scratch */}
      <Text style={styles.sectionTitle}>Start Fresh</Text>
      <TouchableOpacity style={styles.blankButton} onPress={handleCreateBlank}>
        <Icon name="plus" size={24} color={colors.primary.DEFAULT} />
        <View style={styles.blankButtonContent}>
          <Text style={styles.blankButtonTitle}>Blank Template</Text>
          <Text style={styles.blankButtonSubtitle}>Create from scratch</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.aiButton, !aiTemplatesAllowed && styles.buttonDisabled]}
        onPress={handleCreateWithAI}
      >
        <View style={[styles.aiIconContainer, !aiTemplatesAllowed && styles.aiIconDisabled]}>
          <Sparkles size={24} color={aiTemplatesAllowed ? colors.white : colors.neutral[500]} />
        </View>
        <View style={styles.blankButtonContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.blankButtonTitle, !aiTemplatesAllowed && styles.textDisabled]}>
              Create with AI
            </Text>
            {!aiTemplatesAllowed && <ProBadge size="sm" style={styles.proBadge} />}
          </View>
          <Text style={[styles.blankButtonSubtitle, !aiTemplatesAllowed && styles.subtitleDisabled]}>
            Describe what you need
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={aiTemplatesAllowed ? colors.text.tertiary : colors.neutral[300]} />
      </TouchableOpacity>

      {/* Category filter */}
      <View style={styles.filterSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, !starterTemplatesAllowed && styles.sectionTitleDisabled]}>
            Use a Starter Template
          </Text>
          {!starterTemplatesAllowed && <ProBadge size="sm" style={styles.proBadge} />}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === null && styles.filterChipSelected,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === null && styles.filterChipTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {libraryData.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.filterChip,
                selectedCategory === type.id && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedCategory(type.id)}
            >
              <Icon
                name={getIconName(type.icon)}
                size={14}
                color={selectedCategory === type.id ? colors.white : type.color}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === type.id && styles.filterChipTextSelected,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Template list */}
      <View style={styles.templateList}>
        {filteredTemplates.length === 0 ? (
          <Text style={styles.noTemplatesText}>No templates in this category</Text>
        ) : (
          filteredTemplates.map((template) => {
            const recordType = libraryData.find((t) => t.id === template.record_type_id);
            const sections = template.sections as unknown as LibraryTemplateSection[];
            const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
            const isDemo = template.record_type_id === 'demo';

            return (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => handleSelectTemplate(template)}
              >
                <View style={styles.templateCardHeader}>
                  <Text style={styles.templateCardName}>{template.name}</Text>
                  <View style={styles.templateCardBadges}>
                    {isDemo && (
                      <View style={styles.demoBadge}>
                        <Text style={styles.demoBadgeText}>Demo</Text>
                      </View>
                    )}
                    {recordType && (
                      <View style={[styles.templateCardBadge, { backgroundColor: recordType.color + '20' }]}>
                        <Text style={[styles.templateCardBadgeText, { color: recordType.color }]}>
                          {recordType.name}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {template.description && (
                  <Text style={styles.templateCardDescription} numberOfLines={2}>
                    {template.description}
                  </Text>
                )}
                <Text style={styles.templateCardMeta}>
                  {sections.length} sections, {totalItems} items
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {renderPreviewModal()}

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
        description={upgradeDescription}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
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
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  blankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    ...shadows.card,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankButtonContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  blankButtonTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  blankButtonSubtitle: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  // Pro feature gating styles
  buttonDisabled: {
    opacity: 0.7,
    borderColor: colors.neutral[200],
  },
  aiIconDisabled: {
    backgroundColor: colors.neutral[200],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textDisabled: {
    color: colors.neutral[500],
  },
  subtitleDisabled: {
    color: colors.neutral[300],
  },
  proBadge: {
    marginLeft: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitleDisabled: {
    color: colors.neutral[500],
    marginBottom: 0,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterScrollView: {
    marginHorizontal: -spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing.xs,
  },
  filterChipSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  filterChipTextSelected: {
    color: colors.white,
  },
  templateList: {
    gap: spacing.sm,
  },
  templateCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templateCardName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  templateCardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  templateCardBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  templateCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.light,
  },
  demoBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  templateCardDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  templateCardMeta: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  noTemplatesText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  // Preview Modal
  previewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  previewCancel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  previewTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  previewUse: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  previewContent: {
    flex: 1,
    padding: spacing.md,
  },
  previewInfo: {
    marginBottom: spacing.md,
  },
  previewTemplateName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  previewDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  previewBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  previewStats: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  previewSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  previewSectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  previewItemLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  required: {
    color: colors.danger,
  },
  previewItemType: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  previewHint: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
