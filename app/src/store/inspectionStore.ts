import { create } from 'zustand';
import * as reportsService from '../services/reports';
import * as templatesService from '../services/templates';
import type { Report, ReportResponse } from '../services/reports';
import type { TemplateWithSections, TemplateItem } from '../services/templates';
import {
  saveInspectionDraft,
  loadInspectionDraft,
  deleteInspectionDraft,
  addToSyncQueue,
  type InspectionDraft,
} from '../services/localStorage';
import { isOnline } from '../services/networkStatus';

// Local response state (before saving to DB)
export interface LocalResponse {
  templateItemId: string;
  itemLabel: string;
  itemType: string;
  responseValue: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  notes: string | null;
  photos: string[]; // Local URIs
  videos: string[]; // Local URIs for video recordings
}

interface InspectionState {
  // Current inspection state
  report: Report | null;
  template: TemplateWithSections | null;
  responses: Map<string, LocalResponse>; // keyed by template_item_id
  currentSectionIndex: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Computed
  totalItems: number;
  completedItems: number;
  progress: number;
  currentSection: templatesService.TemplateSectionWithItems | null;

  // Actions
  startInspection: (
    organisationId: string,
    recordId: string,
    templateId: string,
    userId: string
  ) => Promise<{ reportId: string | null; error: string | null }>;

  loadInspection: (reportId: string) => Promise<{ error: string | null }>;

  setResponse: (
    templateItemId: string,
    item: TemplateItem,
    value: string | null,
    severity?: 'low' | 'medium' | 'high' | null,
    notes?: string | null
  ) => void;

  addPhoto: (templateItemId: string, photoUri: string) => void;
  removePhoto: (templateItemId: string, photoIndex: number) => void;
  addVideo: (templateItemId: string, videoUri: string) => void;
  removeVideo: (templateItemId: string, videoIndex: number) => void;

  saveResponses: () => Promise<{ error: string | null }>;
  submitInspection: () => Promise<{ error: string | null }>;

  nextSection: () => void;
  previousSection: () => void;
  goToSection: (index: number) => void;

  resetInspection: () => void;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  // Initial state
  report: null,
  template: null,
  responses: new Map(),
  currentSectionIndex: 0,
  isLoading: false,
  isSaving: false,
  error: null,

  // Computed getters
  get totalItems() {
    const template = get().template;
    if (!template) return 0;
    return template.template_sections.reduce(
      (sum, section) => sum + section.template_items.length,
      0
    );
  },

  get completedItems() {
    const responses = get().responses;
    let completed = 0;
    responses.forEach((response) => {
      if (response.responseValue !== null) {
        completed++;
      }
    });
    return completed;
  },

  get progress() {
    const total = get().totalItems;
    if (total === 0) return 0;
    return Math.round((get().completedItems / total) * 100);
  },

  get currentSection() {
    const template = get().template;
    const index = get().currentSectionIndex;
    if (!template || index >= template.template_sections.length) return null;
    return template.template_sections[index];
  },

  // Actions
  startInspection: async (organisationId, recordId, templateId, userId) => {
    set({ isLoading: true, error: null });

    try {
      // Fetch template with sections/items
      const templateResult = await templatesService.fetchTemplateWithSections(templateId);
      if (templateResult.error || !templateResult.data) {
        set({ isLoading: false, error: templateResult.error?.message || 'Failed to load template' });
        return { reportId: null, error: templateResult.error?.message || 'Failed to load template' };
      }

      // Create new report
      const reportResult = await reportsService.createReport({
        organisation_id: organisationId,
        record_id: recordId,
        template_id: templateId,
        user_id: userId,
      });

      if (reportResult.error || !reportResult.data) {
        set({ isLoading: false, error: reportResult.error?.message || 'Failed to create report' });
        return { reportId: null, error: reportResult.error?.message || 'Failed to create report' };
      }

      // Initialize empty responses for all items
      const responses = new Map<string, LocalResponse>();
      templateResult.data.template_sections.forEach((section) => {
        section.template_items.forEach((item) => {
          responses.set(item.id, {
            templateItemId: item.id,
            itemLabel: item.label,
            itemType: item.item_type,
            responseValue: null,
            severity: null,
            notes: null,
            photos: [],
            videos: [],
          });
        });
      });

      set({
        report: reportResult.data,
        template: templateResult.data,
        responses,
        currentSectionIndex: 0,
        isLoading: false,
      });

      return { reportId: reportResult.data.id, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
      return { reportId: null, error: message };
    }
  },

  loadInspection: async (reportId) => {
    set({ isLoading: true, error: null });

    try {
      // Try to load local draft first (for offline recovery)
      const localDraft = await loadInspectionDraft(reportId);

      // Fetch report
      const reportResult = await reportsService.fetchReportById(reportId);
      if (reportResult.error || !reportResult.data) {
        // If offline and we have local draft, try to use cached template
        if (localDraft) {
          console.log('Using local draft for offline inspection');
          // For MVP, we need the template to be fetched - show error if truly offline
        }
        set({ isLoading: false, error: reportResult.error?.message || 'Failed to load report' });
        return { error: reportResult.error?.message || 'Failed to load report' };
      }

      // Fetch template
      const templateResult = await templatesService.fetchTemplateWithSections(
        reportResult.data.template_id
      );
      if (templateResult.error || !templateResult.data) {
        set({ isLoading: false, error: templateResult.error?.message || 'Failed to load template' });
        return { error: templateResult.error?.message || 'Failed to load template' };
      }

      // Fetch existing responses from server
      const responsesResult = await reportsService.fetchReportResponses(reportId);

      // Initialize responses map - merge server data with local draft
      const responses = new Map<string, LocalResponse>();
      templateResult.data.template_sections.forEach((section) => {
        section.template_items.forEach((item) => {
          const serverResponse = responsesResult.data.find(
            (r) => r.template_item_id === item.id
          );
          const localResponse = localDraft?.responses.find(
            (r) => r.templateItemId === item.id
          );

          // Prefer local draft if it's newer (for offline work recovery)
          const useLocal =
            localDraft &&
            localResponse &&
            localResponse.responseValue !== null &&
            (!serverResponse || new Date(localDraft.lastUpdated) > new Date());

          responses.set(item.id, {
            templateItemId: item.id,
            itemLabel: item.label,
            itemType: item.item_type,
            responseValue: useLocal
              ? localResponse.responseValue
              : serverResponse?.response_value || null,
            severity: useLocal
              ? (localResponse.severity as 'low' | 'medium' | 'high' | null)
              : serverResponse?.severity || null,
            notes: useLocal ? localResponse.notes : serverResponse?.notes || null,
            photos: localResponse?.photos || [],
            videos: (localResponse as { videos?: string[] })?.videos || [],
          });
        });
      });

      set({
        report: reportResult.data,
        template: templateResult.data,
        responses,
        currentSectionIndex: localDraft?.currentSectionIndex || 0,
        isLoading: false,
      });

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
      return { error: message };
    }
  },

  setResponse: (templateItemId, item, value, severity, notes) => {
    const { responses, report, template } = get();
    const newResponses = new Map(responses);

    const existing = newResponses.get(templateItemId) || {
      templateItemId,
      itemLabel: item.label,
      itemType: item.item_type,
      responseValue: null,
      severity: null,
      notes: null,
      photos: [],
      videos: [],
    };

    newResponses.set(templateItemId, {
      ...existing,
      responseValue: value,
      severity: severity !== undefined ? severity : existing.severity,
      notes: notes !== undefined ? notes : existing.notes,
    });

    set({ responses: newResponses });

    // Auto-save draft locally (fire and forget)
    if (report && template) {
      const draft: InspectionDraft = {
        reportId: report.id,
        templateId: template.id,
        recordId: report.record_id,
        responses: Array.from(newResponses.values()).map((r) => ({
          templateItemId: r.templateItemId,
          responseValue: r.responseValue,
          photos: r.photos,
          notes: r.notes,
          severity: r.severity,
        })),
        currentSectionIndex: get().currentSectionIndex,
        lastUpdated: new Date().toISOString(),
      };
      saveInspectionDraft(draft).catch(console.error);
    }
  },

  addPhoto: (templateItemId, photoUri) => {
    const { responses } = get();
    const newResponses = new Map(responses);
    const existing = newResponses.get(templateItemId);

    if (existing) {
      newResponses.set(templateItemId, {
        ...existing,
        photos: [...existing.photos, photoUri],
      });
      set({ responses: newResponses });
    }
  },

  removePhoto: (templateItemId, photoIndex) => {
    const { responses } = get();
    const newResponses = new Map(responses);
    const existing = newResponses.get(templateItemId);

    if (existing) {
      const newPhotos = [...existing.photos];
      newPhotos.splice(photoIndex, 1);
      newResponses.set(templateItemId, {
        ...existing,
        photos: newPhotos,
      });
      set({ responses: newResponses });
    }
  },

  addVideo: (templateItemId, videoUri) => {
    const { responses } = get();
    const newResponses = new Map(responses);
    const existing = newResponses.get(templateItemId);

    if (existing) {
      newResponses.set(templateItemId, {
        ...existing,
        videos: [...existing.videos, videoUri],
      });
      set({ responses: newResponses });
    }
  },

  removeVideo: (templateItemId, videoIndex) => {
    const { responses } = get();
    const newResponses = new Map(responses);
    const existing = newResponses.get(templateItemId);

    if (existing) {
      const newVideos = [...existing.videos];
      newVideos.splice(videoIndex, 1);
      newResponses.set(templateItemId, {
        ...existing,
        videos: newVideos,
      });
      set({ responses: newResponses });
    }
  },

  saveResponses: async () => {
    const { report, responses, template } = get();
    if (!report) return { error: 'No active inspection' };

    set({ isSaving: true });

    // Always save locally first
    if (template) {
      const draft: InspectionDraft = {
        reportId: report.id,
        templateId: template.id,
        recordId: report.record_id,
        responses: Array.from(responses.values()).map((r) => ({
          templateItemId: r.templateItemId,
          responseValue: r.responseValue,
          photos: r.photos,
          notes: r.notes,
          severity: r.severity,
        })),
        currentSectionIndex: get().currentSectionIndex,
        lastUpdated: new Date().toISOString(),
      };
      await saveInspectionDraft(draft).catch(console.error);
    }

    // Check if online
    const online = await isOnline();

    if (!online) {
      // Queue responses for later sync
      responses.forEach((response) => {
        if (response.responseValue !== null) {
          addToSyncQueue('response', {
            reportId: report.id,
            templateItemId: response.templateItemId,
            responseValue: response.responseValue,
            notes: response.notes,
            severity: response.severity,
          }).catch(console.error);
        }
      });

      set({ isSaving: false });
      return { error: null }; // Saved locally, will sync later
    }

    try {
      // Save each response that has a value
      const savePromises: Promise<unknown>[] = [];

      responses.forEach((response) => {
        if (response.responseValue !== null) {
          savePromises.push(
            reportsService.upsertResponse({
              report_id: report.id,
              template_item_id: response.templateItemId,
              item_label: response.itemLabel,
              item_type: response.itemType,
              response_value: response.responseValue,
              severity: response.severity,
              notes: response.notes,
            })
          );
        }
      });

      await Promise.all(savePromises);
      set({ isSaving: false });
      return { error: null };
    } catch (err) {
      // If save fails, queue for later
      responses.forEach((response) => {
        if (response.responseValue !== null) {
          addToSyncQueue('response', {
            reportId: report.id,
            templateItemId: response.templateItemId,
            responseValue: response.responseValue,
            notes: response.notes,
            severity: response.severity,
          }).catch(console.error);
        }
      });

      const message = err instanceof Error ? err.message : 'Failed to save';
      set({ isSaving: false, error: message });
      return { error: null }; // Queued for later, don't show error to user
    }
  },

  submitInspection: async () => {
    const { report } = get();
    if (!report) return { error: 'No active inspection' };

    set({ isSaving: true });

    try {
      // First save all responses
      const saveResult = await get().saveResponses();
      if (saveResult.error) {
        set({ isSaving: false });
        return saveResult;
      }

      // Then submit the report
      const submitResult = await reportsService.submitReport(report.id);

      if (submitResult.error) {
        set({ isSaving: false, error: submitResult.error.message });
        return { error: submitResult.error.message };
      }

      // Update local state
      set({
        report: { ...report, status: 'submitted', submitted_at: new Date().toISOString() },
        isSaving: false,
      });

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit';
      set({ isSaving: false, error: message });
      return { error: message };
    }
  },

  nextSection: () => {
    const { currentSectionIndex, template } = get();
    if (template && currentSectionIndex < template.template_sections.length - 1) {
      set({ currentSectionIndex: currentSectionIndex + 1 });
    }
  },

  previousSection: () => {
    const { currentSectionIndex } = get();
    if (currentSectionIndex > 0) {
      set({ currentSectionIndex: currentSectionIndex - 1 });
    }
  },

  goToSection: (index) => {
    const { template } = get();
    if (template && index >= 0 && index < template.template_sections.length) {
      set({ currentSectionIndex: index });
    }
  },

  resetInspection: () => {
    const { report } = get();

    // Clean up local draft if report was submitted
    if (report && report.status === 'submitted') {
      deleteInspectionDraft(report.id).catch(console.error);
    }

    set({
      report: null,
      template: null,
      responses: new Map(),
      currentSectionIndex: 0,
      isLoading: false,
      isSaving: false,
      error: null,
    });
  },
}));
