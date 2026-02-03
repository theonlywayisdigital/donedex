import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchAllOrganisations } from '../../services/superAdmin';
import type { OrganisationSummary } from '../../types/superAdmin';
import type { SuperAdminStackParamList } from '../../navigation/SuperAdminNavigator';

type NavigationProp = NativeStackNavigationProp<SuperAdminStackParamList, 'OrganisationsList'>;

export function OrganisationsListScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const result = await fetchAllOrganisations();
      if (result.data) {
        setOrganisations(result.data);
      }
    } catch (err) {
      console.error('Error loading organisations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredOrganisations = organisations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderOrganisation = ({ item }: { item: OrganisationSummary }) => (
    <TouchableOpacity
      style={styles.orgCard}
      onPress={() => navigation.navigate('OrganisationDetail', { orgId: item.id })}
    >
      <View style={styles.orgHeader}>
        <View style={styles.orgIcon}>
          <Icon name="building-2" size={24} color={colors.primary.DEFAULT} />
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>{item.name}</Text>
          <Text style={styles.orgDate}>Created {formatDate(item.created_at)}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.neutral[300]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Icon name="users" size={16} color={colors.text.secondary} />
          <Text style={styles.statText}>{item.user_count} users</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="file-text" size={16} color={colors.text.secondary} />
          <Text style={styles.statText}>{item.report_count} reports</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="layout-template" size={16} color={colors.text.secondary} />
          <Text style={styles.statText}>{item.template_count} templates</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading organisations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search organisations..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredOrganisations}
        keyExtractor={(item) => item.id}
        renderItem={renderOrganisation}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="building-2" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No organisations found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'No organisations to display'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filteredOrganisations.length} organisation{filteredOrganisations.length !== 1 ? 's' : ''}
          </Text>
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  orgCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  orgDate: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
