import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Icon, FullScreenLoader } from '../../components/ui';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type TemplatePickerNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'TemplatePicker'>;

interface TemplateWithRecordType {
  id: string;
  name: string;
  description: string | null;
  record_type_id: string | null;
  record_type: {
    id: string;
    name: string;
    name_singular: string;
    icon: string | null;
    color: string | null;
  } | null;
}

interface TemplateSection {
  title: string;
  icon: string;
  color: string;
  recordTypeId: string | null;
  data: TemplateWithRecordType[];
}

export function TemplatePickerScreen() {
  const navigation = useNavigation<TemplatePickerNavigationProp>();
  const [templates, setTemplates] = useState<TemplateWithRecordType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('templates')
        .select(`
          id,
          name,
          description,
          record_type_id,
          record_type:record_types (
            id,
            name,
            name_singular,
            icon,
            color
          )
        `)
        .eq('is_published', true)
        .order('name', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setTemplates([]);
      } else {
        setTemplates((data as TemplateWithRecordType[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and group templates by record type
  const sections = useMemo(() => {
    let filtered = templates;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.record_type?.name.toLowerCase().includes(query)
      );
    }

    // Group by record type
    const grouped: Record<string, TemplateSection> = {};

    filtered.forEach((template) => {
      const key = template.record_type_id || 'general';
      const recordType = template.record_type;

      if (!grouped[key]) {
        grouped[key] = {
          title: recordType?.name || 'General Templates',
          icon: recordType?.icon || 'layout-template',
          color: recordType?.color || colors.primary.DEFAULT,
          recordTypeId: template.record_type_id,
          data: [],
        };
      }
      grouped[key].data.push(template);
    });

    // Sort sections alphabetically, with "General Templates" last
    return Object.values(grouped).sort((a, b) => {
      if (a.title === 'General Templates') return 1;
      if (b.title === 'General Templates') return -1;
      return a.title.localeCompare(b.title);
    });
  }, [templates, searchQuery]);

  const handleTemplateSelect = (template: TemplateWithRecordType) => {
    navigation.navigate('RecordForTemplate', {
      templateId: template.id,
      templateName: template.name,
      recordTypeId: template.record_type_id || undefined,
    });
  };

  const handlePreview = (templateId: string) => {
    navigation.navigate('TemplatePreview', { templateId });
  };

  const renderSectionHeader = ({ section }: { section: TemplateSection }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: `${section.color}15` }]}>
        <Icon name={section.icon as never} size={18} color={section.color} />
      </View>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderTemplate = ({ item }: { item: TemplateWithRecordType }) => (
    <View style={styles.templateCard}>
      <Card style={styles.templateCardInner}>
        <TouchableOpacity
          style={styles.templateContent}
          onPress={() => handleTemplateSelect(item)}
          activeOpacity={0.7}
        >
          <Icon name="file-text" size={24} color={colors.primary.DEFAULT} />
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.templateDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => handlePreview(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="eye" size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderEmpty = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Templates Found</Text>
          <Text style={styles.emptyText}>
            {`Try a different search term or clear the search to see all templates.`}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="file-text" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No Templates Available</Text>
        <Text style={styles.emptyText}>
          No inspection templates have been published yet. Contact your
          administrator to create and publish templates.
        </Text>
      </View>
    );
  };

  if (isLoading && templates.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FullScreenLoader message="Loading templates..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose a Template</Text>
        <Text style={styles.headerSubtitle}>
          Select a template to start an inspection
        </Text>
      </View>

      {/* Search Bar */}
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
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTemplates}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchTemplates}
              colors={[colors.primary.DEFAULT]}
            />
          }
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        />
      )}
    </SafeAreaView>
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
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  sectionSeparator: {
    height: spacing.sm,
  },
  templateCard: {
    marginBottom: spacing.sm,
  },
  templateCardInner: {
    padding: spacing.md,
  },
  templateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  templateDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.xs,
  },
  previewButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
