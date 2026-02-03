import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui';
import { useRecordsStore } from '../../store/recordsStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';
import type { Record as RecordModel } from '../../types';

type SiteListNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'SiteList'>;

export function SiteListScreen() {
  const navigation = useNavigation<SiteListNavigationProp>();
  const { records, isLoading, error, fetchRecords } = useRecordsStore();

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecordPress = (record: RecordModel) => {
    navigation.navigate('TemplateSelect', { siteId: record.id });
  };

  const renderRecord = ({ item }: { item: RecordModel }) => (
    <TouchableOpacity
      onPress={() => handleRecordPress(item)}
      activeOpacity={0.7}
    >
      <Card style={styles.recordCard}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordName}>{item.name}</Text>
          {item.address && (
            <Text style={styles.recordAddress} numberOfLines={2}>
              {item.address}
            </Text>
          )}
        </View>
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Records</Text>
      <Text style={styles.emptyText}>
        No records have been assigned to you yet. Contact your administrator to get access.
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={fetchRecords} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select a Record</Text>
        <Text style={styles.headerSubtitle}>
          Choose a record to start an inspection
        </Text>
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecord}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchRecords} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  recordAddress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  chevron: {
    marginLeft: spacing.md,
  },
  chevronText: {
    fontSize: 24,
    color: colors.text.tertiary,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
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
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});
