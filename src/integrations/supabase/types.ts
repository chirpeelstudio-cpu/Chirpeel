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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
          summary: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          summary?: string | null
          tenant_id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          summary?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          auto_create_project_on_first_payment: boolean
          auto_snapshot_on_send: boolean
          dedup_auto_merge: boolean
          dedup_warn_enabled: boolean
          default_followup_days: number
          default_gst_rate: number
          default_terms: string | null
          default_validity_days: number
          digest_send_hour: number
          discount_cap_admin_pct: number
          discount_cap_executive_pct: number
          discount_cap_manager_pct: number
          id: string
          invoice_number_format: string
          monthly_lead_target: number
          monthly_revenue_target: number
          overdue_threshold_days: number
          pipeline_stages_visible: Json
          profit_margin_alert_pct: number
          quotation_number_format: string
          reminder_cadence_days: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_create_project_on_first_payment?: boolean
          auto_snapshot_on_send?: boolean
          dedup_auto_merge?: boolean
          dedup_warn_enabled?: boolean
          default_followup_days?: number
          default_gst_rate?: number
          default_terms?: string | null
          default_validity_days?: number
          digest_send_hour?: number
          discount_cap_admin_pct?: number
          discount_cap_executive_pct?: number
          discount_cap_manager_pct?: number
          id?: string
          invoice_number_format?: string
          monthly_lead_target?: number
          monthly_revenue_target?: number
          overdue_threshold_days?: number
          pipeline_stages_visible?: Json
          profit_margin_alert_pct?: number
          quotation_number_format?: string
          reminder_cadence_days?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          auto_create_project_on_first_payment?: boolean
          auto_snapshot_on_send?: boolean
          dedup_auto_merge?: boolean
          dedup_warn_enabled?: boolean
          default_followup_days?: number
          default_gst_rate?: number
          default_terms?: string | null
          default_validity_days?: number
          digest_send_hour?: number
          discount_cap_admin_pct?: number
          discount_cap_executive_pct?: number
          discount_cap_manager_pct?: number
          id?: string
          invoice_number_format?: string
          monthly_lead_target?: number
          monthly_revenue_target?: number
          overdue_threshold_days?: number
          pipeline_stages_visible?: Json
          profit_margin_alert_pct?: number
          quotation_number_format?: string
          reminder_cadence_days?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      boq_product_vendors: {
        Row: {
          boq_product_id: string
          created_at: string
          id: string
          is_preferred: boolean
          tenant_id: string
          unit_rate: number | null
          vendor_id: string
        }
        Insert: {
          boq_product_id: string
          created_at?: string
          id?: string
          is_preferred?: boolean
          tenant_id?: string
          unit_rate?: number | null
          vendor_id: string
        }
        Update: {
          boq_product_id?: string
          created_at?: string
          id?: string
          is_preferred?: boolean
          tenant_id?: string
          unit_rate?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_product_vendors_boq_product_id_fkey"
            columns: ["boq_product_id"]
            isOneToOne: false
            referencedRelation: "boq_products"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          default_rate: number
          description: string | null
          id: string
          is_preset: boolean
          name: string
          sort_order: number
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          default_rate?: number
          description?: string | null
          id?: string
          is_preset?: boolean
          name: string
          sort_order?: number
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          default_rate?: number
          description?: string | null
          id?: string
          is_preset?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_catalog: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          is_preset: boolean
          key: string
          logo_url: string | null
          name: string
          rate_per_sqft: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          is_preset?: boolean
          key: string
          logo_url?: string | null
          name: string
          rate_per_sqft?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          is_preset?: boolean
          key?: string
          logo_url?: string | null
          name?: string
          rate_per_sqft?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_share_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          lead_id: string
          revoked: boolean
          tenant_id: string
          token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          lead_id: string
          revoked?: boolean
          tenant_id?: string
          token: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          lead_id?: string
          revoked?: boolean
          tenant_id?: string
          token?: string
          view_count?: number
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          accent_color: string
          accent_style: string | null
          address: string | null
          address_line1: string | null
          address_line2: string | null
          avg_ticket: string | null
          bank_details_text: string | null
          base_font_size: string | null
          body_font: string | null
          city: string | null
          client_portal_whatsapp_template: string | null
          company_name: string
          created_at: string
          currency: string | null
          currency_symbol: string | null
          email: string | null
          footer_note: string | null
          fy_start_month: number | null
          gstin: string | null
          header_color: string
          heading_font: string | null
          hear_about_us: string | null
          hear_about_us_other: string | null
          id: string
          invoice_footer_note: string | null
          logo_position: string | null
          logo_size: string
          logo_url: string | null
          onboarding_completed_at: string | null
          phone: string | null
          pincode: string | null
          primary_city: string | null
          primary_color: string | null
          primary_goal: string | null
          quotation_footer_note: string | null
          service_areas: string[] | null
          show_brand_strip: boolean
          show_signature_block: boolean
          show_terms_block: boolean
          show_trust_strip: boolean
          specialties: string[] | null
          state: string | null
          table_style: string | null
          tagline: string | null
          tenant_id: string
          terms_text: string | null
          timezone: string | null
          typical_duration_days: number | null
          updated_at: string
          watermark_opacity: number
          watermark_text: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string
          accent_style?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avg_ticket?: string | null
          bank_details_text?: string | null
          base_font_size?: string | null
          body_font?: string | null
          city?: string | null
          client_portal_whatsapp_template?: string | null
          company_name?: string
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          email?: string | null
          footer_note?: string | null
          fy_start_month?: number | null
          gstin?: string | null
          header_color?: string
          heading_font?: string | null
          hear_about_us?: string | null
          hear_about_us_other?: string | null
          id?: string
          invoice_footer_note?: string | null
          logo_position?: string | null
          logo_size?: string
          logo_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          pincode?: string | null
          primary_city?: string | null
          primary_color?: string | null
          primary_goal?: string | null
          quotation_footer_note?: string | null
          service_areas?: string[] | null
          show_brand_strip?: boolean
          show_signature_block?: boolean
          show_terms_block?: boolean
          show_trust_strip?: boolean
          specialties?: string[] | null
          state?: string | null
          table_style?: string | null
          tagline?: string | null
          tenant_id?: string
          terms_text?: string | null
          timezone?: string | null
          typical_duration_days?: number | null
          updated_at?: string
          watermark_opacity?: number
          watermark_text?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string
          accent_style?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avg_ticket?: string | null
          bank_details_text?: string | null
          base_font_size?: string | null
          body_font?: string | null
          city?: string | null
          client_portal_whatsapp_template?: string | null
          company_name?: string
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          email?: string | null
          footer_note?: string | null
          fy_start_month?: number | null
          gstin?: string | null
          header_color?: string
          heading_font?: string | null
          hear_about_us?: string | null
          hear_about_us_other?: string | null
          id?: string
          invoice_footer_note?: string | null
          logo_position?: string | null
          logo_size?: string
          logo_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          pincode?: string | null
          primary_city?: string | null
          primary_color?: string | null
          primary_goal?: string | null
          quotation_footer_note?: string | null
          service_areas?: string[] | null
          show_brand_strip?: boolean
          show_signature_block?: boolean
          show_terms_block?: boolean
          show_trust_strip?: boolean
          specialties?: string[] | null
          state?: string | null
          table_style?: string | null
          tagline?: string | null
          tenant_id?: string
          terms_text?: string | null
          timezone?: string | null
          typical_duration_days?: number | null
          updated_at?: string
          watermark_opacity?: number
          watermark_text?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      digest_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json | null
          sent_to: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          sent_to?: string | null
          status: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          sent_to?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          budget_monthly: number | null
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          budget_monthly?: number | null
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          budget_monthly?: number | null
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          deleted_at: string | null
          description: string | null
          expense_date: string
          id: string
          lead_id: string | null
          payment_mode: string | null
          quotation_id: string | null
          receipt_url: string | null
          recorded_by: string | null
          reference: string | null
          tenant_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          lead_id?: string | null
          payment_mode?: string | null
          quotation_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          lead_id?: string | null
          payment_mode?: string | null
          quotation_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reminder_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          invoice_id: string | null
          sent_to: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          invoice_id?: string | null
          sent_to?: string | null
          status: string
          tenant_id?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          invoice_id?: string | null
          sent_to?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_reminder_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_presets: {
        Row: {
          created_at: string
          hsn_sac_code: string | null
          id: string
          is_default: boolean
          label: string
          rate: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hsn_sac_code?: string | null
          id?: string
          is_default?: boolean
          label: string
          rate: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hsn_sac_code?: string | null
          id?: string
          is_default?: boolean
          label?: string
          rate?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_fy_seq: {
        Row: {
          fy_start: number
          last_seq: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          fy_start: number
          last_seq?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          fy_start?: number
          last_seq?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          due_date: string
          gst_amount: number
          gst_enabled: boolean
          gst_rate: number
          id: string
          invoice_number: string
          issue_date: string
          last_reminder_at: string | null
          lead_id: string | null
          milestone: string | null
          milestone_label: string | null
          notes: string | null
          paid_amount: number
          paid_on: string | null
          pdf_url: string | null
          quotation_id: string | null
          reminder_count: number
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          due_date?: string
          gst_amount?: number
          gst_enabled?: boolean
          gst_rate?: number
          id?: string
          invoice_number: string
          issue_date?: string
          last_reminder_at?: string | null
          lead_id?: string | null
          milestone?: string | null
          milestone_label?: string | null
          notes?: string | null
          paid_amount?: number
          paid_on?: string | null
          pdf_url?: string | null
          quotation_id?: string | null
          reminder_count?: number
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          due_date?: string
          gst_amount?: number
          gst_enabled?: boolean
          gst_rate?: number
          id?: string
          invoice_number?: string
          issue_date?: string
          last_reminder_at?: string | null
          lead_id?: string | null
          milestone?: string | null
          milestone_label?: string | null
          notes?: string | null
          paid_amount?: number
          paid_on?: string | null
          pdf_url?: string | null
          quotation_id?: string | null
          reminder_count?: number
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          follow_up_date: string
          id: string
          lead_id: string
          note: string | null
          outcome: string | null
          tenant_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          follow_up_date: string
          id?: string
          lead_id: string
          note?: string | null
          outcome?: string | null
          tenant_id?: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          follow_up_date?: string
          id?: string
          lead_id?: string
          note?: string | null
          outcome?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          lead_id: string
          sent_by: string | null
          template_key: string | null
          template_title: string | null
          tenant_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          lead_id: string
          sent_by?: string | null
          template_key?: string | null
          template_title?: string | null
          tenant_id?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string
          sent_by?: string | null
          template_key?: string | null
          template_title?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_routing_rules: {
        Row: {
          active: boolean
          assign_to: string | null
          created_at: string
          id: string
          match_city: string | null
          match_source: string | null
          name: string
          round_robin_pool: Json | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          assign_to?: string | null
          created_at?: string
          id?: string
          match_city?: string | null
          match_source?: string | null
          name: string
          round_robin_pool?: Json | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          assign_to?: string | null
          created_at?: string
          id?: string
          match_city?: string | null
          match_source?: string | null
          name?: string
          round_robin_pool?: Json | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_tags: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ad_id: string | null
          assigned_to: string | null
          budget: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          details: string | null
          email: string | null
          floorplan_url: string | null
          form_id: string | null
          id: string
          name: string
          next_followup_date: string | null
          payment_10_amount: number | null
          payment_10_percent: boolean | null
          payment_100_amount: number | null
          payment_100_percent: boolean | null
          payment_50_amount: number | null
          payment_50_percent: boolean | null
          phone: string
          pincode: string | null
          project_type: string | null
          resume_url: string | null
          source: string | null
          stage: string | null
          status: string | null
          tenant_id: string
          timeline: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ad_id?: string | null
          assigned_to?: string | null
          budget?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          details?: string | null
          email?: string | null
          floorplan_url?: string | null
          form_id?: string | null
          id?: string
          name: string
          next_followup_date?: string | null
          payment_10_amount?: number | null
          payment_10_percent?: boolean | null
          payment_100_amount?: number | null
          payment_100_percent?: boolean | null
          payment_50_amount?: number | null
          payment_50_percent?: boolean | null
          phone: string
          pincode?: string | null
          project_type?: string | null
          resume_url?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          tenant_id?: string
          timeline?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ad_id?: string | null
          assigned_to?: string | null
          budget?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          details?: string | null
          email?: string | null
          floorplan_url?: string | null
          form_id?: string | null
          id?: string
          name?: string
          next_followup_date?: string | null
          payment_10_amount?: number | null
          payment_10_percent?: boolean | null
          payment_100_amount?: number | null
          payment_100_percent?: boolean | null
          payment_50_amount?: number | null
          payment_50_percent?: boolean | null
          phone?: string
          pincode?: string | null
          project_type?: string | null
          resume_url?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          tenant_id?: string
          timeline?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          delivered_at: string | null
          error: string | null
          id: string
          lead_id: string | null
          merged_vars: Json
          name: string | null
          phone: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          merged_vars?: Json
          name?: string | null
          phone: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          merged_vars?: Json
          name?: string | null
          phone?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience_count: number
          audience_csv_url: string | null
          audience_filter: Json
          channel_type: string
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          message_body: string | null
          name: string
          scheduled_at: string | null
          started_at: string | null
          stats: Json
          status: string
          template_language: string | null
          template_name: string | null
          template_variables: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          audience_count?: number
          audience_csv_url?: string | null
          audience_filter?: Json
          channel_type?: string
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          message_body?: string | null
          name: string
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json
          status?: string
          template_language?: string | null
          template_name?: string | null
          template_variables?: Json
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          audience_count?: number
          audience_csv_url?: string | null
          audience_filter?: Json
          channel_type?: string
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          message_body?: string | null
          name?: string
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json
          status?: string
          template_language?: string | null
          template_name?: string | null
          template_variables?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_channels: {
        Row: {
          channel_type: string
          config: Json
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          last_error: string | null
          last_event_at: string | null
          secret_ref: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel_type: string
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          last_error?: string | null
          last_event_at?: string | null
          secret_ref?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          last_error?: string | null
          last_event_at?: string | null
          secret_ref?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_inbound_leads: {
        Row: {
          ad_name: string | null
          campaign_name: string | null
          channel_type: string
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          payload: Json
          processed_at: string | null
          tenant_id: string
        }
        Insert: {
          ad_name?: string | null
          campaign_name?: string | null
          channel_type: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          processed_at?: string | null
          tenant_id?: string
        }
        Update: {
          ad_name?: string | null
          campaign_name?: string | null
          channel_type?: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          processed_at?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      material_pricing: {
        Row: {
          cost_rate_per_sqft: number
          created_at: string
          id: string
          key: string
          label: string
          rate_per_sqft: number
          scope: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cost_rate_per_sqft?: number
          created_at?: string
          id?: string
          key: string
          label: string
          rate_per_sqft?: number
          scope: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          cost_rate_per_sqft?: number
          created_at?: string
          id?: string
          key?: string
          label?: string
          rate_per_sqft?: number
          scope?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_room_pricing: {
        Row: {
          category_key: string
          cost_rate_per_sqft: number
          created_at: string
          id: string
          material_key: string
          rate_per_sqft: number
          room_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category_key: string
          cost_rate_per_sqft?: number
          created_at?: string
          id?: string
          material_key: string
          rate_per_sqft?: number
          room_key: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          category_key?: string
          cost_rate_per_sqft?: number
          created_at?: string
          id?: string
          material_key?: string
          rate_per_sqft?: number
          room_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          key: string
          placeholders: string[]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          key: string
          placeholders?: string[]
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          key?: string
          placeholders?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_milestone_template_items: {
        Row: {
          created_at: string
          due_offset_days: number
          id: string
          label: string
          percentage: number
          sort_order: number
          template_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          due_offset_days?: number
          id?: string
          label: string
          percentage: number
          sort_order?: number
          template_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          due_offset_days?: number
          id?: string
          label?: string
          percentage?: number
          sort_order?: number
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_milestone_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payment_milestone_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_milestone_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          invoice_id: string | null
          lead_id: string | null
          milestone: string | null
          mode: string
          notes: string | null
          paid_on: string
          quotation_id: string | null
          receipt_url: string | null
          recorded_by: string | null
          reference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          milestone?: string | null
          mode?: string
          notes?: string | null
          paid_on?: string
          quotation_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          milestone?: string | null
          mode?: string
          notes?: string | null
          paid_on?: string
          quotation_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          sub_statuses: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          sub_statuses?: Json
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          sub_statuses?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          ip: string | null
          mobile: string | null
          name: string | null
          otp_hash: string
          user_agent: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          ip?: string | null
          mobile?: string | null
          name?: string | null
          otp_hash: string
          user_agent?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip?: string | null
          mobile?: string | null
          name?: string | null
          otp_hash?: string
          user_agent?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      playbook_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          mobile: string | null
          name: string | null
          source: string
          user_agent: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          mobile?: string | null
          name?: string | null
          source?: string
          user_agent?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mobile?: string | null
          name?: string | null
          source?: string
          user_agent?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      po_status_history: {
        Row: {
          actor: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          purchase_order_id: string
          tenant_id: string
          to_status: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          purchase_order_id: string
          tenant_id?: string
          to_status: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          purchase_order_id?: string
          tenant_id?: string
          to_status?: string
        }
        Relationships: []
      }
      pricing_catalog: {
        Row: {
          active: boolean
          category: string
          cost_fixed: number
          cost_rate_per_sqft: number
          created_at: string
          description: string | null
          fixed_cost: number
          id: string
          item_category: string | null
          item_type: string | null
          name: string
          rate_per_sqft: number
          room_type: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          cost_fixed?: number
          cost_rate_per_sqft?: number
          created_at?: string
          description?: string | null
          fixed_cost?: number
          id?: string
          item_category?: string | null
          item_type?: string | null
          name: string
          rate_per_sqft?: number
          room_type?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          cost_fixed?: number
          cost_rate_per_sqft?: number
          created_at?: string
          description?: string | null
          fixed_cost?: number
          id?: string
          item_category?: string | null
          item_type?: string | null
          name?: string
          rate_per_sqft?: number
          room_type?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_item_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_preset: boolean
          key: string
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_preset?: boolean
          key: string
          label: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_preset?: boolean
          key?: string
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rooms: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_preset: boolean
          key: string
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_preset?: boolean
          key: string
          label: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_preset?: boolean
          key?: string
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          digest_opt_in: boolean
          email: string | null
          full_name: string | null
          id: string
          permissions: Json
          phone: string | null
          role_label: string | null
          tour_completed_at: string | null
          tz: string
          updated_at: string
          working_hours: Json
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          digest_opt_in?: boolean
          email?: string | null
          full_name?: string | null
          id: string
          permissions?: Json
          phone?: string | null
          role_label?: string | null
          tour_completed_at?: string | null
          tz?: string
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          digest_opt_in?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
          permissions?: Json
          phone?: string | null
          role_label?: string | null
          tour_completed_at?: string | null
          tz?: string
          updated_at?: string
          working_hours?: Json
        }
        Relationships: []
      }
      project_boq_items: {
        Row: {
          boq_product_id: string | null
          category: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          po_id: string | null
          project_id: string
          quantity: number
          rate: number
          sort_order: number
          tenant_id: string
          total: number
          unit: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          boq_product_id?: string | null
          category: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          po_id?: string | null
          project_id: string
          quantity?: number
          rate?: number
          sort_order?: number
          tenant_id?: string
          total?: number
          unit?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          boq_product_id?: string | null
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          po_id?: string | null
          project_id?: string
          quantity?: number
          rate?: number
          sort_order?: number
          tenant_id?: string
          total?: number
          unit?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_boq_items_boq_product_id_fkey"
            columns: ["boq_product_id"]
            isOneToOne: false
            referencedRelation: "boq_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boq_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          lead_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          lead_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          created_at: string
          id: string
          item_name: string
          notes: string | null
          project_id: string
          qty_received: number
          qty_required: number
          tenant_id: string
          unit: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          project_id: string
          qty_received?: number
          qty_required?: number
          tenant_id?: string
          unit?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          project_id?: string
          qty_received?: number
          qty_required?: number
          tenant_id?: string
          unit?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          project_id: string
          sort_order: number
          target_date: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          sort_order?: number
          target_date?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          target_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_stage_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          lead_id: string
          photo_url: string
          stage: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          lead_id: string
          photo_url: string
          stage: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          photo_url?: string
          stage?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_end_date: string | null
          budget: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          progress_pct: number
          project_manager: string | null
          project_type: string | null
          quotation_id: string | null
          site_address: string | null
          start_date: string | null
          status: string
          target_end_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          budget?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          progress_pct?: number
          project_manager?: string | null
          project_type?: string | null
          quotation_id?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          budget?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          progress_pct?: number
          project_manager?: string | null
          project_type?: string | null
          quotation_id?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          amount: number
          attachment_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          gst_amount: number
          id: string
          lead_id: string | null
          po_date: string
          po_number: string
          project_id: string | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          gst_amount?: number
          id?: string
          lead_id?: string | null
          po_date?: string
          po_number?: string
          project_id?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          gst_amount?: number
          id?: string
          lead_id?: string | null
          po_date?: string
          po_number?: string
          project_id?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      quotation_room_items: {
        Row: {
          area_sqft: number
          catalog_id: string | null
          cost_rate: number
          created_at: string
          height_ft: number
          id: string
          item_category: string
          item_name: string
          item_type: string
          notes: string | null
          pricing_mode: string
          quantity: number
          quotation_room_id: string
          rate: number
          sort_order: number
          tenant_id: string
          total_cost: number
          width_ft: number
        }
        Insert: {
          area_sqft?: number
          catalog_id?: string | null
          cost_rate?: number
          created_at?: string
          height_ft?: number
          id?: string
          item_category: string
          item_name: string
          item_type: string
          notes?: string | null
          pricing_mode?: string
          quantity?: number
          quotation_room_id: string
          rate?: number
          sort_order?: number
          tenant_id?: string
          total_cost?: number
          width_ft?: number
        }
        Update: {
          area_sqft?: number
          catalog_id?: string | null
          cost_rate?: number
          created_at?: string
          height_ft?: number
          id?: string
          item_category?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          pricing_mode?: string
          quantity?: number
          quotation_room_id?: string
          rate?: number
          sort_order?: number
          tenant_id?: string
          total_cost?: number
          width_ft?: number
        }
        Relationships: []
      }
      quotation_rooms: {
        Row: {
          area_sqft: number
          core_material_id: string | null
          core_material_name: string | null
          core_material_rate: number
          created_at: string
          custom_cost: number
          depth_ft: number | null
          hardware_fixed: number
          hardware_id: string | null
          hardware_name: string | null
          hardware_rate: number
          height_ft: number
          id: string
          material_id: string | null
          material_name: string | null
          material_rate: number
          material_type_key: string | null
          notes: string | null
          quantity: number
          quotation_id: string
          room_name: string
          room_type: string | null
          shutter_finish: string | null
          sort_order: number
          tenant_id: string
          total_cost: number
          width_ft: number
        }
        Insert: {
          area_sqft?: number
          core_material_id?: string | null
          core_material_name?: string | null
          core_material_rate?: number
          created_at?: string
          custom_cost?: number
          depth_ft?: number | null
          hardware_fixed?: number
          hardware_id?: string | null
          hardware_name?: string | null
          hardware_rate?: number
          height_ft?: number
          id?: string
          material_id?: string | null
          material_name?: string | null
          material_rate?: number
          material_type_key?: string | null
          notes?: string | null
          quantity?: number
          quotation_id: string
          room_name: string
          room_type?: string | null
          shutter_finish?: string | null
          sort_order?: number
          tenant_id?: string
          total_cost?: number
          width_ft?: number
        }
        Update: {
          area_sqft?: number
          core_material_id?: string | null
          core_material_name?: string | null
          core_material_rate?: number
          created_at?: string
          custom_cost?: number
          depth_ft?: number | null
          hardware_fixed?: number
          hardware_id?: string | null
          hardware_name?: string | null
          hardware_rate?: number
          height_ft?: number
          id?: string
          material_id?: string | null
          material_name?: string | null
          material_rate?: number
          material_type_key?: string | null
          notes?: string | null
          quantity?: number
          quotation_id?: string
          room_name?: string
          room_type?: string | null
          shutter_finish?: string | null
          sort_order?: number
          tenant_id?: string
          total_cost?: number
          width_ft?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_rooms_hardware_id_fkey"
            columns: ["hardware_id"]
            isOneToOne: false
            referencedRelation: "pricing_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_rooms_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "pricing_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_rooms_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_send_history: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_revision: boolean
          message_body: string | null
          note: string | null
          pdf_url: string | null
          quotation_id: string
          sent_at: string
          sent_by: string | null
          tenant_id: string
          version: number
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_revision?: boolean
          message_body?: string | null
          note?: string | null
          pdf_url?: string | null
          quotation_id: string
          sent_at?: string
          sent_by?: string | null
          tenant_id?: string
          version?: number
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_revision?: boolean
          message_body?: string | null
          note?: string | null
          pdf_url?: string | null
          quotation_id?: string
          sent_at?: string
          sent_by?: string | null
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_send_history_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          quotation_id: string
          snapshot: Json
          tenant_id: string
          total_amount: number
          trigger: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          quotation_id: string
          snapshot: Json
          tenant_id?: string
          total_amount?: number
          trigger?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          quotation_id?: string
          snapshot?: Json
          tenant_id?: string
          total_amount?: number
          trigger?: string
          version_number?: number
        }
        Relationships: []
      }
      quotation_workflow_log: {
        Row: {
          actor: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          quotation_id: string
          tenant_id: string
          to_status: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          quotation_id: string
          tenant_id?: string
          to_status: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          quotation_id?: string
          tenant_id?: string
          to_status?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          auto_project_id: string | null
          brand_selections: Json
          client_approved_at: string | null
          core_material_brand: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          decided_at: string | null
          decision_note: string | null
          deleted_at: string | null
          discount_amount: number
          discount_type: string
          discount_value: number
          gst_amount: number
          gst_enabled: boolean
          gst_rate: number
          hardware_brand: string | null
          id: string
          laminate_brand: string | null
          last_sent_at: string | null
          lead_id: string | null
          negotiation_started_at: string | null
          notes: string | null
          payment_link_created_at: string | null
          payment_link_id: string | null
          payment_link_url: string | null
          payment_status: string | null
          pdf_url: string | null
          project_location: string | null
          project_name: string | null
          project_type: string | null
          quotation_date: string
          quotation_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          revision_count: number
          sales_person: string | null
          sent_at: string | null
          status: string
          submitted_for_review_at: string | null
          subtotal: number
          template_format: string
          tenant_id: string
          terms_conditions: string | null
          total_amount: number
          updated_at: string
          validity_days: number
          workflow_status: string
        }
        Insert: {
          auto_project_id?: string | null
          brand_selections?: Json
          client_approved_at?: string | null
          core_material_brand?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          decided_at?: string | null
          decision_note?: string | null
          deleted_at?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          gst_amount?: number
          gst_enabled?: boolean
          gst_rate?: number
          hardware_brand?: string | null
          id?: string
          laminate_brand?: string | null
          last_sent_at?: string | null
          lead_id?: string | null
          negotiation_started_at?: string | null
          notes?: string | null
          payment_link_created_at?: string | null
          payment_link_id?: string | null
          payment_link_url?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          project_location?: string | null
          project_name?: string | null
          project_type?: string | null
          quotation_date?: string
          quotation_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number
          sales_person?: string | null
          sent_at?: string | null
          status?: string
          submitted_for_review_at?: string | null
          subtotal?: number
          template_format?: string
          tenant_id?: string
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          validity_days?: number
          workflow_status?: string
        }
        Update: {
          auto_project_id?: string | null
          brand_selections?: Json
          client_approved_at?: string | null
          core_material_brand?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          decided_at?: string | null
          decision_note?: string | null
          deleted_at?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          gst_amount?: number
          gst_enabled?: boolean
          gst_rate?: number
          hardware_brand?: string | null
          id?: string
          laminate_brand?: string | null
          last_sent_at?: string | null
          lead_id?: string | null
          negotiation_started_at?: string | null
          notes?: string | null
          payment_link_created_at?: string | null
          payment_link_id?: string | null
          payment_link_url?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          project_location?: string | null
          project_name?: string | null
          project_type?: string | null
          quotation_date?: string
          quotation_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number
          sales_person?: string | null
          sent_at?: string | null
          status?: string
          submitted_for_review_at?: string | null
          subtotal?: number
          template_format?: string
          tenant_id?: string
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          validity_days?: number
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      razorpay_plans: {
        Row: {
          amount_inr: number
          billing_cycle: string
          created_at: string
          id: string
          plan: string
          razorpay_plan_id: string | null
          updated_at: string
          variant: string
        }
        Insert: {
          amount_inr: number
          billing_cycle: string
          created_at?: string
          id?: string
          plan: string
          razorpay_plan_id?: string | null
          updated_at?: string
          variant?: string
        }
        Update: {
          amount_inr?: number
          billing_cycle?: string
          created_at?: string
          id?: string
          plan?: string
          razorpay_plan_id?: string | null
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      recurring_invoice_templates: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          created_by: string | null
          frequency: string
          gst_enabled: boolean
          gst_rate: number
          id: string
          last_generated_at: string | null
          lead_id: string | null
          milestone: string | null
          milestone_label: string | null
          next_run_date: string
          notes: string | null
          quotation_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          created_at?: string
          created_by?: string | null
          frequency?: string
          gst_enabled?: boolean
          gst_rate?: number
          id?: string
          last_generated_at?: string | null
          lead_id?: string | null
          milestone?: string | null
          milestone_label?: string | null
          next_run_date?: string
          notes?: string | null
          quotation_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          created_by?: string | null
          frequency?: string
          gst_enabled?: boolean
          gst_rate?: number
          id?: string
          last_generated_at?: string | null
          lead_id?: string | null
          milestone?: string | null
          milestone_label?: string | null
          next_run_date?: string
          notes?: string | null
          quotation_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_category_map: {
        Row: {
          category_key: string
          created_at: string
          enabled: boolean
          id: string
          room_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category_key: string
          created_at?: string
          enabled?: boolean
          id?: string
          room_key: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          category_key?: string
          created_at?: string
          enabled?: boolean
          id?: string
          room_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      signup_rate_limits: {
        Row: {
          attempted_at: string
          email: string | null
          id: string
          ip_address: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address: string
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount_inr: number
          charged_at: string
          created_at: string
          id: string
          raw: Json | null
          razorpay_invoice_id: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          short_url: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_inr?: number
          charged_at?: string
          created_at?: string
          id?: string
          raw?: Json | null
          razorpay_invoice_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          short_url?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_inr?: number
          charged_at?: string
          created_at?: string
          id?: string
          raw?: Json | null
          razorpay_invoice_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          short_url?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          current_end: string | null
          current_start: string | null
          id: string
          plan: string
          promo_locked: boolean
          raw: Json | null
          razorpay_plan_id: string | null
          razorpay_subscription_id: string | null
          short_url: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          current_end?: string | null
          current_start?: string | null
          id?: string
          plan: string
          promo_locked?: boolean
          raw?: Json | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          short_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_end?: string | null
          current_start?: string | null
          id?: string
          plan?: string
          promo_locked?: boolean
          raw?: Json | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          short_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          calendar_html_link: string | null
          calendar_synced_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          lead_id: string | null
          priority: string
          project_id: string | null
          quotation_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          calendar_html_link?: string | null
          calendar_synced_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          project_id?: string | null
          quotation_id?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          calendar_html_link?: string | null
          calendar_synced_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          project_id?: string | null
          quotation_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          name: string | null
          phone: string | null
          proposed_role: string
          status: string
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          phone?: string | null
          proposed_role?: string
          status?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          phone?: string | null
          proposed_role?: string
          status?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          created_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_po_dispatch_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          purchase_order_id: string
          recipient: string | null
          sent_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          purchase_order_id: string
          recipient?: string | null
          sent_by?: string | null
          status: string
          tenant_id?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          purchase_order_id?: string
          recipient?: string | null
          sent_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_po_dispatch_log_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean
          address: string | null
          category: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          category?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invite: { Args: { _token: string }; Returns: Json }
      can_edit_sales: { Args: { _user_id: string }; Returns: boolean }
      can_manage_team: { Args: { _user_id: string }; Returns: boolean }
      cleanup_playbook_otps: { Args: never; Returns: number }
      cleanup_signup_rate_limits: { Args: never; Returns: number }
      clone_quotation: { Args: { _source_id: string }; Returns: string }
      complete_onboarding: { Args: { payload: Json }; Returns: Json }
      current_profile_identifier: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      default_public_tenant_id: { Args: never; Returns: string }
      get_client_portal_data: { Args: { _token: string }; Returns: Json }
      get_my_subscription: {
        Args: never
        Returns: {
          billing_cycle: string
          current_end: string
          current_start: string
          id: string
          plan: string
          promo_locked: boolean
          razorpay_subscription_id: string
          short_url: string
          status: string
        }[]
      }
      has_finance_access: { Args: { _user_id: string }; Returns: boolean }
      has_lead_access: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_project_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_owner_equivalent: { Args: { _user_id: string }; Returns: boolean }
      mark_overdue_invoices: { Args: never; Returns: number }
      mark_tour_completed: { Args: never; Returns: undefined }
      next_invoice_number: { Args: never; Returns: string }
      plan_limit: { Args: { _kind: string; _plan: string }; Returns: number }
      purge_trash: { Args: { _days: number }; Returns: number }
      restore_entity: {
        Args: { _entity: string; _id: string }
        Returns: undefined
      }
      save_quotation: { Args: { payload: Json }; Returns: Json }
      snapshot_quotation: {
        Args: { _label?: string; _quotation_id: string; _trigger?: string }
        Returns: Json
      }
      soft_delete_entity: {
        Args: { _entity: string; _id: string }
        Returns: undefined
      }
      tenant_effective_plan: { Args: { _tenant_id: string }; Returns: string }
      transition_quotation_workflow: {
        Args: { _note?: string; _quotation_id: string; _to: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "designer"
        | "sales"
        | "installer"
        | "owner"
        | "accounts"
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
      app_role: [
        "admin",
        "manager",
        "designer",
        "sales",
        "installer",
        "owner",
        "accounts",
      ],
    },
  },
} as const
