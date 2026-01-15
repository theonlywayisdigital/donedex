import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName } from '../../components/ui';
import { fetchRecordTypes } from '../../services/recordTypes';
import { supabase } from '../../services/supabase';
import type { RecordType } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'RecordTypesList'>;

interface RecordTypeWithCount extends RecordType {
  record_count: number;
}

const { width } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (width - spacing.md * 2 - CARD_GAP) / 2;

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

  const renderRecordTypeCard = (recordType: RecordTypeWithCount) => (
    <TouchableOpacity
      key={recordType.id}
      style={styles.card}
      onPress={() => handleTypePress(recordType)}
      onLongPress={() => handleEditType(recordType)}
    >
      <View style={[styles.iconContainer, { backgroundColor: recordType.color + '20' }]}>
        <Icon
          name={getIconName(recordType.icon)}
          size={32}
          color={recordType.color}
        />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {recordType.name}
      </Text>
      <Text style={styles.cardCount}>
        {recordType.record_count} {recordType.record_count === 1 ? recordType.name_singular.toLowerCase() : recordType.name.toLowerCase()}
      </Text>
    </TouchableOpacity>
  );

  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.card, styles.addCard]}
      onPress={handleAddType}
    >
      <View style={[styles.iconContainer, styles.addIconContainer]}>
        <Icon name="folder-plus" size={32} color={colors.primary.DEFAULT} />
      </View>
      <Text style={styles.addCardText}>Add Type</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.grid}>
        {recordTypes.map(renderRecordTypeCard)}
        {renderAddCard()}
      </View>

      <Text style={styles.hint}>
        Long press a type to edit it
      </Text>
    </ScrollView>
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
  scrollContent: {
    padding: spacing.md,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  addCard: {
    borderStyle: 'dashed',
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addIconContainer: {
    backgroundColor: colors.white,
  },
  cardName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  addCardText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
    marginTop: spacing.xs,
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
  hint: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
