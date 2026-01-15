import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { fetchRecordById, createRecord, updateRecord } from '../../services/records';
import { fetchRecordTypeById } from '../../services/recordTypes';
import { fetchRecordTypeFields } from '../../services/recordTypeFields';
import { useAuthStore } from '../../store/authStore';
import { RecordFieldInput } from '../../components/records/RecordFieldInput';
import type { Record as RecordModel, RecordType, RecordTypeField } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'SiteEditor'>;
type EditorRouteProp = RouteProp<SitesStackParamList, 'SiteEditor'>;

export function SiteEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorRouteProp>();
  const siteId = route.params?.siteId;
  const recordTypeIdParam = route.params?.recordTypeId;
  const isEditing = !!siteId;

  const organisationId = useAuthStore((state) => state.organisation?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [recordTypeId, setRecordTypeId] = useState<string | null>(recordTypeIdParam || null);
  const [recordType, setRecordType] = useState<RecordType | null>(null);
  const [fields, setFields] = useState<RecordTypeField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      try {
        if (isEditing && siteId) {
          // Load existing record
          const { data: record, error } = await fetchRecordById(siteId);
          if (error) {
            showNotification('Error', error.message);
            navigation.goBack();
            return;
          }
          if (record) {
            setName(record.name);
            setAddress(record.address || '');
            setRecordTypeId(record.record_type_id);

            // Load metadata field values
            if (record.metadata && typeof record.metadata === 'object') {
              setFieldValues(record.metadata as Record<string, string>);
            }

            // Load the record type and its fields
            if (record.record_type_id) {
              await loadRecordTypeAndFields(record.record_type_id);
            }
          }
        } else if (recordTypeIdParam) {
          // Creating new record with specified type
          await loadRecordTypeAndFields(recordTypeIdParam);
        }
      } catch (err) {
        console.error('Error initializing editor:', err);
        showNotification('Error', 'Failed to load record data');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [siteId, isEditing, recordTypeIdParam]);

  const loadRecordTypeAndFields = async (typeId: string) => {
    // Load record type info
    const { data: type, error: typeError } = await fetchRecordTypeById(typeId);
    if (typeError) {
      console.error('Error loading record type:', typeError.message);
      return;
    }
    setRecordType(type);
    setRecordTypeId(typeId);

    // Load the fields for this record type
    const { data: typeFields, error: fieldsError } = await fetchRecordTypeFields(typeId);
    if (fieldsError) {
      console.error('Error loading record type fields:', fieldsError.message);
      return;
    }
    setFields(typeFields);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showNotification('Error', 'Please enter a name');
      return;
    }

    if (!organisationId) {
      showNotification('Error', 'Session expired. Please log in again.');
      return;
    }

    if (!isEditing && !recordTypeId) {
      showNotification('Error', 'No record type available. Please create a record type first.');
      return;
    }

    // Validate required fields
    for (const field of fields) {
      if (field.is_required && !fieldValues[field.id]?.trim()) {
        showNotification('Error', `Please fill in the required field: ${field.label}`);
        return;
      }
    }

    setSaving(true);

    try {
      if (isEditing && siteId) {
        const { error } = await updateRecord(siteId, {
          name: name.trim(),
          address: address.trim() || null,
          metadata: fieldValues,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await createRecord({
          organisation_id: organisationId,
          record_type_id: recordTypeId!,
          name: name.trim(),
          address: address.trim() || null,
          description: null,
          metadata: fieldValues,
        });
        if (error) throw new Error(error.message);
      }

      navigation.goBack();
    } catch (err) {
      showNotification('Error', err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Record Type Info */}
        {recordType && (
          <View style={styles.recordTypeInfo}>
            <Text style={styles.recordTypeLabel}>Record Type</Text>
            <Text style={styles.recordTypeName}>{recordType.name}</Text>
          </View>
        )}

        {/* Name Field (always required) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {recordType?.name_singular || 'Record'} Name *
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={`Enter ${recordType?.name_singular?.toLowerCase() || 'record'} name`}
            placeholderTextColor={colors.text.tertiary}
            autoFocus={!isEditing}
          />
        </View>

        {/* Address Field (optional, always shown) */}
        <View style={styles.field}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="123 High Street, London"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Custom Fields from Record Type */}
        {fields.length > 0 && (
          <View style={styles.customFieldsSection}>
            <Text style={styles.sectionTitle}>Additional Fields</Text>
            {fields.map((field) => (
              <RecordFieldInput
                key={field.id}
                field={field}
                value={fieldValues[field.id] || null}
                onChange={(value) => handleFieldChange(field.id, value || '')}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update' : 'Create'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  recordTypeInfo: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recordTypeLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  recordTypeName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customFieldsSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  saveButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
