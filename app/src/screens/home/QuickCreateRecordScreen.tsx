/**
 * QuickCreateRecordScreen
 * Lightweight inline record creation during "Start Inspection" flow
 * Shows only required fields for speed - user can edit full details later
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '../../components/ui';
import { useRecordsStore } from '../../store/recordsStore';
import { useAuthStore } from '../../store/authStore';
import { fetchRecordTypeFields } from '../../services/recordTypeFields';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';
import type { RecordTypeField } from '../../types';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'QuickCreateRecord'>;
type RouteProps = RouteProp<HomeStackParamList, 'QuickCreateRecord'>;

export function QuickCreateRecordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { recordTypeId } = route.params;

  const { organisation } = useAuthStore();
  const { recordTypes, createRecord, refreshRecords } = useRecordsStore();

  const [name, setName] = useState('');
  const [requiredFields, setRequiredFields] = useState<RecordTypeField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFields, setIsFetchingFields] = useState(true);

  // Get the current record type for context
  const currentRecordType = recordTypes.find((rt) => rt.id === recordTypeId);

  // Fetch required custom fields
  useEffect(() => {
    async function loadFields() {
      setIsFetchingFields(true);
      try {
        const result = await fetchRecordTypeFields(recordTypeId);
        if (result.data) {
          // Only show required fields for quick create
          const required = result.data.filter((field) => field.is_required);
          setRequiredFields(required);
        }
      } catch (error) {
        console.error('[QuickCreateRecord] Error loading fields:', error);
      } finally {
        setIsFetchingFields(false);
      }
    }
    loadFields();
  }, [recordTypeId]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name');
      return false;
    }

    // Check required custom fields
    for (const field of requiredFields) {
      if (!fieldValues[field.id]?.trim()) {
        Alert.alert('Required', `Please enter ${field.label}`);
        return false;
      }
    }

    return true;
  };

  const handleCreateAndInspect = async () => {
    if (!validateForm() || !organisation) return;

    setIsLoading(true);
    try {
      // Build metadata from custom field values
      // Use field ID as key since field_key doesn't exist
      const metadata: Record<string, string> = {};
      for (const field of requiredFields) {
        if (fieldValues[field.id]) {
          // Use a sanitized label as the key
          const key = field.label.toLowerCase().replace(/\s+/g, '_');
          metadata[key] = fieldValues[field.id];
        }
      }

      const result = await createRecord({
        name: name.trim(),
        organisation_id: organisation.id,
        record_type_id: recordTypeId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        address: null,
        description: null,
      });

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      if (result.data) {
        // Refresh records list and navigate to template select
        await refreshRecords();
        navigation.replace('TemplateSelect', { siteId: result.data.id });
      }
    } catch (error) {
      console.error('[QuickCreateRecord] Error creating record:', error);
      Alert.alert('Error', 'Failed to create record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOnly = async () => {
    if (!validateForm() || !organisation) return;

    setIsLoading(true);
    try {
      const metadata: Record<string, string> = {};
      for (const field of requiredFields) {
        if (fieldValues[field.id]) {
          const key = field.label.toLowerCase().replace(/\s+/g, '_');
          metadata[key] = fieldValues[field.id];
        }
      }

      const result = await createRecord({
        name: name.trim(),
        organisation_id: organisation.id,
        record_type_id: recordTypeId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        address: null,
        description: null,
      });

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Refresh and go back to search
      await refreshRecords();
      navigation.goBack();
    } catch (error) {
      console.error('[QuickCreateRecord] Error creating record:', error);
      Alert.alert('Error', 'Failed to create record');
    } finally {
      setIsLoading(false);
    }
  };

  const singularName = currentRecordType?.name_singular || currentRecordType?.name || 'Record';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>New {singularName}</Text>
            <Text style={styles.subtitle}>
              Enter the required details to create a new {singularName.toLowerCase()}.
            </Text>
          </View>

          {/* Name Field - Always Required */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${singularName.toLowerCase()} name`}
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          {/* Required Custom Fields */}
          {isFetchingFields ? (
            <View style={styles.loadingFields}>
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              <Text style={styles.loadingText}>Loading fields...</Text>
            </View>
          ) : (
            requiredFields.map((field) => (
              <View key={field.id} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {field.label} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  placeholderTextColor={colors.text.tertiary}
                  value={fieldValues[field.id] || ''}
                  onChangeText={(value) => handleFieldChange(field.id, value)}
                />
              </View>
            ))
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateAndInspect}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Icon name="play-circle" size={20} color={colors.white} />
                <Text style={styles.primaryButtonText}>Create & Start Inspection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleCreateOnly}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Create Only</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
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
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.danger,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 48,
  },
  loadingFields: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.white,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  primaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  secondaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
});

export default QuickCreateRecordScreen;
