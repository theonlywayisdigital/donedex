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
  Image,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Camera, Upload, FileText } from 'lucide-react-native';
import { TemplatesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { ChatBubble } from '../../components/templates/ChatBubble';
import { QuickReplyChips } from '../../components/templates/QuickReplyChips';
import { TemplatePreviewCard } from '../../components/templates/TemplatePreviewCard';
import { launchCamera, launchImageLibrary } from '../../services/imagePicker';
import { compressImageToBase64 } from '../../services/imageCompression';
import {
  analyzeDocument,
  createChatMessage,
  getMimeType,
} from '../../services/documentTemplateBuilder';
import { createTemplate, createSection, createItem, ItemType, PhotoRule } from '../../services/templates';
import { useAuthStore } from '../../store/authStore';
import type { ChatMessage, GeneratedTemplate } from '../../types/templateBuilder';
import * as DocumentPicker from 'expo-document-picker';
import { convertPdfToImages, isPdfConversionSupported } from '../../services/pdfConverter';
import { convertDocxToImages, isDocxConversionSupported } from '../../services/docxConverter';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'DocumentImport'>;

type ScreenState = 'upload' | 'analyzing' | 'result';

interface ImageData {
  base64: string;
  mimeType: string;
}

export function DocumentImportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { organisation, user } = useAuthStore();

  const [screenState, setScreenState] = useState<ScreenState>('upload');
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [documentImages, setDocumentImages] = useState<ImageData[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Smooth progress animation
  useEffect(() => {
    if (screenState !== 'analyzing') {
      setProgress(0);
      setIsComplete(false);
      return;
    }

    // If complete, quickly animate to 100%
    if (isComplete) {
      const timer = setTimeout(() => setProgress(100), 50);
      return () => clearTimeout(timer);
    }

    // Gradually increase progress (slows down as it gets higher)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Stop at 90% until complete
        // Slow down as we progress
        const increment = prev < 30 ? 2 : prev < 60 ? 1 : 0.5;
        return Math.min(prev + increment, 90);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [screenState, isComplete]);

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photo = result.assets[0];
        await processImage(photo.uri);
      }
    } catch (err) {
      console.error('Camera error:', err);
      showNotification('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Web-specific file handler
  const handleWebFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const mimeType = file.type || '';
    const fileName = file.name?.toLowerCase() || '';

    // Create object URL for the file
    const fileUrl = URL.createObjectURL(file);

    await handleFileSelected(fileUrl, mimeType, fileName);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelected = async (uri: string, mimeType: string, fileName: string) => {
    // Handle DOCX/DOC files
    if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx')
    ) {
      await processDocx(uri);
      return;
    }

    // Handle PDF files
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      await processPdf(uri);
      return;
    }

    // Handle image files
    if (
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.webp')
    ) {
      await processImage(uri, mimeType);
      return;
    }

    // Unsupported file type
    showNotification(
      'Unsupported File',
      'Please upload an image (JPG, PNG), PDF, or Word document.'
    );
  };

  const handleUploadFile = async () => {
    // On web, use the hidden file input
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }

    // On native, use document picker
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        await handleFileSelected(
          file.uri,
          file.mimeType || '',
          file.name?.toLowerCase() || ''
        );
      }
    } catch (err) {
      console.error('File picker error:', err);
      showNotification('Error', 'Failed to select file. Please try again.');
    }
  };

  const processPdf = async (uri: string) => {
    // Check if PDF conversion is supported on this platform
    if (!isPdfConversionSupported()) {
      showNotification(
        'PDF Not Supported',
        'PDF conversion is not available on this device. Please take photos of each page, or use the web app to upload PDFs.'
      );
      return;
    }

    setScreenState('analyzing');
    setDocumentPreview(uri);
    setIsLoading(true);
    setIsComplete(false);
    setProgressStatus('Loading PDF...');

    try {
      setProgressStatus('Converting PDF pages...');

      // Convert PDF pages to images
      const conversionResult = await convertPdfToImages(uri, {
        maxPages: 10,
        scale: 1.5,
        quality: 0.8,
      });

      if (conversionResult.pages.length === 0) {
        throw new Error('No pages found in PDF');
      }

      setProgressStatus(`Processed ${conversionResult.pages.length} page${conversionResult.pages.length > 1 ? 's' : ''}...`);

      // Convert pages to ImageData format
      const images: ImageData[] = conversionResult.pages.map((page) => ({
        base64: page.base64,
        mimeType: 'image/jpeg',
      }));

      setDocumentImages(images);

      setProgressStatus('Dexter is reading your document...');

      // Analyze all pages
      const { data, error } = await analyzeDocument(images);

      if (error) {
        showNotification('Error', error.message);
        setScreenState('upload');
        return;
      }

      // Mark as complete - this triggers smooth animation to 100%
      setIsComplete(true);
      setProgressStatus('Done!');

      // Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data) {
        // Add Dexter's response as a message
        const aiMessage = createChatMessage('assistant', data.message);
        setMessages([aiMessage]);
        setQuickReplies(data.quickReplies || []);
        setGeneratedTemplate(data.generatedTemplate);
        setScreenState('result');
      }
    } catch (err) {
      console.error('PDF processing error:', err);
      showNotification(
        'Error',
        err instanceof Error ? err.message : 'Failed to process PDF. Please try again.'
      );
      setScreenState('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const processDocx = async (uri: string) => {
    // Check if DOCX conversion is supported on this platform
    if (!isDocxConversionSupported()) {
      showNotification(
        'Word Documents Not Supported',
        'Word document conversion is not available on this device. Please convert to PDF first, or use the web app.'
      );
      return;
    }

    setScreenState('analyzing');
    setDocumentPreview(null); // DOCX doesn't have a simple preview
    setIsLoading(true);
    setIsComplete(false);
    setProgressStatus('Loading Word document...');

    try {
      setProgressStatus('Rendering document...');

      // Convert DOCX pages to images
      const conversionResult = await convertDocxToImages(uri, {
        maxPages: 10,
        scale: 1.5,
        quality: 0.8,
      });

      if (conversionResult.pages.length === 0) {
        throw new Error('No pages found in document');
      }

      setProgressStatus(`Captured ${conversionResult.pages.length} page${conversionResult.pages.length > 1 ? 's' : ''}...`);

      // Convert pages to ImageData format
      const images: ImageData[] = conversionResult.pages.map((page) => ({
        base64: page.base64,
        mimeType: 'image/jpeg',
      }));

      setDocumentImages(images);

      setProgressStatus('Dexter is reading your document...');

      // Analyze all pages
      const { data, error } = await analyzeDocument(images);

      if (error) {
        showNotification('Error', error.message);
        setScreenState('upload');
        return;
      }

      // Mark as complete - this triggers smooth animation to 100%
      setIsComplete(true);
      setProgressStatus('Done!');

      // Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data) {
        // Add Dexter's response as a message
        const aiMessage = createChatMessage('assistant', data.message);
        setMessages([aiMessage]);
        setQuickReplies(data.quickReplies || []);
        setGeneratedTemplate(data.generatedTemplate);
        setScreenState('result');
      }
    } catch (err) {
      console.error('DOCX processing error:', err);
      showNotification(
        'Error',
        err instanceof Error ? err.message : 'Failed to process Word document. Please try again.'
      );
      setScreenState('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromLibrary = async () => {
    try {
      const result = await launchImageLibrary({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photo = result.assets[0];
        await processImage(photo.uri);
      }
    } catch (err) {
      console.error('Library error:', err);
      showNotification('Error', 'Failed to select image. Please try again.');
    }
  };

  const processImage = async (uri: string, mimeType?: string) => {
    setScreenState('analyzing');
    setDocumentPreview(uri);
    setIsLoading(true);
    setIsComplete(false);
    setProgressStatus('Preparing image...');

    try {
      setProgressStatus('Compressing image...');

      // Compress and convert to base64
      const compressed = await compressImageToBase64(uri, {
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 0.8,
      });

      if (!compressed.base64) {
        throw new Error('Failed to convert image to base64');
      }

      setProgressStatus('Processing...');

      const imageData: ImageData = {
        base64: compressed.base64,
        mimeType: mimeType || getMimeType(uri),
      };

      setDocumentImages([imageData]);

      setProgressStatus('Dexter is reading your document...');

      // Analyze the document
      const { data, error } = await analyzeDocument([imageData]);

      if (error) {
        showNotification('Error', error.message);
        setScreenState('upload');
        return;
      }

      // Mark as complete - this triggers smooth animation to 100%
      setIsComplete(true);
      setProgressStatus('Done!');

      // Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data) {
        // Add Dexter's response as a message
        const aiMessage = createChatMessage('assistant', data.message);
        setMessages([aiMessage]);
        setQuickReplies(data.quickReplies || []);
        setGeneratedTemplate(data.generatedTemplate);
        setScreenState('result');
      }
    } catch (err) {
      console.error('Process image error:', err);
      showNotification('Error', 'Failed to analyze document. Please try again.');
      setScreenState('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (isLoading) return;

    // Add user message to chat
    const userChatMessage = createChatMessage('user', userMessage);
    const updatedMessages = [...messages, userChatMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setQuickReplies([]);

    try {
      const { data, error } = await analyzeDocument(documentImages, updatedMessages);

      if (error) {
        showNotification('Error', error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        const aiMessage = createChatMessage('assistant', data.message);
        setMessages([...updatedMessages, aiMessage]);
        setQuickReplies(data.quickReplies || []);

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
        record_type_id: null,
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
    if (screenState !== 'upload') {
      showDestructiveConfirm(
        'Discard Progress?',
        'Your analysis will be lost if you go back.',
        () => navigation.goBack(),
        undefined,
        'Discard',
        'Cancel'
      );
    } else {
      navigation.goBack();
    }
  };

  const handleStartOver = () => {
    showDestructiveConfirm(
      'Start Over?',
      'This will discard the current analysis and let you upload a new document.',
      () => {
        setScreenState('upload');
        setDocumentPreview(null);
        setDocumentImages([]);
        setMessages([]);
        setQuickReplies([]);
        setGeneratedTemplate(null);
      },
      undefined,
      'Start Over',
      'Cancel'
    );
  };

  const renderUploadState = () => (
    <View style={styles.uploadContainer}>
      <View style={styles.uploadIconContainer}>
        <FileText size={64} color={colors.primary.DEFAULT} />
      </View>

      <Text style={styles.uploadTitle}>Upload your existing form</Text>
      <Text style={styles.uploadSubtitle}>
        Take a photo of your paper form, upload an image, or upload a PDF. Dexter will analyze it and create a digital template.
      </Text>

      <View style={styles.uploadButtons}>
        <TouchableOpacity style={styles.uploadButton} onPress={handleTakePhoto}>
          <Camera size={20} color={colors.white} />
          <Text style={styles.uploadButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadButton, styles.uploadButtonSecondary]}
          onPress={handleUploadFile}
        >
          <Upload size={20} color={colors.text.primary} />
          <Text style={[styles.uploadButtonText, styles.uploadButtonTextSecondary]}>
            Upload File
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.supportedFormats}>Supported: JPG, PNG, PDF, DOCX (web only)</Text>

      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={handleWebFileSelect as any}
        />
      )}
    </View>
  );

  const renderAnalyzingState = () => (
    <View style={styles.analyzingContainer}>
      {documentPreview && (
        <Image source={{ uri: documentPreview }} style={styles.documentPreview} resizeMode="contain" />
      )}

      <View style={styles.analyzingContent}>
        <Text style={styles.analyzingTitle}>{progressStatus || 'Processing...'}</Text>

        {/* Progress bar */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progress)}%` }]} />
          </View>
        </View>

        <Text style={styles.analyzingSubtitle}>
          This may take a moment for longer documents
        </Text>
      </View>
    </View>
  );

  const renderResultState = () => (
    <ScrollView
      ref={scrollViewRef}
      style={styles.chatArea}
      contentContainerStyle={styles.chatContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Document thumbnail */}
      {documentPreview && (
        <TouchableOpacity style={styles.documentThumbnailContainer} onPress={handleStartOver}>
          <Image source={{ uri: documentPreview }} style={styles.documentThumbnail} resizeMode="cover" />
          <Text style={styles.documentThumbnailText}>Tap to upload different document</Text>
        </TouchableOpacity>
      )}

      {/* Chat messages */}
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
  );

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
        <Text style={styles.headerTitle}>Import from Document</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main content */}
      {screenState === 'upload' && renderUploadState()}
      {screenState === 'analyzing' && renderAnalyzingState()}
      {screenState === 'result' && renderResultState()}

      {/* Chat input for refinement */}
      {screenState === 'result' && !isLoading && (
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
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  // Upload state
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  uploadIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  uploadTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  uploadButtons: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  uploadButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  uploadButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  uploadButtonTextSecondary: {
    color: colors.text.primary,
  },
  supportedFormats: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.lg,
  },
  // Analyzing state
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  documentPreview: {
    width: 200,
    height: 280,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.neutral[100],
  },
  analyzingContent: {
    alignItems: 'center',
  },
  analyzingTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  analyzingSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  progressBarWrapper: {
    width: '100%',
    maxWidth: 280,
    marginVertical: spacing.lg,
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  // Result state
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: spacing.md,
  },
  documentThumbnailContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  documentThumbnail: {
    width: 100,
    height: 140,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  documentThumbnailText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
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
