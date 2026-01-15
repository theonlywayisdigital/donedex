import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName, DragHandle, DraggableList } from '../../components/ui';
import { FieldEditorModal, FieldData } from '../../components/records/FieldEditorModal';
import { fetchRecordTypeById, updateRecordType, archiveRecordType } from '../../services/recordTypes';
import {
  fetchRecordTypeFields,
  createRecordTypeField,
  updateRecordTypeField,
  deleteRecordTypeField,
  reorderRecordTypeFields,
} from '../../services/recordTypeFields';
import type { RecordType, RecordTypeField, Json } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'RecordTypeEditor'>;
type EditorRouteProp = RouteProp<SitesStackParamList, 'RecordTypeEditor'>;

// Available icons for record types
const AVAILABLE_ICONS: IconName[] = [
  'truck', 'map-pin', 'building', 'building-2', 'wrench', 'user', 'users',
  'folder-kanban', 'heart', 'door-open', 'calendar', 'clipboard-list',
  'folder', 'file-text', 'home', 'star', 'tag',
];

// Available colors for record types
const AVAILABLE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#EF4444', // red
  '#78716C', // stone
  '#F97316', // orange
];

// Field type options
const FIELD_TYPES = [
  { value: 'short_text', label: 'Short Text', description: 'Single line text' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line text' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'time', label: 'Time', description: 'Time picker' },
  { value: 'expiry_date', label: 'Expiry Date', description: 'Date with expiry warnings' },
  { value: 'phone', label: 'Phone', description: 'Phone number' },
  { value: 'email', label: 'Email', description: 'Email address' },
  { value: 'currency', label: 'Currency', description: 'Money amount' },
  { value: 'single_select', label: 'Single Select', description: 'Choose one option' },
  { value: 'number_with_unit', label: 'Number with Unit', description: 'Number with units' },
];

const FIELD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.value, t.label])
);

export function RecordTypeEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorRouteProp>();
  const recordTypeId = route.params?.recordTypeId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordType, setRecordType] = useState<RecordType | null>(null);
  const [fields, setFields] = useState<RecordTypeField[]>([]);

  // Edit state
  const [name, setName] = useState('');
  const [nameSingular, setNameSingular] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>('folder');
  const [color, setColor] = useState<string>(AVAILABLE_COLORS[0]);

  // Modals
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<RecordTypeField | null>(null);

  const loadData = useCallback(async () => {
    if (!recordTypeId) {
      setLoading(false);
      return;
    }

    const [typeResult, fieldsResult] = await Promise.all([
      fetchRecordTypeById(recordTypeId),
      fetchRecordTypeFields(recordTypeId),
    ]);

    if (typeResult.data) {
      const rt = typeResult.data;
      setRecordType(rt);
      setName(rt.name);
      setNameSingular(rt.name_singular);
      setDescription(rt.description || '');
      setIcon(rt.icon);
      setColor(rt.color);
    }

    if (!fieldsResult.error) {
      setFields(fieldsResult.data);
    }

    setLoading(false);
  }, [recordTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!recordTypeId || !name.trim()) {
      showNotification('Error', 'Please enter a name');
      return;
    }

    setSaving(true);

    const { error } = await updateRecordType(recordTypeId, {
      name: name.trim(),
      name_singular: nameSingular.trim() || name.trim(),
      description: description.trim() || null,
      icon,
      color,
    });

    setSaving(false);

    if (error) {
      showNotification('Error', error.message);
      return;
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    showDestructiveConfirm(
      'Delete Record Type',
      `Are you sure you want to delete "${name}"? This will also delete all records of this type.`,
      async () => {
        if (!recordTypeId) return;
        const { error } = await archiveRecordType(recordTypeId);
        if (error) {
          showNotification('Error', error.message);
        } else {
          navigation.goBack();
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const handleSaveField = async (fieldData: FieldData) => {
    if (!recordTypeId) return;

    if (editingField) {
      // Update existing field
      const { error } = await updateRecordTypeField(editingField.id, {
        label: fieldData.label,
        is_required: fieldData.is_required,
        help_text: fieldData.help_text,
        placeholder_text: fieldData.placeholder_text,
        default_value: fieldData.default_value,
        options: fieldData.options as unknown as Json,
        min_value: fieldData.min_value,
        max_value: fieldData.max_value,
        unit_type: fieldData.unit_type,
        unit_options: fieldData.unit_options,
        default_unit: fieldData.default_unit,
      });

      if (error) throw new Error(error.message);
    } else {
      // Create new field
      const { error } = await createRecordTypeField({
        record_type_id: recordTypeId,
        label: fieldData.label,
        field_type: fieldData.field_type,
        is_required: fieldData.is_required,
        help_text: fieldData.help_text,
        placeholder_text: fieldData.placeholder_text,
        default_value: fieldData.default_value,
        options: fieldData.options as unknown as Json,
        min_value: fieldData.min_value,
        max_value: fieldData.max_value,
        unit_type: fieldData.unit_type,
        unit_options: fieldData.unit_options,
        default_unit: fieldData.default_unit,
      });

      if (error) throw new Error(error.message);
    }

    // Reload fields
    const { data } = await fetchRecordTypeFields(recordTypeId);
    setFields(data);
  };

  const handleDeleteFieldFromEditor = async () => {
    if (!editingField) return;

    const { error } = await deleteRecordTypeField(editingField.id);
    if (error) {
      showNotification('Error', error.message);
      return;
    }

    setFields((prev) => prev.filter((f) => f.id !== editingField.id));
    setEditingField(null);
  };

  const openFieldEditor = (field?: RecordTypeField) => {
    setEditingField(field || null);
    setShowFieldEditor(true);
  };

  const closeFieldEditor = () => {
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleReorderFields = async (reorderedFields: RecordTypeField[]) => {
    if (!recordTypeId) return;

    // Update local state immediately for responsiveness
    setFields(reorderedFields);

    // Persist to database
    const fieldIds = reorderedFields.map(f => f.id);
    const { error } = await reorderRecordTypeFields(recordTypeId, fieldIds);

    if (error) {
      showNotification('Error', 'Failed to reorder fields');
      // Reload to restore correct order
      const { data } = await fetchRecordTypeFields(recordTypeId);
      setFields(data);
    }
  };

  const renderFieldItem = ({ item: field, drag, isActive }: { item: RecordTypeField; index: number; drag: () => void; isActive: boolean }) => (
    <TouchableOpacity
      style={[styles.fieldRow, isActive && styles.fieldRowActive]}
      onPress={() => openFieldEditor(field)}
      activeOpacity={0.7}
    >
      <DragHandle drag={drag} isActive={isActive} />
      <View style={styles.fieldInfo}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.is_required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        <View style={styles.fieldMeta}>
          <Text style={styles.fieldType}>
            {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
          </Text>
          {field.options && Array.isArray(field.options) && (field.options as unknown[]).length > 0 && (
            <Text style={styles.fieldOptionsCount}>
              {` · ${(field.options as unknown[]).length} options`}
            </Text>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderIconPicker = () => (
    <Modal visible={showIconPicker} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowIconPicker(false)}
      >
        <View style={styles.pickerModal}>
          <Text style={styles.pickerTitle}>Choose Icon</Text>
          <View style={styles.pickerGrid}>
            {AVAILABLE_ICONS.map((iconName) => (
              <TouchableOpacity
                key={iconName}
                style={[
                  styles.pickerItem,
                  icon === iconName && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setIcon(iconName);
                  setShowIconPicker(false);
                }}
              >
                <Icon
                  name={iconName}
                  size={24}
                  color={icon === iconName ? colors.primary.DEFAULT : colors.text.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderColorPicker = () => (
    <Modal visible={showColorPicker} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowColorPicker(false)}
      >
        <View style={styles.pickerModal}>
          <Text style={styles.pickerTitle}>Choose Color</Text>
          <View style={styles.pickerGrid}>
            {AVAILABLE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorItem,
                  { backgroundColor: c },
                  color === c && styles.colorItemSelected,
                ]}
                onPress={() => {
                  setColor(c);
                  setShowColorPicker(false);
                }}
              >
                {color === c && (
                  <Icon name="check" size={20} color={colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Preview */}
        <View style={styles.previewCard}>
          <View style={[styles.previewIcon, { backgroundColor: color + '20' }]}>
            <Icon name={icon as IconName} size={32} color={color} />
          </View>
          <Text style={styles.previewName}>{name || 'Type Name'}</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Name (plural) *</Text>
            <TextInput
              style={styles.formInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Vehicles"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Name (singular)</Text>
            <TextInput
              style={styles.formInput}
              value={nameSingular}
              onChangeText={setNameSingular}
              placeholder="e.g., Vehicle"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Icon & Color */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowIconPicker(true)}
            >
              <Icon name={icon as IconName} size={24} color={color} />
              <Text style={styles.pickerButtonText}>Change Icon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowColorPicker(true)}
            >
              <View style={[styles.colorSwatch, { backgroundColor: color }]} />
              <Text style={styles.pickerButtonText}>Change Color</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fields ({fields.length})</Text>
            <TouchableOpacity
              style={styles.addFieldButton}
              onPress={() => openFieldEditor()}
            >
              <Icon name="plus" size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.addFieldText}>Add Field</Text>
            </TouchableOpacity>
          </View>

          {fields.length === 0 ? (
            <View style={styles.emptyFields}>
              <Text style={styles.emptyFieldsText}>
                No fields yet. Add fields to define what information records of this type should capture.
              </Text>
            </View>
          ) : (
            <DraggableList
              data={fields}
              keyExtractor={(field) => field.id}
              renderItem={renderFieldItem}
              onDragEnd={({ data }) => handleReorderFields(data)}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Delete */}
        {recordType && !recordType.is_system && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Icon name="trash-2" size={20} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Delete Record Type</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderIconPicker()}
      {renderColorPicker()}

      {/* Field Editor Modal */}
      <FieldEditorModal
        visible={showFieldEditor}
        onClose={closeFieldEditor}
        onSave={handleSaveField}
        onDelete={editingField ? handleDeleteFieldFromEditor : undefined}
        field={editingField}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  previewName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
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
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pickerButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addFieldText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  emptyFields: {
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
  },
  emptyFieldsText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  fieldsList: {
    gap: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
  },
  fieldRowActive: {
    backgroundColor: colors.primary.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  requiredStar: {
    color: colors.danger,
  },
  fieldType: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  fieldMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldOptionsCount: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButtonText: {
    fontSize: fontSize.body,
    color: colors.danger,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  saveButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  pickerItem: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  pickerItemSelected: {
    backgroundColor: colors.primary.light,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  colorItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
