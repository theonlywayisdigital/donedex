import {
  mergeResponse,
  mergeAllResponses,
  detectConflicts,
} from '../conflictResolution';
import type { ReportResponse } from '../reports';
import type { InspectionDraftResponse } from '../localStorage';

describe('conflictResolution', () => {
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  describe('mergeResponse', () => {
    it('should return server data when only server response exists', () => {
      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo,
      };

      const result = mergeResponse(undefined, serverResponse, 'Test Item', 'text');

      expect(result.responseValue).toBe('Server Value');
      expect(result.severity).toBe('high');
      expect(result.notes).toBe('Server notes');
      expect(result.hadConflicts).toBe(false);
      expect(result.serverWins).toEqual(['responseValue', 'severity', 'notes']);
    });

    it('should return local data when only local response exists', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: 'low',
        notes: 'Local notes',
        photos: ['photo1.jpg'],
        fieldUpdatedAt: now,
      };

      const result = mergeResponse(localResponse, undefined, 'Test Item', 'text');

      expect(result.responseValue).toBe('Local Value');
      expect(result.severity).toBe('low');
      expect(result.notes).toBe('Local notes');
      expect(result.photos).toEqual(['photo1.jpg']);
      expect(result.hadConflicts).toBe(false);
      expect(result.localWins).toEqual(['responseValue', 'severity', 'notes']);
    });

    it('should return empty data when neither exists', () => {
      const result = mergeResponse(undefined, undefined, 'Test Item', 'text');

      expect(result.responseValue).toBeNull();
      expect(result.severity).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.hadConflicts).toBe(false);
    });

    it('should prefer newer local data with newest-wins strategy', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: 'low',
        notes: 'Local notes',
        photos: [],
        fieldUpdatedAt: now, // Newer
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo, // Older
      };

      const result = mergeResponse(localResponse, serverResponse, 'Test Item', 'text', 'newest-wins');

      expect(result.responseValue).toBe('Local Value');
      expect(result.severity).toBe('low');
      expect(result.notes).toBe('Local notes');
      expect(result.hadConflicts).toBe(true);
      expect(result.localWins).toEqual(['responseValue', 'severity', 'notes']);
    });

    it('should prefer newer server data with newest-wins strategy', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: 'low',
        notes: 'Local notes',
        photos: [],
        fieldUpdatedAt: twoHoursAgo, // Older
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: now, // Newer
      };

      const result = mergeResponse(localResponse, serverResponse, 'Test Item', 'text', 'newest-wins');

      expect(result.responseValue).toBe('Server Value');
      expect(result.severity).toBe('high');
      expect(result.notes).toBe('Server notes');
      expect(result.hadConflicts).toBe(true);
      expect(result.serverWins).toEqual(['responseValue', 'severity', 'notes']);
    });

    it('should always prefer local with local-wins strategy', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: 'low',
        notes: 'Local notes',
        photos: [],
        fieldUpdatedAt: twoHoursAgo, // Even though older
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: now,
      };

      const result = mergeResponse(localResponse, serverResponse, 'Test Item', 'text', 'local-wins');

      expect(result.responseValue).toBe('Local Value');
      expect(result.severity).toBe('low');
      expect(result.notes).toBe('Local notes');
    });

    it('should always prefer server with server-wins strategy', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: 'low',
        notes: 'Local notes',
        photos: [],
        fieldUpdatedAt: now, // Even though newer
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: twoHoursAgo,
      };

      const result = mergeResponse(localResponse, serverResponse, 'Test Item', 'text', 'server-wins');

      expect(result.responseValue).toBe('Server Value');
      expect(result.severity).toBe('high');
      expect(result.notes).toBe('Server notes');
    });

    it('should not report conflict when values are the same', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Same Value',
        severity: 'low',
        notes: 'Same notes',
        photos: [],
        fieldUpdatedAt: now,
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Same Value',
        severity: 'low',
        notes: 'Same notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo,
      };

      const result = mergeResponse(localResponse, serverResponse, 'Test Item', 'text');

      expect(result.hadConflicts).toBe(false);
      expect(result.localWins).toEqual([]);
      expect(result.serverWins).toEqual([]);
    });

    it('should prefer non-null over null values', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: null,
        severity: 'low',
        notes: null,
        photos: [],
        fieldUpdatedAt: now,
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: null,
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo,
      };

      const result = mergeResponse(localResponse, serverResponse, 'Test Item', 'text');

      expect(result.responseValue).toBe('Server Value'); // Server has value
      expect(result.severity).toBe('low'); // Local has value
      expect(result.notes).toBe('Server notes'); // Server has value
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts when both local and server have different values', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: 'low',
        notes: 'Local notes',
        photos: [],
        fieldUpdatedAt: now,
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Server Value',
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo,
      };

      const result = detectConflicts(localResponse, serverResponse, 'Test Item');

      expect(result).not.toBeNull();
      expect(result?.conflicts.length).toBe(3);
      expect(result?.conflicts.map((c) => c.field)).toContain('responseValue');
      expect(result?.conflicts.map((c) => c.field)).toContain('severity');
      expect(result?.conflicts.map((c) => c.field)).toContain('notes');
    });

    it('should not detect conflict when values are the same', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Same Value',
        severity: 'low',
        notes: 'Same notes',
        photos: [],
        fieldUpdatedAt: now,
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: 'Same Value',
        severity: 'low',
        notes: 'Same notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo,
      };

      const result = detectConflicts(localResponse, serverResponse, 'Test Item');

      expect(result).toBeNull();
    });

    it('should not detect conflict when one side is null', () => {
      const localResponse: InspectionDraftResponse = {
        templateItemId: 'item-1',
        responseValue: 'Local Value',
        severity: null,
        notes: null,
        photos: [],
        fieldUpdatedAt: now,
      };

      const serverResponse: ReportResponse = {
        id: '1',
        report_id: 'report-1',
        template_item_id: 'item-1',
        item_label: 'Test Item',
        item_type: 'text',
        response_value: null,
        severity: 'high',
        notes: 'Server notes',
        created_at: twoHoursAgo,
        updated_at: oneHourAgo,
      };

      const result = detectConflicts(localResponse, serverResponse, 'Test Item');

      expect(result).toBeNull();
    });
  });

  describe('mergeAllResponses', () => {
    it('should merge multiple responses correctly', () => {
      const localResponses: InspectionDraftResponse[] = [
        {
          templateItemId: 'item-1',
          responseValue: 'Local 1',
          severity: 'low',
          notes: null,
          photos: ['photo1.jpg'],
          fieldUpdatedAt: now,
        },
        {
          templateItemId: 'item-2',
          responseValue: 'Local 2',
          severity: 'medium',
          notes: 'Local notes 2',
          photos: [],
          fieldUpdatedAt: twoHoursAgo,
        },
      ];

      const serverResponses: ReportResponse[] = [
        {
          id: '1',
          report_id: 'report-1',
          template_item_id: 'item-1',
          item_label: 'Item 1',
          item_type: 'text',
          response_value: 'Server 1',
          severity: 'high',
          notes: 'Server notes 1',
          created_at: twoHoursAgo,
          updated_at: oneHourAgo,
        },
        {
          id: '2',
          report_id: 'report-1',
          template_item_id: 'item-2',
          item_label: 'Item 2',
          item_type: 'text',
          response_value: 'Server 2',
          severity: 'high',
          notes: 'Server notes 2',
          created_at: twoHoursAgo,
          updated_at: now, // Server is newer for item-2
        },
      ];

      const templateItems = [
        { id: 'item-1', label: 'Item 1', item_type: 'text' },
        { id: 'item-2', label: 'Item 2', item_type: 'text' },
        { id: 'item-3', label: 'Item 3', item_type: 'text' }, // No data
      ];

      const result = mergeAllResponses(localResponses, serverResponses, templateItems);

      expect(result.merged.length).toBe(3);

      // Item 1: Local is newer
      expect(result.merged[0].responseValue).toBe('Local 1');
      expect(result.merged[0].photos).toEqual(['photo1.jpg']);

      // Item 2: Server is newer
      expect(result.merged[1].responseValue).toBe('Server 2');

      // Item 3: No data
      expect(result.merged[2].responseValue).toBeNull();

      expect(result.conflictCount).toBe(2); // Item 1 and 2 had conflicts
    });

    it('should count conflicts correctly', () => {
      const localResponses: InspectionDraftResponse[] = [
        {
          templateItemId: 'item-1',
          responseValue: 'Same',
          severity: null,
          notes: null,
          photos: [],
          fieldUpdatedAt: now,
        },
      ];

      const serverResponses: ReportResponse[] = [
        {
          id: '1',
          report_id: 'report-1',
          template_item_id: 'item-1',
          item_label: 'Item 1',
          item_type: 'text',
          response_value: 'Same',
          severity: null,
          notes: null,
          created_at: twoHoursAgo,
          updated_at: oneHourAgo,
        },
      ];

      const templateItems = [{ id: 'item-1', label: 'Item 1', item_type: 'text' }];

      const result = mergeAllResponses(localResponses, serverResponses, templateItems);

      expect(result.conflictCount).toBe(0);
      expect(result.localWinCount).toBe(0);
      expect(result.serverWinCount).toBe(0);
    });
  });
});
