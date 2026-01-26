export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      _migration_site_template_backup: {
        Row: {
          created_at: string | null
          migrated_at: string | null
          site_id: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          migrated_at?: string | null
          site_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          migrated_at?: string | null
          site_id?: string | null
          template_id?: string | null
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          organisation_id: string | null
          payload: Json
          processed_at: string | null
          stripe_customer_id: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          organisation_id?: string | null
          payload: Json
          processed_at?: string | null
          stripe_customer_id?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          organisation_id?: string | null
          payload?: Json
          processed_at?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          event_type: string
          id: string
          new_value: Json | null
          organisation_id: string | null
          previous_value: Json | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          new_value?: Json | null
          organisation_id?: string | null
          previous_value?: Json | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          new_value?: Json | null
          organisation_id?: string | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organisation_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organisation_id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organisation_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number | null
          amount_remaining: number | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          finalized_at: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          organisation_id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          tax: number | null
          updated_at: string | null
          voided_at: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          amount_remaining?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          finalized_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          organisation_id: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          tax?: number | null
          updated_at?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          amount_remaining?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          finalized_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          organisation_id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          tax?: number | null
          updated_at?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_record_types: {
        Row: {
          color: string
          description: string | null
          fields: Json
          icon: string
          id: string
          name: string
          name_singular: string
          sort_order: number | null
        }
        Insert: {
          color: string
          description?: string | null
          fields: Json
          icon: string
          id: string
          name: string
          name_singular: string
          sort_order?: number | null
        }
        Update: {
          color?: string
          description?: string | null
          fields?: Json
          icon?: string
          id?: string
          name?: string
          name_singular?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      library_templates: {
        Row: {
          description: string | null
          id: string
          name: string
          record_type_id: string
          sections: Json
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          id: string
          name: string
          record_type_id: string
          sections: Json
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          record_type_id?: string
          sections?: Json
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_templates_record_type_id_fkey"
            columns: ["record_type_id"]
            isOneToOne: false
            referencedRelation: "library_record_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_receipts: {
        Row: {
          created_at: string | null
          dismissed_at: string | null
          email_sent_at: string | null
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed_at?: string | null
          email_sent_at?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed_at?: string | null
          email_sent_at?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_receipts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string | null
          created_at: string | null
          created_by: string
          id: string
          message: string
          priority: string | null
          send_email: boolean | null
          send_in_app: boolean | null
          target_organisation_id: string | null
          target_type: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          message: string
          priority?: string | null
          send_email?: boolean | null
          send_in_app?: boolean | null
          target_organisation_id?: string | null
          target_type: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          message?: string
          priority?: string | null
          send_email?: boolean | null
          send_in_app?: boolean | null
          target_organisation_id?: string | null
          target_type?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_organisation_id_fkey"
            columns: ["target_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_state: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          billing_interval: string | null
          city: string | null
          completed_at: string | null
          completed_steps: string[] | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          current_step: string
          first_record_address: string | null
          first_record_name: string | null
          id: string
          organisation_id: string | null
          organisation_name: string | null
          organisation_slug: string | null
          pending_invites: Json | null
          postcode: string | null
          selected_plan_id: string | null
          selected_template_ids: string[] | null
          stripe_checkout_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          billing_interval?: string | null
          city?: string | null
          completed_at?: string | null
          completed_steps?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          current_step?: string
          first_record_address?: string | null
          first_record_name?: string | null
          id?: string
          organisation_id?: string | null
          organisation_name?: string | null
          organisation_slug?: string | null
          pending_invites?: Json | null
          postcode?: string | null
          selected_plan_id?: string | null
          selected_template_ids?: string[] | null
          stripe_checkout_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          billing_interval?: string | null
          city?: string | null
          completed_at?: string | null
          completed_steps?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          current_step?: string
          first_record_address?: string | null
          first_record_name?: string | null
          id?: string
          organisation_id?: string | null
          organisation_name?: string | null
          organisation_slug?: string | null
          pending_invites?: Json | null
          postcode?: string | null
          selected_plan_id?: string | null
          selected_template_ids?: string[] | null
          stripe_checkout_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_state_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_state_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_usage: {
        Row: {
          created_at: string | null
          id: string
          organisation_id: string
          period_end: string
          period_start: string
          record_count: number | null
          report_count: number | null
          storage_bytes: number | null
          updated_at: string | null
          user_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organisation_id: string
          period_end: string
          period_start: string
          record_count?: number | null
          report_count?: number | null
          storage_bytes?: number | null
          updated_at?: string | null
          user_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organisation_id?: string
          period_end?: string
          period_start?: string
          record_count?: number | null
          report_count?: number | null
          storage_bytes?: number | null
          updated_at?: string | null
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_usage_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_users: {
        Row: {
          created_at: string | null
          id: string
          organisation_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organisation_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organisation_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_users_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          blocked: boolean | null
          blocked_at: string | null
          blocked_reason: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by_super_admin: boolean | null
          current_plan_id: string | null
          id: string
          name: string
          onboarding_completed_at: string | null
          postcode: string | null
          slug: string | null
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by_super_admin?: boolean | null
          current_plan_id?: string | null
          id?: string
          name: string
          onboarding_completed_at?: string | null
          postcode?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by_super_admin?: boolean | null
          current_plan_id?: string | null
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          postcode?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organisations_plan"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      record_type_fields: {
        Row: {
          contains_pii: boolean
          created_at: string | null
          default_unit: string | null
          default_value: string | null
          field_type: string
          help_text: string | null
          id: string
          is_required: boolean | null
          label: string
          max_value: number | null
          min_value: number | null
          options: Json | null
          pii_category: string | null
          placeholder_text: string | null
          record_type_id: string
          sort_order: number
          unit_options: Json | null
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          contains_pii?: boolean
          created_at?: string | null
          default_unit?: string | null
          default_value?: string | null
          field_type: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          pii_category?: string | null
          placeholder_text?: string | null
          record_type_id: string
          sort_order?: number
          unit_options?: Json | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          contains_pii?: boolean
          created_at?: string | null
          default_unit?: string | null
          default_value?: string | null
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          pii_category?: string | null
          placeholder_text?: string | null
          record_type_id?: string
          sort_order?: number
          unit_options?: Json | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "record_type_fields_record_type_id_fkey"
            columns: ["record_type_id"]
            isOneToOne: false
            referencedRelation: "record_types"
            referencedColumns: ["id"]
          },
        ]
      }
      record_types: {
        Row: {
          archived: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          fields: Json | null
          icon: string | null
          id: string
          is_default: boolean | null
          is_system: boolean | null
          name: string
          name_singular: string
          organisation_id: string
          source_library_id: string | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_system?: boolean | null
          name: string
          name_singular: string
          organisation_id: string
          source_library_id?: string | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_system?: boolean | null
          name?: string
          name_singular?: string
          organisation_id?: string
          source_library_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "record_types_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      records: {
        Row: {
          address: string | null
          archived: boolean | null
          created_at: string | null
          description: string | null
          id: string
          last_used_at: string | null
          metadata: Json | null
          name: string
          organisation_id: string
          record_type_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          organisation_id: string
          record_type_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          organisation_id?: string
          record_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_record_type_id_fkey"
            columns: ["record_type_id"]
            isOneToOne: false
            referencedRelation: "record_types"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          created_at: string | null
          id: string
          report_response_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_response_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_response_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_response_id_fkey"
            columns: ["report_response_id"]
            isOneToOne: false
            referencedRelation: "report_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      report_responses: {
        Row: {
          created_at: string | null
          id: string
          item_label: string
          item_type: string
          notes: string | null
          report_id: string
          response_value: string | null
          severity: string | null
          template_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_label: string
          item_type: string
          notes?: string | null
          report_id: string
          response_value?: string | null
          severity?: string | null
          template_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_label?: string
          item_type?: string
          notes?: string | null
          report_id?: string
          response_value?: string | null
          severity?: string | null
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_responses_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_responses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      report_usage_history: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          record_id: string
          report_id: string | null
          template_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          record_id: string
          report_id?: string | null
          template_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          record_id?: string
          report_id?: string | null
          template_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_usage_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_usage_history_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_usage_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_usage_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          organisation_id: string
          record_id: string
          started_at: string | null
          status: string | null
          submitted_at: string | null
          template_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organisation_id: string
          record_id: string
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          template_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organisation_id?: string
          record_id?: string
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          template_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_site_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          cancel_at: string | null
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          organisation_id: string
          plan_id: string
          started_at: string
          status: string
          stripe_subscription_id: string | null
          trial_end: string | null
        }
        Insert: {
          cancel_at?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          organisation_id: string
          plan_id: string
          started_at?: string
          status: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
        }
        Update: {
          cancel_at?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          organisation_id?: string
          plan_id?: string
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          feature_advanced_analytics: boolean | null
          feature_ai_templates: boolean | null
          feature_all_field_types: boolean | null
          feature_api_access: boolean | null
          feature_custom_branding: boolean | null
          feature_pdf_export: boolean | null
          feature_photos: boolean | null
          feature_priority_support: boolean | null
          feature_starter_templates: boolean | null
          feature_white_label: boolean | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_records: number | null
          max_reports_per_month: number | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          price_annual_gbp: number | null
          price_monthly_gbp: number | null
          slug: string
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          feature_advanced_analytics?: boolean | null
          feature_ai_templates?: boolean | null
          feature_all_field_types?: boolean | null
          feature_api_access?: boolean | null
          feature_custom_branding?: boolean | null
          feature_pdf_export?: boolean | null
          feature_photos?: boolean | null
          feature_priority_support?: boolean | null
          feature_starter_templates?: boolean | null
          feature_white_label?: boolean | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_records?: number | null
          max_reports_per_month?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          price_annual_gbp?: number | null
          price_monthly_gbp?: number | null
          slug: string
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          feature_advanced_analytics?: boolean | null
          feature_ai_templates?: boolean | null
          feature_all_field_types?: boolean | null
          feature_api_access?: boolean | null
          feature_custom_branding?: boolean | null
          feature_pdf_export?: boolean | null
          feature_photos?: boolean | null
          feature_priority_support?: boolean | null
          feature_starter_templates?: boolean | null
          feature_white_label?: boolean | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_records?: number | null
          max_reports_per_month?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          price_annual_gbp?: number | null
          price_monthly_gbp?: number | null
          slug?: string
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      super_admin_audit_log: {
        Row: {
          action_category: string
          action_type: string
          created_at: string | null
          id: string
          impersonating_user_id: string | null
          new_values: Json | null
          old_values: Json | null
          super_admin_id: string
          target_id: string | null
          target_organisation_id: string | null
          target_table: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          created_at?: string | null
          id?: string
          impersonating_user_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          super_admin_id: string
          target_id?: string | null
          target_organisation_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          created_at?: string | null
          id?: string
          impersonating_user_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          super_admin_id?: string
          target_id?: string | null
          target_organisation_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_audit_log_super_admin_id_fkey"
            columns: ["super_admin_id"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_target_organisation_id_fkey"
            columns: ["target_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["super_admin_permission"]
          super_admin_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["super_admin_permission"]
          super_admin_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["super_admin_permission"]
          super_admin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_permissions_super_admin_id_fkey"
            columns: ["super_admin_id"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_sessions: {
        Row: {
          ended_at: string | null
          expires_at: string
          id: string
          impersonating_org_id: string | null
          impersonating_user_id: string | null
          is_active: boolean | null
          started_at: string | null
          super_admin_id: string
        }
        Insert: {
          ended_at?: string | null
          expires_at?: string
          id?: string
          impersonating_org_id?: string | null
          impersonating_user_id?: string | null
          is_active?: boolean | null
          started_at?: string | null
          super_admin_id: string
        }
        Update: {
          ended_at?: string | null
          expires_at?: string
          id?: string
          impersonating_org_id?: string | null
          impersonating_user_id?: string | null
          is_active?: boolean | null
          started_at?: string | null
          super_admin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_sessions_impersonating_org_id_fkey"
            columns: ["impersonating_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_sessions_super_admin_id_fkey"
            columns: ["super_admin_id"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      template_items: {
        Row: {
          asset_types: Json | null
          coloured_options: Json | null
          condition_field_id: string | null
          condition_operator: string | null
          condition_value: string | null
          counter_max: number | null
          counter_min: number | null
          counter_step: number | null
          created_at: string | null
          datetime_mode: string | null
          declaration_text: string | null
          default_unit: string | null
          default_value: string | null
          display_style: string | null
          help_text: string | null
          id: string
          instruction_image_url: string | null
          instruction_style: string | null
          is_required: boolean | null
          item_type: string
          label: string
          max_duration_seconds: number | null
          max_entries: number | null
          max_media_count: number | null
          max_value: number | null
          media_required: boolean | null
          min_entries: number | null
          min_value: number | null
          options: Json | null
          photo_rule: string | null
          placeholder_text: string | null
          rating_max: number | null
          rating_style: string | null
          section_id: string
          signature_requires_name: boolean | null
          sort_order: number
          step_value: number | null
          sub_items: Json | null
          unit_options: Json | null
          unit_type: string | null
          warning_days_before: number | null
        }
        Insert: {
          asset_types?: Json | null
          coloured_options?: Json | null
          condition_field_id?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          counter_max?: number | null
          counter_min?: number | null
          counter_step?: number | null
          created_at?: string | null
          datetime_mode?: string | null
          declaration_text?: string | null
          default_unit?: string | null
          default_value?: string | null
          display_style?: string | null
          help_text?: string | null
          id?: string
          instruction_image_url?: string | null
          instruction_style?: string | null
          is_required?: boolean | null
          item_type: string
          label: string
          max_duration_seconds?: number | null
          max_entries?: number | null
          max_media_count?: number | null
          max_value?: number | null
          media_required?: boolean | null
          min_entries?: number | null
          min_value?: number | null
          options?: Json | null
          photo_rule?: string | null
          placeholder_text?: string | null
          rating_max?: number | null
          rating_style?: string | null
          section_id: string
          signature_requires_name?: boolean | null
          sort_order?: number
          step_value?: number | null
          sub_items?: Json | null
          unit_options?: Json | null
          unit_type?: string | null
          warning_days_before?: number | null
        }
        Update: {
          asset_types?: Json | null
          coloured_options?: Json | null
          condition_field_id?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          counter_max?: number | null
          counter_min?: number | null
          counter_step?: number | null
          created_at?: string | null
          datetime_mode?: string | null
          declaration_text?: string | null
          default_unit?: string | null
          default_value?: string | null
          display_style?: string | null
          help_text?: string | null
          id?: string
          instruction_image_url?: string | null
          instruction_style?: string | null
          is_required?: boolean | null
          item_type?: string
          label?: string
          max_duration_seconds?: number | null
          max_entries?: number | null
          max_media_count?: number | null
          max_value?: number | null
          media_required?: boolean | null
          min_entries?: number | null
          min_value?: number | null
          options?: Json | null
          photo_rule?: string | null
          placeholder_text?: string | null
          rating_max?: number | null
          rating_style?: string | null
          section_id?: string
          signature_requires_name?: boolean | null
          sort_order?: number
          step_value?: number | null
          sub_items?: Json | null
          unit_options?: Json | null
          unit_type?: string | null
          warning_days_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_items_condition_field_id_fkey"
            columns: ["condition_field_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          organisation_id: string
          record_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          organisation_id: string
          record_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          organisation_id?: string
          record_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_record_type_id_fkey"
            columns: ["record_type_id"]
            isOneToOne: false
            referencedRelation: "record_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_record_assignments: {
        Row: {
          created_at: string | null
          id: string
          record_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          record_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_record_assignments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_add_record: { Args: { org_id: string }; Returns: boolean }
      can_add_report: { Args: { org_id: string }; Returns: boolean }
      can_add_user: { Args: { org_id: string }; Returns: boolean }
      check_org_limits: { Args: { org_id: string }; Returns: Json }
      complete_onboarding: {
        Args: {
          p_billing_email?: string
          p_contact_email?: string
          p_organisation_name: string
          p_organisation_slug?: string
          p_pending_invites?: Json
          p_plan_id?: string
          p_selected_template_ids?: string[]
        }
        Returns: Json
      }
      dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      generate_slug: { Args: { name: string }; Returns: string }
      get_billing_summary: { Args: { org_id: string }; Returns: Json }
      get_current_super_admin_id: { Args: never; Returns: string }
      get_or_create_onboarding_state: {
        Args: never
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          billing_interval: string | null
          city: string | null
          completed_at: string | null
          completed_steps: string[] | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          current_step: string
          first_record_address: string | null
          first_record_name: string | null
          id: string
          organisation_id: string | null
          organisation_name: string | null
          organisation_slug: string | null
          pending_invites: Json | null
          postcode: string | null
          selected_plan_id: string | null
          selected_template_ids: string[] | null
          stripe_checkout_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "onboarding_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_organisation_usage: { Args: { org_id: string }; Returns: Json }
      get_recent_usage_combinations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          last_used_at: string
          record_id: string
          record_name: string
          record_type_id: string
          record_type_name: string
          template_id: string
          template_name: string
          use_count: number
        }[]
      }
      get_record_organisation_id: {
        Args: { record_id_param: string }
        Returns: string
      }
      get_sent_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          read_count: number
          recipient_count: number
          send_email: boolean
          send_in_app: boolean
          target_organisation_id: string
          target_organisation_name: string
          target_type: string
          target_user_id: string
          title: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          action_label: string
          action_url: string
          category: string
          created_at: string
          dismissed_at: string
          id: string
          message: string
          priority: string
          read_at: string
          title: string
        }[]
      }
      get_user_organisation_ids: { Args: never; Returns: string[] }
      get_user_record_ids: {
        Args: { user_id_param?: string }
        Returns: string[]
      }
      has_record_access: { Args: { record_id_param: string }; Returns: boolean }
      has_site_access: { Args: { site_id_param: string }; Returns: boolean }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_user_admin: { Args: never; Returns: boolean }
      log_super_admin_action: {
        Args: {
          p_action_category: string
          p_action_type: string
          p_impersonating_user_id?: string
          p_new_values?: Json
          p_old_values?: Json
          p_target_id?: string
          p_target_org_id?: string
          p_target_table?: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      needs_onboarding: { Args: { user_id_param: string }; Returns: boolean }
      record_subscription_change: {
        Args: {
          p_org_id: string
          p_plan_id: string
          p_status: string
          p_stripe_subscription_id: string
          p_trial_end?: string
        }
        Returns: string
      }
      snapshot_organisation_usage: { Args: never; Returns: undefined }
      super_admin_has_permission: {
        Args: { perm: Database["public"]["Enums"]["super_admin_permission"] }
        Returns: boolean
      }
      track_report_usage: {
        Args: {
          p_organisation_id: string
          p_record_id: string
          p_report_id?: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      super_admin_permission:
        | "view_all_organisations"
        | "edit_all_organisations"
        | "view_all_users"
        | "edit_all_users"
        | "view_all_reports"
        | "edit_all_reports"
        | "view_all_templates"
        | "edit_all_templates"
        | "view_all_records"
        | "edit_all_records"
        | "impersonate_users"
        | "manage_super_admins"
        | "view_audit_logs"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      super_admin_permission: [
        "view_all_organisations",
        "edit_all_organisations",
        "view_all_users",
        "edit_all_users",
        "view_all_reports",
        "edit_all_reports",
        "view_all_templates",
        "edit_all_templates",
        "view_all_records",
        "edit_all_records",
        "impersonate_users",
        "manage_super_admins",
        "view_audit_logs",
      ],
    },
  },
} as const
