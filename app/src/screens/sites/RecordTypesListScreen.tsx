import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName } from '../../components/ui';
import { fetchRecordTypes, archiveRecordType } from '../../services/recordTypes';
import { supabase } from '../../services/supabase';
import { showDestructiveConfirm, showNotification } from '../../utils/alert';
import type { RecordType } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'RecordTypesList'>;

interface RecordTypeWithCount extends RecordType {
  record_count: number;
}

const isWeb = Platform.OS === 'web';

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
};

function getIconName(icon: string): IconName {
  return iconNameMap[icon] || 'folder';
}

export function RecordTypesListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [recordTypes, setRecordTypes] = useState<RecordTypeWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter record types by search query
  const filteredRecordTypes = useMemo(() => {
    if (!searchQuery.trim()) return recordTypes;
    const query = searchQuery.toLowerCase().trim();
    return recordTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.name_singular.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [recordTypes, searchQuery]);

  const loadRecordTypes = useCallback(async () => {
    const { data: types, error } = await fetchRecordTypes();

    if (error) {
      console.error('Error loading record types:', error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Fetch record counts for each type
    const typesWithCounts = await Promise.all(
      types.map(async (type) => {
        const { count } = await supabase
          .from('records')
          .select('*', { count: 'exact', head: true })
          .eq('record_type_id', type.id)
          .eq('archived', false);

        return {
          ...type,
          record_count: count || 0,
        };
      })
    );

    setRecordTypes(typesWithCounts);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecordTypes();
    }, [loadRecordTypes])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadRecordTypes();
  };

  const handleTypePress = (recordType: RecordTypeWithCount) => {
    navigation.navigate('RecordsList', { recordTypeId: recordType.id });
  };

  const handleAddType = () => {
    navigation.navigate('AddRecordType');
  };

  const handleEditType = (recordType: RecordTypeWithCount) => {
    navigation.navigate('RecordTypeEditor', { recordTypeId: recordType.id });
  };

  const handleDeleteType = (recordType: RecordTypeWithCount) => {
    showDestructiveConfirm(
      'Delete Record Type',
      `Are you sure you want to delete "${recordType.name}"? This will archive the record type and all its records.`,
      async () => {
        const { error } = await archiveRecordType(recordType.id);
        if (error) {
          showNotification('Error', error.message);
        } else {
          showNotification('Deleted', `${recordType.name} has been deleted.`);
          loadRecordTypes();
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const renderRecordTypeCard = (recordType: RecordTypeWithCount) => (
    <View key={recordType.id} style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => handleTypePress(recordType)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: recordType.color + '20' }]}>
          <Icon
            name={getIconName(recordType.icon)}
            size={24}
            color={recordType.color}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {recordType.name}
          </Text>
          <Text style={styles.cardCount}>
            {recordType.record_count} {recordType.record_count === 1 ? recordType.name_singular.toLowerCase() : recordType.name.toLowerCase()}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditType(recordType)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="edit" size={14} color={colors.primary.DEFAULT} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteType(recordType)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="trash-2" size={14} color={colors.danger} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.card, styles.addCard]}
      onPress={handleAddType}
    >
      <View style={[styles.iconContainer, styles.addIconContainer]}>
        <Icon name="folder-plus" size={24} color={colors.primary.DEFAULT} />
      </View>
      <Text style={styles.addCardText}>Add Record Type</Text>
      <View style={styles.addCardSpacer} />
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    // Different empty state for search vs no record types
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={64} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different search term
          </Text>
          <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>Clear search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="folder" size={64} color={colors.neutral[300]} />
        <Text style={styles.emptyTitle}>No Record Types</Text>
        <Text style={styles.emptySubtitle}>
          Create your first record type to start organizing your inspections
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddType}>
          <Text style={styles.emptyButtonText}>Add Record Type</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Icon name="search" size={20} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search record types..."
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
      {recordTypes.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredRecordTypes.length} of {recordTypes.length} {recordTypes.length === 1 ? 'type' : 'types'}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading record types...</Text>
      </View>
    );
  }

  if (recordTypes.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderEmpty()}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredRecordTypes.length === 0 ? (
          renderEmpty()
        ) : (
          <View style={styles.grid}>
            {filteredRecordTypes.map(renderRecordTypeCard)}
            {!searchQuery.trim() && renderAddCard()}
          </View>
        )}
      </ScrollView>
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
    ...(isWeb && { outlineStyle: 'none' } as any),
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  grid: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderStyle: 'dashed',
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  addCardSpacer: {
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconContainer: {
    backgroundColor: colors.white,
  },
  cardName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  cardCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  addCardText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
    width: '100%',
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
});
