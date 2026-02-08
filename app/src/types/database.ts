/**
 * Donedex Database Types
 * Updated for Record Types refactor
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          // Contact info
          contact_email: string | null;
          contact_phone: string | null;
          // Billing columns
          stripe_customer_id: string | null;
          subscription_status: string | null;
          current_plan_id: string | null;
          trial_ends_at: string | null;
          subscription_ends_at: string | null;
          // Block/archive
          blocked: boolean;
          blocked_at: string | null;
          blocked_reason: string | null;
          archived: boolean;
          archived_at: string | null;
          // Billing interval
          billing_interval: string;
          // Discount
          discount_percent: number;
          discount_notes: string | null;
          discount_applied_by: string | null;
          discount_applied_at: string | null;
          // Onboarding
          onboarding_completed_at: string | null;
          // Meta
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          current_plan_id?: string | null;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          billing_interval?: string;
          discount_percent?: number;
          discount_notes?: string | null;
          discount_applied_by?: string | null;
          discount_applied_at?: string | null;
          blocked?: boolean;
          blocked_at?: string | null;
          blocked_reason?: string | null;
          archived?: boolean;
          archived_at?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          current_plan_id?: string | null;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          billing_interval?: string;
          discount_percent?: number;
          discount_notes?: string | null;
          discount_applied_by?: string | null;
          discount_applied_at?: string | null;
          blocked?: boolean;
          blocked_at?: string | null;
          blocked_reason?: string | null;
          archived?: boolean;
          archived_at?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organisation_users: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'user';
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'user';
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'user';
          created_at?: string;
        };
      };
      record_types: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          name_singular: string;
          description: string | null;
          icon: string;
          color: string;
          fields: Json;
          is_default: boolean;
          is_system: boolean;
          source_library_id: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          name_singular: string;
          description?: string | null;
          icon?: string;
          color?: string;
          fields?: Json;
          is_default?: boolean;
          is_system?: boolean;
          source_library_id?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          name_singular?: string;
          description?: string | null;
          icon?: string;
          color?: string;
          fields?: Json;
          is_default?: boolean;
          is_system?: boolean;
          source_library_id?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      record_type_fields: {
        Row: {
          id: string;
          record_type_id: string;
          label: string;
          field_type: string;
          is_required: boolean;
          help_text: string | null;
          placeholder_text: string | null;
          default_value: string | null;
          options: Json | null;
          min_value: number | null;
          max_value: number | null;
          unit_type: string | null;
          unit_options: Json | null;
          default_unit: string | null;
          sort_order: number;
          contains_pii: boolean;
          pii_category: 'email' | 'phone' | 'name' | 'signature' | 'location' | 'identifier' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          record_type_id: string;
          label: string;
          field_type: string;
          is_required?: boolean;
          help_text?: string | null;
          placeholder_text?: string | null;
          default_value?: string | null;
          options?: Json | null;
          min_value?: number | null;
          max_value?: number | null;
          unit_type?: string | null;
          unit_options?: Json | null;
          default_unit?: string | null;
          sort_order?: number;
          contains_pii?: boolean;
          pii_category?: 'email' | 'phone' | 'name' | 'signature' | 'location' | 'identifier' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          record_type_id?: string;
          label?: string;
          field_type?: string;
          is_required?: boolean;
          help_text?: string | null;
          placeholder_text?: string | null;
          default_value?: string | null;
          options?: Json | null;
          min_value?: number | null;
          max_value?: number | null;
          unit_type?: string | null;
          unit_options?: Json | null;
          default_unit?: string | null;
          sort_order?: number;
          contains_pii?: boolean;
          pii_category?: 'email' | 'phone' | 'name' | 'signature' | 'location' | 'identifier' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pii_detection_events: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string | null;
          record_id: string | null;
          record_type_id: string | null;
          field_id: string | null;
          field_label: string;
          detection_type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          detected_pattern: string | null;
          user_action: 'saved_anyway' | 'edited' | 'cancelled' | 'dismissed';
          was_warned: boolean;
          client_platform: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id?: string | null;
          record_id?: string | null;
          record_type_id?: string | null;
          field_id?: string | null;
          field_label: string;
          detection_type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          detected_pattern?: string | null;
          user_action: 'saved_anyway' | 'edited' | 'cancelled' | 'dismissed';
          was_warned?: boolean;
          client_platform?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          user_id?: string | null;
          record_id?: string | null;
          record_type_id?: string | null;
          field_id?: string | null;
          field_label?: string;
          detection_type?: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          detected_pattern?: string | null;
          user_action?: 'saved_anyway' | 'edited' | 'cancelled' | 'dismissed';
          was_warned?: boolean;
          client_platform?: string | null;
          created_at?: string;
        };
      };
      library_record_types: {
        Row: {
          id: string;
          name: string;
          name_singular: string;
          description: string | null;
          icon: string;
          color: string;
          sort_order: number;
          fields: Json;
        };
        Insert: {
          id: string;
          name: string;
          name_singular: string;
          description?: string | null;
          icon: string;
          color: string;
          sort_order?: number;
          fields: Json;
        };
        Update: {
          id?: string;
          name?: string;
          name_singular?: string;
          description?: string | null;
          icon?: string;
          color?: string;
          sort_order?: number;
          fields?: Json;
        };
      };
      library_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          record_type_id: string;
          sections: Json;
          sort_order: number;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          record_type_id: string;
          sections: Json;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          record_type_id?: string;
          sections?: Json;
          sort_order?: number;
        };
      };
      records: {
        Row: {
          id: string;
          organisation_id: string;
          record_type_id: string;
          name: string;
          address: string | null;
          description: string | null;
          metadata: Json;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          record_type_id: string;
          name: string;
          address?: string | null;
          description?: string | null;
          metadata?: Json;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          record_type_id?: string;
          name?: string;
          address?: string | null;
          description?: string | null;
          metadata?: Json;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_record_assignments: {
        Row: {
          id: string;
          user_id: string;
          record_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          record_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          record_id?: string;
          created_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          organisation_id: string;
          record_type_id: string | null;
          name: string;
          description: string | null;
          is_published: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          record_type_id?: string | null;
          name: string;
          description?: string | null;
          is_published?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          record_type_id?: string | null;
          name?: string;
          description?: string | null;
          is_published?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_sections: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      template_items: {
        Row: {
          id: string;
          section_id: string;
          label: string;
          item_type: string;
          is_required: boolean;
          photo_rule: 'never' | 'on_fail' | 'always';
          options: Json | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          label: string;
          item_type: string;
          is_required?: boolean;
          photo_rule?: 'never' | 'on_fail' | 'always';
          options?: Json | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          label?: string;
          item_type?: string;
          is_required?: boolean;
          photo_rule?: 'never' | 'on_fail' | 'always';
          options?: Json | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          organisation_id: string;
          record_id: string;
          template_id: string;
          user_id: string | null;
          status: 'draft' | 'submitted';
          started_at: string;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          record_id: string;
          template_id: string;
          user_id?: string | null;
          status?: 'draft' | 'submitted';
          started_at?: string;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          record_id?: string;
          template_id?: string;
          user_id?: string | null;
          status?: 'draft' | 'submitted';
          started_at?: string;
          submitted_at?: string | null;
          created_at?: string;
        };
      };
      report_responses: {
        Row: {
          id: string;
          report_id: string;
          template_item_id: string | null;
          item_label: string;
          item_type: string;
          response_value: string | null;
          severity: 'low' | 'medium' | 'high' | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          template_item_id?: string | null;
          item_label: string;
          item_type: string;
          response_value?: string | null;
          severity?: 'low' | 'medium' | 'high' | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          template_item_id?: string | null;
          item_label?: string;
          item_type?: string;
          response_value?: string | null;
          severity?: 'low' | 'medium' | 'high' | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      report_photos: {
        Row: {
          id: string;
          report_response_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_response_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_response_id?: string;
          storage_path?: string;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          organisation_id: string;
          email: string;
          role: 'owner' | 'admin' | 'user';
          invited_by: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          email: string;
          role: 'owner' | 'admin' | 'user';
          invited_by: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          email?: string;
          role?: 'owner' | 'admin' | 'user';
          invited_by?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      record_documents: {
        Row: {
          id: string;
          record_id: string;
          organisation_id: string;
          name: string;
          original_filename: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          category: 'general' | 'contract' | 'certificate' | 'photo' | 'report' | 'correspondence' | 'other';
          description: string | null;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          record_id: string;
          organisation_id: string;
          name: string;
          original_filename: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          category?: 'general' | 'contract' | 'certificate' | 'photo' | 'report' | 'correspondence' | 'other';
          description?: string | null;
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string;
          organisation_id?: string;
          name?: string;
          original_filename?: string;
          file_path?: string;
          file_size?: number;
          mime_type?: string;
          category?: 'general' | 'contract' | 'certificate' | 'photo' | 'report' | 'correspondence' | 'other';
          description?: string | null;
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
