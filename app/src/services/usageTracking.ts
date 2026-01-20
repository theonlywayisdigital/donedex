import { supabase } from './supabase';

// ============================================
// Types
// ============================================

export interface RecentUsageCombination {
  template_id: string;
  template_name: string;
  record_id: string;
  record_name: string;
  record_type_id: string;
  record_type_name: string;
  last_used_at: string;
  use_count: number;
}

export interface DraftReport {
  id: string;
  status: 'draft';
  started_at: string;
  created_at: string;
  template_id: string;
  template_name: string;
  record_id: string;
  record_name: string;
}

export interface QuickStartData {
  drafts: DraftReport[];
  recentCombinations: RecentUsageCombination[];
}

// ============================================
// Track Usage
// ============================================

/**
 * Track when a user starts an inspection with a template+record combination
 * Note: This uses direct table insert until the migration is applied, then can switch to RPC
 */
export async function trackUsage(
  organisationId: string,
  userId: string,
  templateId: string,
  recordId: string,
  reportId?: string
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  try {
    // Insert usage record directly
    const { data, error } = await supabase
      .from('report_usage_history')
      .insert({
        organisation_id: organisationId,
        user_id: userId,
        template_id: templateId,
        record_id: recordId,
        report_id: reportId || null,
        used_at: new Date().toISOString(),
      } as never)
      .select('id')
      .single();

    if (error) {
      // Silently fail if table doesn't exist yet (migration not applied)
      if (error.code === '42P01') {
        console.log('Usage tracking table not yet created - skipping');
        return { data: null, error: null };
      }
      console.error('Failed to track usage:', error);
      return { data: null, error: { message: error.message } };
    }

    // Also update last_used_at on the record
    await supabase
      .from('records')
      .update({ last_used_at: new Date().toISOString() } as never)
      .eq('id', recordId);

    return { data: { id: (data as { id: string }).id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to track usage';
    console.error('Failed to track usage:', message);
    return { data: null, error: { message } };
  }
}

// ============================================
// Get Recent Combinations
// ============================================

/**
 * Get recent template+record combinations for quick-start
 * Uses direct query until migration is applied
 */
export async function getRecentCombinations(
  userId: string,
  limit: number = 5
): Promise<{ data: RecentUsageCombination[]; error: { message: string } | null }> {
  try {
    const { data, error } = await supabase
      .from('report_usage_history')
      .select(`
        template_id,
        record_id,
        used_at,
        template:templates!inner (name),
        record:records!inner (name, record_type_id, archived, record_type:record_types (name))
      `)
      .eq('user_id', userId)
      .eq('record.archived', false)
      .order('used_at', { ascending: false })
      .limit(limit * 2); // Fetch extra to account for deduplication

    if (error) {
      // Silently return empty if table doesn't exist yet
      if (error.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: [], error: { message: error.message } };
    }

    // Transform and deduplicate by template+record combination
    const seen = new Set<string>();
    const combinations: RecentUsageCombination[] = [];

    for (const row of (data as unknown[]) || []) {
      const r = row as {
        template_id: string;
        record_id: string;
        used_at: string;
        template: { name: string } | null;
        record: {
          name: string;
          record_type_id: string;
          record_type: { name: string } | null;
        } | null;
      };

      const key = `${r.template_id}-${r.record_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      combinations.push({
        template_id: r.template_id,
        template_name: r.template?.name || 'Unknown Template',
        record_id: r.record_id,
        record_name: r.record?.name || 'Unknown Record',
        record_type_id: r.record?.record_type_id || '',
        record_type_name: r.record?.record_type?.name || 'Unknown Type',
        last_used_at: r.used_at,
        use_count: 1, // Simplified - actual count would need aggregation
      });

      if (combinations.length >= limit) break;
    }

    return { data: combinations, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get recent combinations';
    return { data: [], error: { message } };
  }
}

// ============================================
// Get Draft Reports
// ============================================

/**
 * Get draft reports for the current user
 */
export async function getDraftReports(
  userId: string,
  limit: number = 5
): Promise<{ data: DraftReport[]; error: { message: string } | null }> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        id,
        status,
        started_at,
        created_at,
        template_id,
        record_id,
        template:templates (name),
        record:records!inner (name, archived)
      `
      )
      .eq('user_id', userId)
      .eq('status', 'draft')
      .eq('record.archived', false)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    // Transform to DraftReport format
    const drafts: DraftReport[] = ((data as unknown[]) || []).map((report: unknown) => {
      const r = report as {
        id: string;
        status: 'draft';
        started_at: string;
        created_at: string;
        template_id: string;
        record_id: string;
        template: { name: string } | null;
        record: { name: string } | null;
      };
      return {
        id: r.id,
        status: r.status,
        started_at: r.started_at,
        created_at: r.created_at,
        template_id: r.template_id,
        template_name: r.template?.name || 'Unknown Template',
        record_id: r.record_id,
        record_name: r.record?.name || 'Unknown Record',
      };
    });

    return { data: drafts, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get draft reports';
    return { data: [], error: { message } };
  }
}

// ============================================
// Get All Quick Start Data
// ============================================

/**
 * Get all quick-start data in a single call
 */
export async function getQuickStartData(
  userId: string
): Promise<{ data: QuickStartData; error: { message: string } | null }> {
  try {
    // Fetch drafts and recent combinations in parallel
    const [draftsResult, recentResult] = await Promise.all([
      getDraftReports(userId, 3),
      getRecentCombinations(userId, 5),
    ]);

    // Return data even if one fails
    return {
      data: {
        drafts: draftsResult.data,
        recentCombinations: recentResult.data,
      },
      error: draftsResult.error || recentResult.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get quick start data';
    return {
      data: { drafts: [], recentCombinations: [] },
      error: { message },
    };
  }
}

// ============================================
// Get Recent Records By Type
// ============================================

/**
 * Get recently used records of a specific type
 * Ordered by last_used_at (most recent first), then by name
 */
export async function getRecentRecordsByType(
  recordTypeId: string,
  limit: number = 5
): Promise<{
  data: Array<{
    id: string;
    name: string;
    address: string | null;
    last_used_at: string | null;
  }>;
  error: { message: string } | null;
}> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('id, name, address, last_used_at')
      .eq('record_type_id', recordTypeId)
      .eq('archived', false)
      .not('last_used_at', 'is', null)
      .order('last_used_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return {
      data:
        (data as Array<{
          id: string;
          name: string;
          address: string | null;
          last_used_at: string | null;
        }>) || [],
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get recent records by type';
    return { data: [], error: { message } };
  }
}
