import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { fetchLibraryRecordTypes, copyLibraryRecordTypeToOrg, LibraryFieldDefinition } from '../../services/library';
import { createRecordType } from '../../services/recordTypes';
import { bulkCreateRecordTypeFields } from '../../services/recordTypeFields';
import type { LibraryRecordType } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'AddRecordType'>;

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

// Field type display names
const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  number: 'Number',
  number_with_unit: 'Number with Unit',
  date: 'Date',
  time: 'Time',
  expiry_date: 'Expiry Date',
  phone: 'Phone Number',
  email: 'Email',
  currency: 'Currency',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
};

export function AddRecordTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { organisation } = useAuthStore();

  const [libraryTypes, setLibraryTypes] = useState<LibraryRecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preview modal state
  const [previewType, setPreviewType] = useState<LibraryRecordType | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Custom type state
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNameSingular, setCustomNameSingular] = useState('');

  useEffect(() => {
    loadLibraryTypes();
  }, []);

  const loadLibraryTypes = async () => {
    const { data, error } = await fetchLibraryRecordTypes();
    if (error) {
      console.error('Error loading library types:', error.message);
    } else {
      setLibraryTypes(data);
    }
    setLoading(false);
  };

  const handleSelectLibraryType = (type: LibraryRecordType) => {
    setPreviewType(type);
    setShowPreview(true);
  };

  const handleAddFromLibrary = async () => {
    if (!previewType || !organisation?.id) return;

    setSaving(true);
    const { data, error } = await copyLibraryRecordTypeToOrg(
      previewType.id,
      organisation.id
    );

    setSaving(false);

    if (error) {
      showNotification('Error', error.message);
      return;
    }

    setShowPreview(false);

    // Navigate to editor so user can see and customize the pre-populated fields
    if (data) {
      navigation.replace('RecordTypeEditor', { recordTypeId: data.id });
    } else {
      navigation.goBack();
    }
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) {
      showNotification('Error', 'Please enter a name');
      return;
    }

    if (!organisation?.id) {
      showNotification('Error', 'Organisation not found');
      return;
    }

    setSaving(true);

    // Create custom record type with no fields (user will add them)
    const { data, error } = await createRecordType({
      organisation_id: organisation.id,
      name: customName.trim(),
      name_singular: customNameSingular.trim() || customName.trim(),
      description: null,
      icon: 'folder',
      color: colors.primary.DEFAULT,
      fields: [],
      is_default: false,
      is_system: false,
      source_library_id: null,
    });

    setSaving(false);

    if (error) {
      showNotification('Error', error.message);
      return;
    }

    // Navigate to editor so user can add fields
    if (data) {
      navigation.replace('RecordTypeEditor', { recordTypeId: data.id });
    }
  };

  const renderLibraryTypeCard = (type: LibraryRecordType) => (
    <TouchableOpacity
      key={type.id}
      style={styles.libraryCard}
      onPress={() => handleSelectLibraryType(type)}
    >
      <View style={[styles.libraryIconContainer, { backgroundColor: type.color + '20' }]}>
        <Icon name={getIconName(type.icon)} size={28} color={type.color} />
      </View>
      <View style={styles.libraryCardContent}>
        <Text style={styles.libraryCardName}>{type.name}</Text>
        <Text style={styles.libraryCardDescription} numberOfLines={1}>
          {type.description}
        </Text>
        <Text style={styles.libraryCardFields}>
          {(type.fields as unknown as LibraryFieldDefinition[]).length} fields
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderPreviewModal = () => {
    if (!previewType) return null;

    const fields = previewType.fields as unknown as LibraryFieldDefinition[];

    return (
      <Modal visible={showPreview} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.previewCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Preview</Text>
            <TouchableOpacity
              onPress={handleAddFromLibrary}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              ) : (
                <Text style={styles.previewAdd}>Add</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewContent}>
            {/* Type info */}
            <View style={styles.previewTypeInfo}>
              <View style={[styles.previewIconContainer, { backgroundColor: previewType.color + '20' }]}>
                <Icon name={getIconName(previewType.icon)} size={48} color={previewType.color} />
              </View>
              <Text style={styles.previewTypeName}>{previewType.name}</Text>
              <Text style={styles.previewTypeDescription}>{previewType.description}</Text>
            </View>

            {/* Fields */}
            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>
                Fields ({fields.length})
              </Text>
              {fields.map((field, index) => (
                <View key={index} style={styles.previewFieldRow}>
                  <View style={styles.previewFieldInfo}>
                    <Text style={styles.previewFieldLabel}>{field.label}</Text>
                    <Text style={styles.previewFieldType}>
                      {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                      {field.is_required && ' *'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.previewHint}>
              You can customize fields after adding this type
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderCustomModal = () => (
    <Modal visible={showCustom} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.previewContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setShowCustom(false)}>
            <Text style={styles.previewCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Custom Type</Text>
          <TouchableOpacity
            onPress={handleCreateCustom}
            disabled={saving || !customName.trim()}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            ) : (
              <Text style={[
                styles.previewAdd,
                !customName.trim() && styles.previewAddDisabled
              ]}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Name (plural) *</Text>
            <TextInput
              style={styles.formInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g., Vehicles, Properties, Equipment"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Name (singular)</Text>
            <TextInput
              style={styles.formInput}
              value={customNameSingular}
              onChangeText={setCustomNameSingular}
              placeholder="e.g., Vehicle, Property, Equipment"
              placeholderTextColor={colors.text.tertiary}
            />
            <Text style={styles.formHint}>
              Used when referring to a single item
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Icon name="info" size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.infoText}>
              After creating the type, you'll be taken to the editor where you can add custom fields, choose an icon, and set the color.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Library Types */}
      <Text style={styles.sectionTitle}>Start with a Template</Text>
      <Text style={styles.sectionSubtitle}>
        Choose a pre-built type with common fields
      </Text>

      <View style={styles.libraryList}>
        {libraryTypes.map(renderLibraryTypeCard)}
      </View>

      {/* Custom Type */}
      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Create Custom</Text>
      <Text style={styles.sectionSubtitle}>
        Start from scratch with your own fields
      </Text>

      <TouchableOpacity
        style={styles.customButton}
        onPress={() => setShowCustom(true)}
      >
        <Icon name="plus" size={24} color={colors.primary.DEFAULT} />
        <Text style={styles.customButtonText}>Create Custom Type</Text>
      </TouchableOpacity>

      {renderPreviewModal()}
      {renderCustomModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
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
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  libraryList: {
    gap: spacing.sm,
  },
  libraryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  libraryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  libraryCardContent: {
    flex: 1,
  },
  libraryCardName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  libraryCardDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  libraryCardFields: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: spacing.lg,
  },
  customButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
  },
  customButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
    marginLeft: spacing.sm,
  },
  // Preview Modal
  previewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  previewCancel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  previewTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  previewAdd: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  previewAddDisabled: {
    color: colors.text.tertiary,
  },
  previewContent: {
    flex: 1,
    padding: spacing.md,
  },
  previewTypeInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  previewIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewTypeName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  previewTypeDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewSectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  previewFieldRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  previewFieldInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewFieldLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  previewFieldType: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  previewHint: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Custom Modal
  formField: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  formHint: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  infoBox: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
});
