import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import {
  fetchTemplateWithSections,
  type TemplateWithSections,
  type TemplateSectionWithItems,
  type TemplateItem,
} from '../../services/templates';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplateDetail'>;
type RouteType = RouteProp<TemplatesStackParamList, 'TemplateDetail'>;

// Map item types to display names
const ITEM_TYPE_LABELS: Record<string, string> = {
  checkbox: 'Pass/Fail',
  text: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  photo: 'Photo',
  signature: 'Signature',
  datetime: 'Date/Time',
  rating: 'Rating',
  textarea: 'Long Text',
  counter: 'Counter',
  measurement: 'Measurement',
  checklist: 'Checklist',
  media: 'Media',
  expirydate: 'Expiry Date',
  declaration: 'Declaration',
  instruction: 'Instruction',
  repeater: 'Repeater',
  asset_lookup: 'Asset Lookup',
};

// Map item types to icons
const ITEM_TYPE_ICONS: Record<string, string> = {
  checkbox: 'check-circle',
  text: 'type',
  number: 'hash',
  dropdown: 'chevron-down',
  photo: 'camera',
  signature: 'pen-tool',
  datetime: 'calendar',
  rating: 'star',
  textarea: 'align-left',
  counter: 'plus-circle',
  measurement: 'ruler',
  checklist: 'list',
  media: 'image',
  expirydate: 'clock',
  declaration: 'file-check',
  instruction: 'info',
  repeater: 'copy',
  asset_lookup: 'search',
};

export function TemplateDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { templateId } = route.params;

  const [template, setTemplate] = useState<TemplateWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin/owner
  const userRole = useAuthStore((state) => state.role);
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  const loadTemplate = useCallback(async () => {
    const { data, error: loadError } = await fetchTemplateWithSections(templateId);
    if (loadError) {
      setError(loadError.message);
    } else {
      setTemplate(data);
      if (data) {
        navigation.setOptions({ title: data.name });
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [templateId, navigation]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTemplate();
  };

  const handleEdit = () => {
    navigation.navigate('TemplateEditor', { templateId });
  };

  const handlePreview = () => {
    navigation.navigate('TemplatePreview', { templateId });
  };

  const renderItem = (item: TemplateItem, index: number) => {
    const iconName = ITEM_TYPE_ICONS[item.item_type] || 'help-circle';
    const typeLabel = ITEM_TYPE_LABELS[item.item_type] || item.item_type;

    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemIcon}>
          <Icon name={iconName as 'folder'} size={18} color={colors.primary.DEFAULT} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemLabel}>{item.label}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemType}>{typeLabel}</Text>
            {item.is_required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
            {item.photo_rule !== 'never' && (
              <View style={styles.photoBadge}>
                <Icon name="camera" size={12} color={colors.text.secondary} />
                <Text style={styles.photoText}>
                  {item.photo_rule === 'always' ? 'Photo required' : 'Photo on fail'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSection = (section: TemplateSectionWithItems, index: number) => (
    <View key={section.id} style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionName}>{section.name}</Text>
        <Text style={styles.sectionCount}>
          {section.template_items?.length || 0} {section.template_items?.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <View style={styles.sectionItems}>
        {section.template_items?.map(renderItem)}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading template...</Text>
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Error loading template</Text>
        <Text style={styles.errorText}>{error || 'Template not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTemplate}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.templateName}>{template.name}</Text>
            <View style={[
              styles.statusBadge,
              template.is_published ? styles.statusPublished : styles.statusDraft
            ]}>
              <Text style={[
                styles.statusText,
                template.is_published ? styles.statusTextPublished : styles.statusTextDraft
              ]}>
                {template.is_published ? 'Published' : 'Draft'}
              </Text>
            </View>
          </View>
          {template.description && (
            <Text style={styles.templateDescription}>{template.description}</Text>
          )}
          <View style={styles.templateMeta}>
            <Text style={styles.metaText}>
              {template.template_sections?.length || 0} sections
            </Text>
            <Text style={styles.metaDot}>-</Text>
            <Text style={styles.metaText}>
              {template.template_sections?.reduce((acc, s) => acc + (s.template_items?.length || 0), 0) || 0} items
            </Text>
            <Text style={styles.metaDot}>-</Text>
            <Text style={styles.metaText}>
              Created {new Date(template.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Sections */}
        {template.template_sections?.length === 0 ? (
          <View style={styles.emptySections}>
            <Icon name="list" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No sections yet</Text>
            <Text style={styles.emptyText}>
              {isAdmin ? 'Edit this template to add sections and items.' : 'This template has no sections.'}
            </Text>
          </View>
        ) : (
          template.template_sections?.map(renderSection)
        )}
      </ScrollView>

      {/* Edit Button for Admins */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.previewFab} onPress={handlePreview}>
          <Icon name="eye" size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.previewFabText}>Preview</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity style={styles.editFab} onPress={handleEdit}>
            <Icon name="edit" size={20} color={colors.white} />
            <Text style={styles.editFabText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  templateName: {
    flex: 1,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusPublished: {
    backgroundColor: colors.success + '20',
  },
  statusDraft: {
    backgroundColor: colors.warning + '20',
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  statusTextPublished: {
    color: colors.success,
  },
  statusTextDraft: {
    color: colors.warning,
  },
  templateDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  metaDot: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  sectionItems: {
    padding: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
    marginBottom: spacing.xs,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  itemType: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  requiredBadge: {
    backgroundColor: colors.danger + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  photoText: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  emptySections: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    ...shadows.elevated,
  },
  previewFabText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  editFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    ...shadows.elevated,
  },
  editFabText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
