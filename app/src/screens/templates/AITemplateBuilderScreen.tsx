import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { ChatBubble } from '../../components/templates/ChatBubble';
import { QuickReplyChips } from '../../components/templates/QuickReplyChips';
import { TemplatePreviewCard } from '../../components/templates/TemplatePreviewCard';
import {
  sendChatMessage,
  createChatMessage,
  formatMessagesForApi,
} from '../../services/aiTemplateBuilder';
import { createTemplate, createSection, createItem, ItemType, PhotoRule } from '../../services/templates';
import { useAuthStore } from '../../store/authStore';
import type {
  ChatMessage,
  ConversationStep,
  GeneratedTemplate,
  INITIAL_AI_MESSAGE,
  INITIAL_QUICK_REPLIES,
} from '../../types/templateBuilder';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'AITemplateBuilder'>;

const STEP_LABELS: Record<ConversationStep, string> = {
  intent: 'Step 1 of 4',
  context: 'Step 2 of 4',
  refinement: 'Step 3 of 4',
  generation: 'Complete',
};

export function AITemplateBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const { organisation, user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('intent');
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize with AI greeting
  useEffect(() => {
    const initialMessage = createChatMessage(
      'assistant',
      "Hi, I'm Dexter! I'll help you build the perfect inspection template.\n\nWhat industry are you in? Property, construction, fleet, food service, healthcare, or something else? Once I know that, I can ask the right questions to create a template that really works for you."
    );
    setMessages([initialMessage]);
    setQuickReplies([]); // No predefined options - let user type freely
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, generatedTemplate]);

  const handleSendMessage = async (userMessage: string) => {
    if (isLoading) return;

    // Add user message to chat
    const userChatMessage = createChatMessage('user', userMessage);
    const updatedMessages = [...messages, userChatMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setQuickReplies([]);

    try {
      const { data, error } = await sendChatMessage(
        formatMessagesForApi(updatedMessages),
        currentStep
      );

      if (error) {
        showNotification('Error', error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        // Add AI response
        const aiMessage = createChatMessage('assistant', data.message);
        setMessages([...updatedMessages, aiMessage]);
        setQuickReplies(data.quickReplies || []);
        setCurrentStep(data.suggestedStep as ConversationStep);

        if (data.generatedTemplate) {
          setGeneratedTemplate(data.generatedTemplate);
        }
      }
    } catch (err) {
      showNotification('Error', 'Failed to communicate with AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewEdit = () => {
    if (!generatedTemplate) return;

    // Navigate to template editor with generated data
    navigation.replace('TemplateEditor', {
      initialData: generatedTemplate,
    } as any);
  };

  const handleUseTemplate = async () => {
    if (!generatedTemplate || !organisation?.id || !user?.id) {
      showNotification('Error', 'Unable to save template. Please try again.');
      return;
    }

    setSaving(true);

    try {
      // Create the template
      const { data: template, error: templateError } = await createTemplate({
        name: generatedTemplate.name,
        description: generatedTemplate.description || null,
        organisation_id: organisation.id,
        record_type_id: null, // Will need to be assigned later
        is_published: false,
        created_by: user.id,
      });

      if (templateError || !template) {
        throw new Error(templateError?.message || 'Failed to create template');
      }

      // Create sections and items
      for (const sectionData of generatedTemplate.sections) {
        const { data: section, error: sectionError } = await createSection({
          template_id: template.id,
          name: sectionData.name,
          sort_order: sectionData.sort_order,
        });

        if (sectionError || !section) {
          console.error('Failed to create section:', sectionError?.message);
          continue;
        }

        // Create items for this section
        for (let i = 0; i < sectionData.items.length; i++) {
          const itemData = sectionData.items[i];
          const { error: itemError } = await createItem({
            section_id: section.id,
            label: itemData.label,
            item_type: itemData.item_type as ItemType,
            is_required: itemData.is_required,
            photo_rule: itemData.photo_rule as PhotoRule,
            options: itemData.options || null,
            sort_order: i + 1,
            // Optional fields - set to null
            help_text: null,
            placeholder_text: null,
            default_value: null,
            min_value: null,
            max_value: null,
            step_value: null,
            datetime_mode: null,
            rating_max: null,
            rating_style: null,
            declaration_text: null,
            signature_requires_name: null,
            condition_field_id: null,
            condition_operator: null,
            condition_value: null,
            unit_type: null,
            unit_options: null,
            default_unit: null,
            counter_min: null,
            counter_max: null,
            counter_step: null,
            max_media_count: null,
            media_required: null,
            max_duration_seconds: null,
            warning_days_before: null,
            sub_items: null,
            min_entries: null,
            max_entries: null,
            instruction_image_url: null,
            instruction_style: null,
            asset_types: null,
            coloured_options: null,
            display_style: null,
          });

          if (itemError) {
            console.error('Failed to create item:', itemError.message);
          }
        }
      }

      // Navigate back to template list
      navigation.popToTop();
    } catch (err) {
      showNotification(
        'Error',
        err instanceof Error ? err.message : 'Failed to save template'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (messages.length > 1 && !generatedTemplate) {
      showDestructiveConfirm(
        'Discard Progress?',
        'Your conversation will be lost if you go back.',
        () => navigation.goBack(),
        undefined,
        'Discard',
        'Cancel'
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create with Dexter</Text>
        <Text style={styles.stepIndicator}>{STEP_LABELS[currentStep]}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressContainer}>
        {(['intent', 'context', 'refinement', 'generation'] as ConversationStep[]).map(
          (step, index) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                currentStep === step && styles.progressDotActive,
                (['intent', 'context', 'refinement', 'generation'].indexOf(currentStep) > index) &&
                  styles.progressDotComplete,
              ]}
            />
          )
        )}
      </View>

      {/* Chat area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {/* Generated template preview */}
        {generatedTemplate && !isLoading && (
          <TemplatePreviewCard
            template={generatedTemplate}
            onReviewEdit={handleReviewEdit}
            onUseTemplate={handleUseTemplate}
            saving={saving}
          />
        )}
      </ScrollView>

      {/* Chat input */}
      {!generatedTemplate && (
        <View style={styles.inputContainer}>
          <QuickReplyChips
            options={quickReplies}
            onSelect={handleSendMessage}
            disabled={isLoading}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  stepIndicator: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  progressDotActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: colors.success,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
});
