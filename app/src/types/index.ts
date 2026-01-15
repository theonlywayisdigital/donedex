export * from './database';
export * from './billing';
export * from './onboarding';
export * from './superAdmin';

// Re-export commonly used types
import type { Database } from './database';

export type Organisation = Database['public']['Tables']['organisations']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type OrganisationUser = Database['public']['Tables']['organisation_users']['Row'];
export type RecordType = Database['public']['Tables']['record_types']['Row'];
export type RecordTypeField = Database['public']['Tables']['record_type_fields']['Row'];
export type Record = Database['public']['Tables']['records']['Row'];
export type UserRecordAssignment = Database['public']['Tables']['user_record_assignments']['Row'];
export type LibraryRecordType = Database['public']['Tables']['library_record_types']['Row'];
export type LibraryTemplate = Database['public']['Tables']['library_templates']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type TemplateSection = Database['public']['Tables']['template_sections']['Row'];
export type TemplateItem = Database['public']['Tables']['template_items']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type ReportResponse = Database['public']['Tables']['report_responses']['Row'];
export type ReportPhoto = Database['public']['Tables']['report_photos']['Row'];
export type RecordDocument = Database['public']['Tables']['record_documents']['Row'];
export type RecordDocumentCategory = Database['public']['Tables']['record_documents']['Row']['category'];
export type PiiDetectionEvent = Database['public']['Tables']['pii_detection_events']['Row'];
export type PiiSeverity = Database['public']['Tables']['pii_detection_events']['Row']['severity'];
export type PiiUserAction = Database['public']['Tables']['pii_detection_events']['Row']['user_action'];
export type PiiCategory = Database['public']['Tables']['record_type_fields']['Row']['pii_category'];

// Legacy type aliases for backwards compatibility during migration
/** @deprecated Use Record instead */
export type Site = Record;
/** @deprecated Use UserRecordAssignment instead */
export type UserSiteAssignment = UserRecordAssignment;

// Nested types for queries with joins
export interface TemplateWithSections extends Template {
  template_sections: TemplateSectionWithItems[];
}

export interface TemplateSectionWithItems extends TemplateSection {
  template_items: TemplateItem[];
}

export interface RecordWithRecordType extends Record {
  record_type: RecordType;
}

export interface RecordTypeWithRecords extends RecordType {
  records: Record[];
}

export interface RecordTypeWithTemplates extends RecordType {
  templates: Template[];
}

export interface RecordTypeWithFields extends RecordType {
  record_type_fields: RecordTypeField[];
}

export interface RecordTypeWithFieldsAndRecords extends RecordType {
  record_type_fields: RecordTypeField[];
  records: Record[];
}

export interface LibraryRecordTypeWithTemplates extends LibraryRecordType {
  library_templates: LibraryTemplate[];
}

export interface ReportWithResponses extends Report {
  report_responses: ReportResponseWithPhotos[];
}

export interface ReportResponseWithPhotos extends ReportResponse {
  report_photos: ReportPhoto[];
}
