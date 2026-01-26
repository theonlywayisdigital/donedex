import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchTemplates, deleteTemplate, Template } from '../../services/templates';
import { useAuthStore } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplateList'>;

export function TemplateListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is admin/owner (can create/edit templates)
  const userRole = useAuthStore((state) => state.role);
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase().trim();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const loadTemplates = useCallback(async () => {
    const { data, error } = await fetchTemplates();
    if (error) {
      console.error('Error loading templates:', error.message);
    } else {
      setTemplates(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTemplates();
  };

  const handleCreateTemplate = () => {
    navigation.navigate('NewTemplate');
  };

  const handleViewTemplate = (templateId: string) => {
    navigation.navigate('TemplateDetail', { templateId });
  };

  const handleEditTemplate = (templateId: string) => {
    navigation.navigate('TemplateEditor', { templateId });
  };

  const handlePreviewTemplate = (templateId: string) => {
    console.log('[TemplateListScreen] Navigating to preview:', templateId);
    navigation.navigate('TemplatePreview', { templateId });
  };

  const handleDeleteTemplate = (template: Template) => {
    showDestructiveConfirm(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      async () => {
        const { error } = await deleteTemplate(template.id);
        if (error) {
          showNotification('Error', error.message);
        } else {
          loadTemplates();
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const renderTemplate = ({ item }: { item: Template }) => (
    <View style={styles.templateCard}>
      <TouchableOpacity
        style={styles.templateContent}
        onPress={() => handleViewTemplate(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.templateHeader}>
          <Text style={styles.templateName}>{item.name}</Text>
          <View
            style={[
              styles.statusBadge,
              item.is_published ? styles.statusPublished : styles.statusDraft,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.is_published ? styles.statusTextPublished : styles.statusTextDraft,
              ]}
            >
              {item.is_published ? 'Published' : 'Draft'}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text style={styles.templateDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.templateFooter}>
          <Text style={styles.templateMeta}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePreviewTemplate(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="eye" size={16} color={colors.primary.DEFAULT} />
          <Text style={styles.actionButtonText}>Preview</Text>
        </TouchableOpacity>
        {isAdmin && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditTemplate(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="edit" size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteTemplate(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="trash-2" size={16} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => {
    // Check if search is applied
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No templates found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different search term
          </Text>
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>Clear search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="layout-template" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No templates yet</Text>
        <Text style={styles.emptySubtitle}>
          {isAdmin
            ? 'Create your first inspection template to get started'
            : 'No templates have been created yet. Contact an admin to create templates.'}
        </Text>
        {isAdmin && (
          <TouchableOpacity style={styles.emptyButton} onPress={handleCreateTemplate}>
            <Text style={styles.emptyButtonText}>Create Template</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Icon name="search" size={20} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
      {filteredTemplates.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {templates.length > 0 && renderSearchBar()}
      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />
      {templates.length > 0 && isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateTemplate}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
  searchContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  templateCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  templateContent: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templateName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusPublished: {
    backgroundColor: colors.success + '20',
  },
  statusDraft: {
    backgroundColor: colors.neutral[100],
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  statusTextPublished: {
    color: colors.success,
  },
  statusTextDraft: {
    color: colors.text.secondary,
  },
  templateDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  templateMeta: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[50],
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  deleteButton: {
    backgroundColor: colors.danger + '10',
  },
  deleteButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  clearSearchButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  clearSearchText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.elevated,
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontWeight: fontWeight.regular,
    marginTop: -2,
  },
});
