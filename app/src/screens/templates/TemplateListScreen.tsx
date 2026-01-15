import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { fetchTemplates, deleteTemplate, Template } from '../../services/templates';
import { useAuthStore } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplateList'>;

export function TemplateListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is admin/owner (can create/edit templates)
  const userRole = useAuthStore((state) => state.role);
  const isAdmin = userRole === 'admin' || userRole === 'owner';

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

  const handleEditTemplate = (templateId: string) => {
    navigation.navigate('TemplateEditor', { templateId });
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
    <TouchableOpacity
      style={styles.templateCard}
      onPress={isAdmin ? () => handleEditTemplate(item.id) : undefined}
      onLongPress={isAdmin ? () => handleDeleteTemplate(item) : undefined}
      activeOpacity={isAdmin ? 0.7 : 1}
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
      <Text style={styles.templateMeta}>
        Created {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
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
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
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
