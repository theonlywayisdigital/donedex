import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import {
  NestableScrollContainer,
  NestableDraggableList,
  DragHandle,
} from '../../components/ui';
import { showNotification, showConfirm, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import {
  fetchTemplateWithSections,
  createTemplate,
  updateTemplate,
  createSection,
  updateSection,
  deleteSection,
  createItem,
  updateItem,
  deleteItem,
  TemplateWithSections,
  TemplateSectionWithItems,
  TemplateItem,
  ItemType,
  PhotoRule,
  DatetimeMode,
  ConditionOperator,
  RatingStyle,
  UnitType,
  InstructionStyle,
  SubItem,
} from '../../services/templates';
import { useAuthStore } from '../../store/authStore';
import { SectionEditor } from '../../components/templates/SectionEditor';
import { TemplatePreview } from '../../components/templates/TemplatePreview';
import { SectionActionSheet } from '../../components/templates/SectionActionSheet';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplateEditor'>;
type EditorRouteProp = RouteProp<TemplatesStackParamList, 'TemplateEditor'>;

interface LocalSection {
  id: string;
  name: string;
  sort_order: number;
  items: LocalItem[];
  isNew?: boolean;
}

interface LocalItem {
  id: string;
  label: string;
  item_type: ItemType;
  is_required: boolean;
  photo_rule: PhotoRule;
  options: string[] | null;
  sort_order: number;
  isNew?: boolean;
  // New fields for enhanced items
  help_text?: string | null;
  placeholder_text?: string | null;
  default_value?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  datetime_mode?: DatetimeMode | null;
  rating_max?: number | null;
  declaration_text?: string | null;
  signature_requires_name?: boolean | null;
  condition_field_id?: string | null;
  condition_operator?: ConditionOperator | null;
  condition_value?: string | null;
  // Extended field type properties
  step_value?: number | null;
  rating_style?: RatingStyle | null;
  unit_type?: UnitType | null;
  unit_options?: string[] | null;
  default_unit?: string | null;
  counter_min?: number | null;
  counter_max?: number | null;
  counter_step?: number | null;
  max_media_count?: number | null;
  media_required?: boolean | null;
  max_duration_seconds?: number | null;
  warning_days_before?: number | null;
  sub_items?: SubItem[] | null;
  min_entries?: number | null;
  max_entries?: number | null;
  instruction_image_url?: string | null;
  instruction_style?: InstructionStyle | null;
  asset_types?: string[] | null;
}

export function TemplateEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorRouteProp>();
  const templateId = route.params?.templateId;
  const initialData = route.params?.initialData;
  const isEditing = !!templateId;
  const isFromAI = !!initialData;

  const organisationId = useAuthStore((state) => state.organisation?.id);
  const userId = useAuthStore((state) => state.user?.id);

  const [loading, setLoading] = useState(isEditing && !isFromAI);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [sections, setSections] = useState<LocalSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Track original IDs from database to detect deletions
  const [originalSectionIds, setOriginalSectionIds] = useState<Set<string>>(new Set());
  const [originalItemIds, setOriginalItemIds] = useState<Set<string>>(new Set());

  // Track dirty state for unsaved changes warning
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [actionSheetSection, setActionSheetSection] = useState<LocalSection | null>(null);
  const initialLoadComplete = useRef(false);
  const lastSaveTime = useRef<number>(0);

  // Generate temp IDs for new items
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (isEditing && templateId) {
      loadTemplate(templateId);
    } else if (isFromAI && initialData) {
      // Populate from AI-generated template
      loadFromAITemplate(initialData);
    }
  }, [templateId, initialData]);

  const loadFromAITemplate = (data: NonNullable<typeof initialData>) => {
    setName(data.name);
    setDescription(data.description || '');

    const loadedSections: LocalSection[] = data.sections.map((section) => ({
      id: generateTempId(),
      name: section.name,
      sort_order: section.sort_order,
      items: section.items.map((item, index) => ({
        id: generateTempId(),
        label: item.label,
        item_type: item.item_type as ItemType,
        is_required: item.is_required,
        photo_rule: item.photo_rule as PhotoRule,
        options: item.options || null,
        sort_order: index,
        isNew: true,
      })),
      isNew: true,
    }));

    setSections(loadedSections);

    if (loadedSections.length > 0) {
      setExpandedSection(loadedSections[0].id);
    }

    setLoading(false);
    // Mark dirty since this is new unsaved content
    setTimeout(() => {
      initialLoadComplete.current = true;
      setIsDirty(true);
    }, 0);
  };

  const loadTemplate = async (id: string) => {
    const { data, error } = await fetchTemplateWithSections(id);
    if (error) {
      showNotification('Error', error.message);
      navigation.goBack();
      return;
    }
    if (data) {
      setName(data.name);
      setDescription(data.description || '');
      setIsPublished(data.is_published);

      // Track original IDs for deletion detection
      const sectionIds = new Set<string>();
      const itemIds = new Set<string>();

      const loadedSections = data.template_sections.map((s) => {
        sectionIds.add(s.id);
        return {
          id: s.id,
          name: s.name,
          sort_order: s.sort_order,
          items: s.template_items.map((item) => {
            itemIds.add(item.id);
            return {
              id: item.id,
              label: item.label,
              item_type: item.item_type,
              is_required: item.is_required,
              photo_rule: item.photo_rule,
              options: item.options,
              sort_order: item.sort_order,
              // Load new fields
              help_text: item.help_text,
              placeholder_text: item.placeholder_text,
              default_value: item.default_value,
              min_value: item.min_value,
              max_value: item.max_value,
              datetime_mode: item.datetime_mode,
              rating_max: item.rating_max,
              declaration_text: item.declaration_text,
              signature_requires_name: item.signature_requires_name,
              condition_field_id: item.condition_field_id,
              condition_operator: item.condition_operator,
              condition_value: item.condition_value,
              // Extended field type properties
              step_value: item.step_value,
              rating_style: item.rating_style,
              unit_type: item.unit_type,
              unit_options: item.unit_options,
              default_unit: item.default_unit,
              counter_min: item.counter_min,
              counter_max: item.counter_max,
              counter_step: item.counter_step,
              max_media_count: item.max_media_count,
              media_required: item.media_required,
              max_duration_seconds: item.max_duration_seconds,
              warning_days_before: item.warning_days_before,
              sub_items: item.sub_items,
              min_entries: item.min_entries,
              max_entries: item.max_entries,
              instruction_image_url: item.instruction_image_url,
              instruction_style: item.instruction_style,
              asset_types: item.asset_types,
            };
          }),
        };
      });

      setOriginalSectionIds(sectionIds);
      setOriginalItemIds(itemIds);
      setSections(loadedSections);

      if (data.template_sections.length > 0) {
        setExpandedSection(data.template_sections[0].id);
      }
    }
    setLoading(false);
    // Mark initial load complete after a tick to avoid false dirty state
    setTimeout(() => {
      initialLoadComplete.current = true;
    }, 0);
  };

  // Mark as dirty when any editable field changes (after initial load)
  useEffect(() => {
    if (initialLoadComplete.current) {
      setIsDirty(true);
    }
  }, [name, description, sections]);

  // Auto-save function (silent save without navigation)
  const performAutoSave = useCallback(async () => {
    // Don't auto-save if no name, no changes, or already saving
    if (!name.trim() || !isDirty || saving || autoSaving) return;
    if (!organisationId || !userId) return;

    // Require at least 30 seconds between saves
    const now = Date.now();
    if (now - lastSaveTime.current < 30000) return;

    setAutoSaving(true);
    lastSaveTime.current = now;

    try {
      let savedTemplateId = templateId;

      // Create or update template
      if (isEditing && templateId) {
        const { error } = await updateTemplate(templateId, {
          name: name.trim(),
          description: description.trim() || null,
          is_published: isPublished,
        });
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await createTemplate({
          organisation_id: organisationId,
          record_type_id: null, // Templates can optionally be linked to a record type
          name: name.trim(),
          description: description.trim() || null,
          is_published: false, // Auto-save always saves as draft
          created_by: userId,
        });
        if (error) throw new Error(error.message);
        savedTemplateId = data?.id;
      }

      if (!savedTemplateId) throw new Error('Failed to save template');

      // Track ID mappings to update local state after save
      const sectionIdMap = new Map<string, string>(); // oldId -> newId
      const itemIdMap = new Map<string, string>(); // oldId -> newId

      // For auto-save, only save sections and items (simplified - just new items)
      // Full delete/update logic runs on manual save
      for (const section of sections) {
        let sectionId = section.id;

        if (section.isNew) {
          const { data, error } = await createSection({
            template_id: savedTemplateId,
            name: section.name,
            sort_order: section.sort_order,
          });
          if (error) throw new Error(error.message);
          if (data?.id) {
            sectionIdMap.set(section.id, data.id);
            sectionId = data.id;
          }
        }

        for (const item of section.items) {
          if (item.isNew) {
            const { data, error } = await createItem({
              section_id: sectionId,
              label: item.label,
              item_type: item.item_type,
              is_required: item.is_required,
              photo_rule: item.photo_rule,
              options: item.options,
              sort_order: item.sort_order,
              help_text: item.help_text ?? null,
              placeholder_text: item.placeholder_text ?? null,
              default_value: item.default_value ?? null,
              min_value: item.min_value ?? null,
              max_value: item.max_value ?? null,
              datetime_mode: item.datetime_mode ?? null,
              rating_max: item.rating_max ?? null,
              declaration_text: item.declaration_text ?? null,
              signature_requires_name: item.signature_requires_name ?? null,
              condition_field_id: item.condition_field_id ?? null,
              condition_operator: item.condition_operator ?? null,
              condition_value: item.condition_value ?? null,
              step_value: item.step_value ?? null,
              rating_style: item.rating_style ?? null,
              unit_type: item.unit_type ?? null,
              unit_options: item.unit_options ?? null,
              default_unit: item.default_unit ?? null,
              counter_min: item.counter_min ?? null,
              counter_max: item.counter_max ?? null,
              counter_step: item.counter_step ?? null,
              max_media_count: item.max_media_count ?? null,
              media_required: item.media_required ?? null,
              max_duration_seconds: item.max_duration_seconds ?? null,
              warning_days_before: item.warning_days_before ?? null,
              sub_items: item.sub_items ?? null,
              min_entries: item.min_entries ?? null,
              max_entries: item.max_entries ?? null,
              instruction_image_url: item.instruction_image_url ?? null,
              instruction_style: item.instruction_style ?? null,
              asset_types: item.asset_types ?? null,
            });
            if (error) throw new Error(error.message);
            if (data?.id) {
              itemIdMap.set(item.id, data.id);
            }
          }
        }
      }

      // Update local state with real IDs and clear isNew flags
      if (sectionIdMap.size > 0 || itemIdMap.size > 0) {
        setSections(prevSections => prevSections.map(section => {
          const newSectionId = sectionIdMap.get(section.id);
          return {
            ...section,
            id: newSectionId || section.id,
            isNew: newSectionId ? false : section.isNew,
            items: section.items.map(item => {
              const newItemId = itemIdMap.get(item.id);
              return {
                ...item,
                id: newItemId || item.id,
                isNew: newItemId ? false : item.isNew,
              };
            }),
          };
        }));

        // Also update originalSectionIds and originalItemIds to track what's in the DB
        if (sectionIdMap.size > 0) {
          setOriginalSectionIds(prev => {
            const newSet = new Set(prev);
            sectionIdMap.forEach((newId) => newSet.add(newId));
            return newSet;
          });
        }
        if (itemIdMap.size > 0) {
          setOriginalItemIds(prev => {
            const newSet = new Set(prev);
            itemIdMap.forEach((newId) => newSet.add(newId));
            return newSet;
          });
        }
      }

      // Show brief "Saved" toast
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 1500);
      setIsDirty(false);
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Silent failure for auto-save - don't show alert
    } finally {
      setAutoSaving(false);
    }
  }, [name, description, sections, isDirty, saving, autoSaving, organisationId, userId, templateId, isEditing, isPublished]);

  // Auto-save interval (every 30 seconds when dirty)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && !saving && !autoSaving && initialLoadComplete.current) {
        performAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isDirty, saving, autoSaving, performAutoSave]);

  // Handle back button press with unsaved changes warning
  const handleBackPress = useCallback(() => {
    if (isDirty) {
      showDestructiveConfirm(
        'Unsaved Changes',
        'You have changes that haven\'t been saved.',
        () => navigation.goBack(),
        undefined,
        'Discard Changes',
        'Keep Editing'
      );
      return true; // Prevent default back behavior
    }
    return false; // Allow default back behavior
  }, [isDirty, navigation]);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => subscription.remove();
    }, [handleBackPress])
  );

  // Handle navigation header back button and title with dirty indicator
  useEffect(() => {
    const getHeaderTitle = () => {
      if (isEditing) return 'Edit Template';
      if (isFromAI) return 'AI Template';
      return 'New Template';
    };

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {getHeaderTitle()}
          </Text>
          {isDirty && <View style={styles.dirtyIndicator} />}
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (!handleBackPress()) {
              navigation.goBack();
            }
          }}
          style={styles.headerBackButton}
        >
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setIsPreviewMode(!isPreviewMode)}
          style={styles.headerToggleButton}
        >
          <Text style={styles.headerToggleText}>
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleBackPress, isDirty, isEditing, isFromAI, isPreviewMode]);

  const handleSave = async (publish: boolean = false) => {
    if (!name.trim()) {
      showNotification('Error', 'Please enter a template name');
      return;
    }

    if (!organisationId || !userId) {
      showNotification('Error', 'Session expired. Please log in again.');
      return;
    }

    setSaving(true);

    try {
      let savedTemplateId = templateId;

      // Create or update template
      if (isEditing && templateId) {
        const { error } = await updateTemplate(templateId, {
          name: name.trim(),
          description: description.trim() || null,
          is_published: publish ? true : isPublished,
        });
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await createTemplate({
          organisation_id: organisationId,
          record_type_id: null, // Templates can optionally be linked to a record type
          name: name.trim(),
          description: description.trim() || null,
          is_published: publish,
          created_by: userId,
        });
        if (error) throw new Error(error.message);
        savedTemplateId = data?.id;
      }

      if (!savedTemplateId) throw new Error('Failed to save template');

      // Collect current section and item IDs
      const currentSectionIds = new Set(sections.map((s) => s.id));
      const currentItemIds = new Set(
        sections.flatMap((s) => s.items.map((i) => i.id))
      );

      // Delete removed sections (cascade deletes their items)
      for (const originalSectionId of originalSectionIds) {
        if (!currentSectionIds.has(originalSectionId)) {
          const { error } = await deleteSection(originalSectionId);
          if (error) throw new Error(error.message);
        }
      }

      // Delete removed items (from sections that still exist)
      for (const originalItemId of originalItemIds) {
        if (!currentItemIds.has(originalItemId)) {
          // Only delete if not already cascade-deleted with its section
          const itemStillExists = sections.some((s) =>
            !s.isNew && originalSectionIds.has(s.id)
          );
          if (itemStillExists) {
            const { error } = await deleteItem(originalItemId);
            // Ignore error if item was already deleted (cascade from section)
            if (error && !error.message.includes('No rows')) {
              throw new Error(error.message);
            }
          }
        }
      }

      // Create or update sections and their items
      for (const section of sections) {
        let sectionId = section.id;

        if (section.isNew) {
          // Create new section
          const { data, error } = await createSection({
            template_id: savedTemplateId,
            name: section.name,
            sort_order: section.sort_order,
          });
          if (error) throw new Error(error.message);
          sectionId = data?.id || sectionId;
        } else {
          // Update existing section
          const { error } = await updateSection(section.id, {
            name: section.name,
            sort_order: section.sort_order,
          });
          if (error) throw new Error(error.message);
        }

        // Create or update items
        for (const item of section.items) {
          const itemData = {
            label: item.label,
            item_type: item.item_type,
            is_required: item.is_required,
            photo_rule: item.photo_rule,
            options: item.options,
            sort_order: item.sort_order,
            // New fields with null defaults
            help_text: item.help_text ?? null,
            placeholder_text: item.placeholder_text ?? null,
            default_value: item.default_value ?? null,
            min_value: item.min_value ?? null,
            max_value: item.max_value ?? null,
            datetime_mode: item.datetime_mode ?? null,
            rating_max: item.rating_max ?? null,
            declaration_text: item.declaration_text ?? null,
            signature_requires_name: item.signature_requires_name ?? null,
            condition_field_id: item.condition_field_id ?? null,
            condition_operator: item.condition_operator ?? null,
            condition_value: item.condition_value ?? null,
            // Extended field type properties
            step_value: item.step_value ?? null,
            rating_style: item.rating_style ?? null,
            unit_type: item.unit_type ?? null,
            unit_options: item.unit_options ?? null,
            default_unit: item.default_unit ?? null,
            counter_min: item.counter_min ?? null,
            counter_max: item.counter_max ?? null,
            counter_step: item.counter_step ?? null,
            max_media_count: item.max_media_count ?? null,
            media_required: item.media_required ?? null,
            max_duration_seconds: item.max_duration_seconds ?? null,
            warning_days_before: item.warning_days_before ?? null,
            sub_items: item.sub_items ?? null,
            min_entries: item.min_entries ?? null,
            max_entries: item.max_entries ?? null,
            instruction_image_url: item.instruction_image_url ?? null,
            instruction_style: item.instruction_style ?? null,
            asset_types: item.asset_types ?? null,
          };

          if (item.isNew) {
            // Create new item
            const { error } = await createItem({
              section_id: sectionId,
              ...itemData,
            });
            if (error) throw new Error(error.message);
          } else {
            // Update existing item
            const { error } = await updateItem(item.id, itemData);
            if (error) throw new Error(error.message);
          }
        }
      }

      setIsDirty(false); // Reset dirty state before navigating
      navigation.goBack();
    } catch (err) {
      showNotification('Error', err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = () => {
    const newSection: LocalSection = {
      id: generateTempId(),
      name: `Section ${sections.length + 1}`,
      sort_order: sections.length,
      items: [],
      isNew: true,
    };
    setSections([...sections, newSection]);
    setExpandedSection(newSection.id);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<LocalSection>) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    showDestructiveConfirm(
      'Delete Section',
      'Are you sure you want to delete this section and all its items?',
      () => {
        setSections(sections.filter((s) => s.id !== sectionId));
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];

    // Update sort_order
    newSections.forEach((s, i) => {
      s.sort_order = i;
    });

    setSections(newSections);
  };

  const handleDuplicateSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    // Create a copy with new IDs
    const duplicatedSection: LocalSection = {
      id: generateTempId(),
      name: `${section.name} (Copy)`,
      sort_order: sectionIndex + 1,
      items: section.items.map((item) => ({
        ...item,
        id: generateTempId(),
        isNew: true,
      })),
      isNew: true,
    };

    // Insert after the original section
    const newSections = [...sections];
    newSections.splice(sectionIndex + 1, 0, duplicatedSection);

    // Update sort_order for all sections
    newSections.forEach((s, i) => {
      s.sort_order = i;
    });

    setSections(newSections);
    setExpandedSection(duplicatedSection.id);
  };

  const handleMoveSectionToPosition = (sectionId: string, position: 'top' | 'bottom') => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const newSections = [...sections];
    const [section] = newSections.splice(index, 1);

    if (position === 'top') {
      newSections.unshift(section);
    } else {
      newSections.push(section);
    }

    // Update sort_order
    newSections.forEach((s, i) => {
      s.sort_order = i;
    });

    setSections(newSections);
  };

  const handleReorderSections = (reorderedSections: LocalSection[]) => {
    // Update sort_order for all sections
    const updated = reorderedSections.map((s, i) => ({
      ...s,
      sort_order: i,
    }));
    setSections(updated);
  };

  const handleMoveItemToSection = (sourceSectionId: string, itemId: string, targetSectionId: string) => {
    const sourceSection = sections.find((s) => s.id === sourceSectionId);
    const targetSection = sections.find((s) => s.id === targetSectionId);
    if (!sourceSection || !targetSection) return;

    const itemToMove = sourceSection.items.find((i) => i.id === itemId);
    if (!itemToMove) return;

    // Remove from source section
    const updatedSourceItems = sourceSection.items.filter((i) => i.id !== itemId);
    // Update sort_order for remaining items
    updatedSourceItems.forEach((item, idx) => {
      item.sort_order = idx;
    });

    // Add to target section at the end
    const updatedItemToMove = {
      ...itemToMove,
      sort_order: targetSection.items.length,
    };
    const updatedTargetItems = [...targetSection.items, updatedItemToMove];

    // Update sections state
    setSections(sections.map((s) => {
      if (s.id === sourceSectionId) {
        return { ...s, items: updatedSourceItems };
      }
      if (s.id === targetSectionId) {
        return { ...s, items: updatedTargetItems };
      }
      return s;
    }));
  };

  const renderSectionItem = ({ item: section, index, drag, isActive }: { item: LocalSection; index: number; drag: () => void; isActive: boolean }) => {
    return (
      <SectionEditor
        section={section}
        isExpanded={expandedSection === section.id}
        onToggleExpand={() =>
          setExpandedSection(expandedSection === section.id ? null : section.id)
        }
        onUpdateSection={(updates) => handleUpdateSection(section.id, updates)}
        onDeleteSection={() => handleDeleteSection(section.id)}
        onMoveUp={index > 0 ? () => handleMoveSection(section.id, 'up') : undefined}
        onMoveDown={
          index < sections.length - 1
            ? () => handleMoveSection(section.id, 'down')
            : undefined
        }
        onAddItem={() => handleAddItem(section.id)}
        onUpdateItem={(itemId, updates) => handleUpdateItem(section.id, itemId, updates)}
        onDeleteItem={(itemId) => handleDeleteItem(section.id, itemId)}
        onMoveItem={(itemId, direction) => handleMoveItem(section.id, itemId, direction)}
        onDuplicateItem={(itemId) => handleDuplicateItem(section.id, itemId)}
        onReorderItems={(reorderedItems) => handleUpdateSection(section.id, { items: reorderedItems })}
        onMoveItemToSection={(itemId, targetSectionId) => handleMoveItemToSection(section.id, itemId, targetSectionId)}
        allSections={sections.map((s) => ({ id: s.id, name: s.name }))}
        onShowActions={() => setActionSheetSection(section)}
        drag={drag}
        isActive={isActive}
      />
    );
  };

  const handleDuplicateItem = (sectionId: string, itemId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const itemIndex = section.items.findIndex((i) => i.id === itemId);
    const item = section.items[itemIndex];
    if (!item) return;

    // Create a copy with new ID
    const duplicatedItem: LocalItem = {
      ...item,
      id: generateTempId(),
      label: `${item.label} (Copy)`,
      sort_order: itemIndex + 1,
      isNew: true,
    };

    // Insert after the original item
    const newItems = [...section.items];
    newItems.splice(itemIndex + 1, 0, duplicatedItem);

    // Update sort_order for all items
    newItems.forEach((i, idx) => {
      i.sort_order = idx;
    });

    handleUpdateSection(sectionId, { items: newItems });
  };


  const handleAddItem = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newItem: LocalItem = {
      id: generateTempId(),
      label: '',
      item_type: 'pass_fail',
      is_required: true,
      photo_rule: 'on_fail',
      options: null,
      sort_order: section.items.length,
      isNew: true,
    };

    handleUpdateSection(sectionId, {
      items: [...section.items, newItem],
    });
  };

  const handleUpdateItem = (sectionId: string, itemId: string, updates: Partial<LocalItem>) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    handleUpdateSection(sectionId, {
      items: section.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    handleUpdateSection(sectionId, {
      items: section.items.filter((item) => item.id !== itemId),
    });
  };

  const handleMoveItem = (sectionId: string, itemId: string, direction: 'up' | 'down') => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const index = section.items.findIndex((i) => i.id === itemId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === section.items.length - 1)
    ) {
      return;
    }

    const newItems = [...section.items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];

    // Update sort_order
    newItems.forEach((item, i) => {
      item.sort_order = i;
    });

    handleUpdateSection(sectionId, { items: newItems });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading template...</Text>
      </View>
    );
  }

  // Render Preview Mode
  if (isPreviewMode) {
    return (
      <View style={styles.container}>
        <TemplatePreview
          name={name}
          description={description}
          sections={sections}
        />

        {/* Footer with toggle back to edit */}
        <View style={styles.previewFooterBar}>
          <TouchableOpacity
            style={styles.backToEditButton}
            onPress={() => setIsPreviewMode(false)}
          >
            <Text style={styles.backToEditButtonText}>← Back to Editor</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render Edit Mode
  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <NestableScrollContainer
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Template Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Template Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Daily Security Check"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of this template"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Sections */}
          <View style={styles.sectionsHeader}>
            <Text style={styles.sectionTitle}>Sections</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddSection}>
              <Text style={styles.addButtonText}>+ Add Section</Text>
            </TouchableOpacity>
          </View>

          {sections.length === 0 && (
            <View style={styles.emptySections}>
              <Text style={styles.emptySectionsText}>
                No sections yet. Add a section to organize your inspection items.
              </Text>
            </View>
          )}

          {/* Section List with Drag-Drop */}
          {sections.length > 0 && (
            <NestableDraggableList
              data={sections}
              keyExtractor={(section) => section.id}
              onDragEnd={({ data }) => handleReorderSections(data)}
              renderItem={renderSectionItem}
              scrollEnabled={false}
            />
          )}
        </NestableScrollContainer>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.saveDraftButton]}
          onPress={() => handleSave(false)}
          disabled={saving || autoSaving}
        >
          <Text style={styles.saveDraftButtonText}>
            {saving ? 'Saving...' : autoSaving ? 'Auto-saving...' : 'Save Draft'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.publishButton]}
          onPress={() => handleSave(true)}
          disabled={saving || autoSaving}
        >
          <Text style={styles.publishButtonText}>
            {saving ? 'Saving...' : isPublished ? 'Update' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Saved Toast */}
      {showSavedToast && (
        <View style={styles.savedToast}>
          <Text style={styles.savedToastText}>Saved</Text>
        </View>
      )}

      {/* Section Action Sheet */}
      {actionSheetSection && (
        <SectionActionSheet
          visible={!!actionSheetSection}
          sectionName={actionSheetSection.name}
          canMoveUp={sections.findIndex((s) => s.id === actionSheetSection.id) > 0}
          canMoveDown={sections.findIndex((s) => s.id === actionSheetSection.id) < sections.length - 1}
          onClose={() => setActionSheetSection(null)}
          onDuplicate={() => handleDuplicateSection(actionSheetSection.id)}
          onMoveUp={() => handleMoveSection(actionSheetSection.id, 'up')}
          onMoveDown={() => handleMoveSection(actionSheetSection.id, 'down')}
          onMoveToTop={() => handleMoveSectionToPosition(actionSheetSection.id, 'top')}
          onMoveToBottom={() => handleMoveSectionToPosition(actionSheetSection.id, 'bottom')}
          onDelete={() => handleDeleteSection(actionSheetSection.id)}
        />
      )}
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
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
  sectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  emptySections: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptySectionsText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
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
    minHeight: 48, // Minimum touch target
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  saveDraftButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  publishButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  publishButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  dirtyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  headerBackButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerBackText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  headerToggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerToggleText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  previewFooterBar: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  backToEditButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  backToEditButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  savedToast: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    marginLeft: -40,
    width: 80,
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.elevated,
  },
  savedToastText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
