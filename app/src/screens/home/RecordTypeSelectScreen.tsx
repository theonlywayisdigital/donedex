/**
 * RecordTypeSelectScreen
 * First step in "Start Inspection" flow - select what type of record to inspect
 * Auto-skips if org has only one record type
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Icon, EmptyState } from '../../components/ui';
import { useRecordsStore } from '../../store/recordsStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';
import type { RecordType } from '../../types';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'RecordTypeSelect'>;

export function RecordTypeSelectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { recordTypes, isLoading, fetchRecordTypes } = useRecordsStore();

  useEffect(() => {
    fetchRecordTypes();
  }, [fetchRecordTypes]);

  // Auto-skip if only one record type
  useEffect(() => {
    if (!isLoading && recordTypes.length === 1) {
      // Navigate directly to search with the only record type
      navigation.replace('RecordSearch', { recordTypeId: recordTypes[0].id });
    }
  }, [isLoading, recordTypes, navigation]);

  const handleSelectRecordType = (recordType: RecordType) => {
    navigation.navigate('RecordSearch', { recordTypeId: recordType.id });
  };

  const getRecordTypeIcon = (icon: string | null): string => {
    // Map common icon names or return default
    if (!icon) return 'folder';
    return icon;
  };

  const renderRecordType = ({ item }: { item: RecordType }) => (
    <TouchableOpacity
      style={styles.recordTypeCard}
      onPress={() => handleSelectRecordType(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: item.color ? `${item.color}20` : colors.primary.light },
        ]}
      >
        <Icon
          name={getRecordTypeIcon(item.icon) as 'folder'}
          size={28}
          color={item.color || colors.primary.DEFAULT}
        />
      </View>
      <View style={styles.recordTypeInfo}>
        <Text style={styles.recordTypeName}>{item.name}</Text>
        {item.name_singular && (
          <Text style={styles.recordTypeSingular}>{item.name_singular}</Text>
        )}
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading record types...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (recordTypes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Card>
            <EmptyState
              icon="folder-plus"
              title="No record types"
              description="Your organisation doesn't have any record types set up yet. Contact your administrator."
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Start Inspection</Text>
        <Text style={styles.subtitle}>What are you inspecting today?</Text>
      </View>

      <FlatList
        data={recordTypes}
        keyExtractor={(item) => item.id}
        renderItem={renderRecordType}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  separator: {
    height: spacing.sm,
  },
  recordTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recordTypeInfo: {
    flex: 1,
  },
  recordTypeName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  recordTypeSingular: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
});

export default RecordTypeSelectScreen;
