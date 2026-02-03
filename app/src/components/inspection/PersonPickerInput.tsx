/**
 * PersonPickerInput Component
 * Team member picker for inspection fields
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';
import { fetchTeamMembers, type TeamMember } from '../../services/team';
import { useAuthStore } from '../../store/authStore';

interface PersonValue {
  userId: string;
  name: string;
}

interface PersonPickerInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function PersonPickerInput({ value, onChange }: PersonPickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const organisation = useAuthStore((s) => s.organisation);
  const currentOrganisationId = organisation?.id;

  // Parse existing value
  const selectedPerson: PersonValue | null = value ? JSON.parse(value) : null;

  useEffect(() => {
    if (showPicker && currentOrganisationId) {
      loadTeamMembers();
    }
  }, [showPicker, currentOrganisationId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter((m) =>
          m.user_profile?.full_name?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const loadTeamMembers = async () => {
    if (!currentOrganisationId) return;

    setLoading(true);
    try {
      const result = await fetchTeamMembers(currentOrganisationId);
      if (result.data) {
        setMembers(result.data);
        setFilteredMembers(result.data);
      }
    } catch (error) {
      console.error('[PersonPickerInput] Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPerson = (member: TeamMember) => {
    const personData: PersonValue = {
      userId: member.user_id,
      name: member.user_profile?.full_name || 'Unknown',
    };
    onChange(JSON.stringify(personData));
    setShowPicker(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // No selection - show button
  if (!selectedPerson) {
    return (
      <>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Icon name="user" size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.selectButtonText}>Select Team Member</Text>
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Icon name="x" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Team Member</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
              <Icon name="search" size={18} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name..."
                placeholderTextColor={colors.text.tertiary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="x" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Loading team members...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.memberItem}
                    onPress={() => handleSelectPerson(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {getInitials(item.user_profile?.full_name || 'U')}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {item.user_profile?.full_name || 'Unknown'}
                      </Text>
                      <Text style={styles.memberRole}>{item.role}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.memberList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="users" size={32} color={colors.text.tertiary} />
                    <Text style={styles.emptyText}>No team members found</Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>
      </>
    );
  }

  // Person selected - show result
  return (
    <View style={styles.selectedContainer}>
      <View style={styles.selectedAvatar}>
        <Text style={styles.selectedAvatarText}>
          {getInitials(selectedPerson.name)}
        </Text>
      </View>

      <View style={styles.selectedInfo}>
        <Text style={styles.selectedLabel}>Assigned to:</Text>
        <Text style={styles.selectedName}>{selectedPerson.name}</Text>
      </View>

      <View style={styles.selectedActions}>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Icon name="refresh-cw" size={16} color={colors.primary.DEFAULT} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <Icon name="x" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  selectButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
  },
  modalTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  memberList: {
    padding: spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  memberName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  memberRole: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },

  // Selected state
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  selectedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  selectedName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  selectedActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  changeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PersonPickerInput;
