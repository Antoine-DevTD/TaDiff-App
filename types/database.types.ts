export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      platform_admin_access: {
        Row: { user_id: string; permissions: string[]; granted_by: string | null; created_at: string; updated_at: string };
        Insert: { user_id: string; permissions?: string[]; granted_by?: string | null; created_at?: string; updated_at?: string };
        Update: { permissions?: string[]; granted_by?: string | null; updated_at?: string };
        Relationships: [];
      };
      platform_resources: {
        Row: { id: string; title: string; description: string | null; category: string; url: string; active: boolean; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; title: string; description?: string | null; category?: string; url: string; active?: boolean; sort_order?: number; created_at?: string; updated_at?: string };
        Update: { title?: string; description?: string | null; category?: string; url?: string; active?: boolean; sort_order?: number; updated_at?: string };
        Relationships: [];
      };
      william_question_events: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          question_excerpt: string;
          topic: "actions" | "spectacles" | "diffusion" | "emails" | "documents" | "finances" | "aides" | "agenda" | "tadiff" | "autre";
          request_kind: string;
          answered: boolean;
          out_of_scope: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          question_excerpt: string;
          topic: "actions" | "spectacles" | "diffusion" | "emails" | "documents" | "finances" | "aides" | "agenda" | "tadiff" | "autre";
          request_kind?: string;
          answered?: boolean;
          out_of_scope?: boolean;
          created_at?: string;
        };
        Update: {
          question_excerpt?: string;
          topic?: "actions" | "spectacles" | "diffusion" | "emails" | "documents" | "finances" | "aides" | "agenda" | "tadiff" | "autre";
          request_kind?: string;
          answered?: boolean;
          out_of_scope?: boolean;
        };
        Relationships: [];
      };
      william_conversations: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          show_id: string;
          objective: "logline" | "synopsis" | "intention" | "email_pitch";
          mode: "interview" | "documents";
          source_context: string;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          show_id: string;
          objective: "logline" | "synopsis" | "intention" | "email_pitch";
          mode: "interview" | "documents";
          source_context?: string;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          objective?: "logline" | "synopsis" | "intention" | "email_pitch";
          mode?: "interview" | "documents";
          source_context?: string;
          status?: "active" | "archived";
          updated_at?: string;
        };
        Relationships: [];
      };
      william_messages: {
        Row: {
          id: string;
          conversation_id: string;
          company_id: string;
          user_id: string | null;
          role: "user" | "assistant";
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          company_id: string;
          user_id?: string | null;
          role: "user" | "assistant";
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          billing_status: "trial" | "active" | "comped" | "past_due" | "cancelled";
          plan_code: string;
          comped_until: string | null;
          billing_notes: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          stripe_current_period_end: string | null;
          ai_enabled: boolean;
          ai_monthly_token_quota: number;
          ai_bonus_token_balance: number;
          city: string | null;
          discipline: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          siret: string | null;
          license_number: string | null;
          logo_url: string | null;
          description: string | null;
          invite_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          billing_status?: "trial" | "active" | "comped" | "past_due" | "cancelled";
          plan_code?: string;
          comped_until?: string | null;
          billing_notes?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          stripe_current_period_end?: string | null;
          ai_enabled?: boolean;
          ai_monthly_token_quota?: number;
          ai_bonus_token_balance?: number;
          city?: string | null;
          discipline?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          siret?: string | null;
          license_number?: string | null;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          billing_status?: "trial" | "active" | "comped" | "past_due" | "cancelled";
          plan_code?: string;
          comped_until?: string | null;
          billing_notes?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          stripe_current_period_end?: string | null;
          ai_enabled?: boolean;
          ai_monthly_token_quota?: number;
          ai_bonus_token_balance?: number;
          city?: string | null;
          discipline?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          siret?: string | null;
          license_number?: string | null;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      company_documents: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          doc_type: string;
          storage_path: string | null;
          storage_provider: "supabase" | "r2";
          file_url: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          doc_type?: string;
          storage_path?: string | null;
          storage_provider?: "supabase" | "r2";
          file_url?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          doc_type?: string;
          storage_path?: string | null;
          storage_provider?: "supabase" | "r2";
          file_url?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          event_date: string;
          kind: "event" | "deadline" | "show";
          related_show_id: string | null;
          note: string | null;
          all_day: boolean;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          event_date: string;
          kind?: "event" | "deadline" | "show";
          related_show_id?: string | null;
          note?: string | null;
          all_day?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          event_date?: string;
          kind?: "event" | "deadline" | "show";
          related_show_id?: string | null;
          note?: string | null;
          all_day?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string | null;
          role: "owner" | "admin" | "member" | "readonly";
          is_super_admin: boolean;
          is_founder: boolean;
          ai_access_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          full_name?: string | null;
          role?: "owner" | "admin" | "member" | "readonly";
          is_super_admin?: boolean;
          is_founder?: boolean;
          ai_access_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          company_id?: string | null;
          full_name?: string | null;
          role?: "owner" | "admin" | "member" | "readonly";
          is_super_admin?: boolean;
          is_founder?: boolean;
          ai_access_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      shows: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          discipline: string;
          status: "En diffusion" | "Creation" | "En pause";
          next_date: string | null;
          budget: number | null;
          detailed_budget_enabled: boolean;
          logline: string | null;
          synopsis_text: string | null;
          intention_note_text: string | null;
          themes: string[];
          target_audience: string | null;
          email_pitch: string | null;
          notes: string | null;
          poster_url: string | null;
          capture_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          discipline: string;
          status?: "En diffusion" | "Creation" | "En pause";
          next_date?: string | null;
          budget?: number | null;
          detailed_budget_enabled?: boolean;
          logline?: string | null;
          synopsis_text?: string | null;
          intention_note_text?: string | null;
          themes?: string[];
          target_audience?: string | null;
          email_pitch?: string | null;
          notes?: string | null;
          poster_url?: string | null;
          capture_url?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          discipline?: string;
          status?: "En diffusion" | "Creation" | "En pause";
          next_date?: string | null;
          budget?: number | null;
          detailed_budget_enabled?: boolean;
          logline?: string | null;
          synopsis_text?: string | null;
          intention_note_text?: string | null;
          themes?: string[];
          target_audience?: string | null;
          email_pitch?: string | null;
          notes?: string | null;
          poster_url?: string | null;
          capture_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shows_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      show_budget_items: {
        Row: {
          id: string;
          company_id: string;
          show_id: string;
          kind: "expense" | "revenue";
          category: string;
          label: string;
          amount: number;
          scope: "creation" | "performance";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          show_id: string;
          kind: "expense" | "revenue";
          category: string;
          label: string;
          amount?: number;
          scope?: "creation" | "performance";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          show_id?: string;
          kind?: "expense" | "revenue";
          category?: string;
          label?: string;
          amount?: number;
          scope?: "creation" | "performance";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "show_budget_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_budget_items_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      show_budget_profiles: {
        Row: {
          show_id: string;
          company_id: string;
          convention: string;
          rate_source_url: string | null;
          rate_effective_date: string | null;
          performances_target: number;
          exploitation_mode: "cession" | "revenue_share" | "rental";
          cession_fee: number;
          venue_rental: number;
          minimum_guarantee: number;
          company_share_percent: number;
          average_ticket_price: number;
          venue_capacity: number;
          expected_occupancy_percent: number;
          rights_territory: "paris" | "outside_paris";
          author_rights_percent: number;
          sacd_contribution_percent: number;
          director_rights_percent: number;
          music_rights_percent: number;
          overhead_percent: number;
          contingency_percent: number;
          cession_margin_percent: number;
          personnel: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          show_id: string;
          company_id: string;
          convention?: string;
          rate_source_url?: string | null;
          rate_effective_date?: string | null;
          performances_target?: number;
          exploitation_mode?: "cession" | "revenue_share" | "rental";
          cession_fee?: number;
          venue_rental?: number;
          minimum_guarantee?: number;
          company_share_percent?: number;
          average_ticket_price?: number;
          venue_capacity?: number;
          expected_occupancy_percent?: number;
          rights_territory?: "paris" | "outside_paris";
          author_rights_percent?: number;
          sacd_contribution_percent?: number;
          director_rights_percent?: number;
          music_rights_percent?: number;
          overhead_percent?: number;
          contingency_percent?: number;
          cession_margin_percent?: number;
          personnel?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["show_budget_profiles"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "show_budget_profiles_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "show_budget_profiles_show_id_fkey"; columns: ["show_id"]; isOneToOne: true; referencedRelation: "shows"; referencedColumns: ["id"] },
        ];
      };
      show_work_folders: {
        Row: { id: string; company_id: string; show_id: string; parent_id: string | null; name: string; created_at: string };
        Insert: { id?: string; company_id: string; show_id: string; parent_id?: string | null; name: string; created_at?: string };
        Update: { parent_id?: string | null; name?: string };
        Relationships: [];
      };
      show_work_documents: {
        Row: { id: string; company_id: string; show_id: string; folder_id: string | null; title: string; storage_path: string; storage_provider: "supabase" | "r2"; mime_type: string | null; file_size: number; version_number: number; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; show_id: string; folder_id?: string | null; title: string; storage_path: string; storage_provider?: "supabase" | "r2"; mime_type?: string | null; file_size?: number; version_number?: number; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: { folder_id?: string | null; title?: string; storage_path?: string; storage_provider?: "supabase" | "r2"; mime_type?: string | null; file_size?: number; version_number?: number; updated_at?: string };
        Relationships: [];
      };
      show_work_document_versions: {
        Row: { id: string; document_id: string; company_id: string; storage_path: string; storage_provider: "supabase" | "r2"; mime_type: string | null; file_size: number; version_number: number; created_by: string | null; created_at: string };
        Insert: { id?: string; document_id: string; company_id: string; storage_path: string; storage_provider?: "supabase" | "r2"; mime_type?: string | null; file_size?: number; version_number: number; created_by?: string | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          company_id: string;
          contact_type: "person" | "venue";
          venue_id: string | null;
          name: string;
          organization: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          city: string | null;
          address: string | null;
          postal_code: string | null;
          department: string | null;
          region: string | null;
          website: string | null;
          capacity: number | null;
          latitude: number | null;
          longitude: number | null;
          status: "Prospect" | "En discussion" | "Partenaire";
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_type?: "person" | "venue";
          venue_id?: string | null;
          name: string;
          organization: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          postal_code?: string | null;
          department?: string | null;
          region?: string | null;
          website?: string | null;
          capacity?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          status?: "Prospect" | "En discussion" | "Partenaire";
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          contact_type?: "person" | "venue";
          venue_id?: string | null;
          organization?: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          postal_code?: string | null;
          department?: string | null;
          region?: string | null;
          website?: string | null;
          capacity?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          status?: "Prospect" | "En discussion" | "Partenaire";
          tags?: string[] | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunities: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string | null;
          show_id: string | null;
          title: string;
          stage: string;
          value: number | null;
          probability: number;
          exploitation_mode: string;
          cession_fee: number;
          estimated_box_office: number;
          company_share_percent: number;
          minimum_guarantee: number;
          venue_rental: number;
          performance_date: string | null;
          next_action: string | null;
          next_follow_up_at: string | null;
          lost_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id?: string | null;
          show_id?: string | null;
          title: string;
          stage?: string;
          value?: number | null;
          probability?: number;
          exploitation_mode?: string;
          cession_fee?: number;
          estimated_box_office?: number;
          company_share_percent?: number;
          minimum_guarantee?: number;
          venue_rental?: number;
          performance_date?: string | null;
          next_action?: string | null;
          next_follow_up_at?: string | null;
          lost_reason?: string | null;
          created_at?: string;
        };
        Update: {
          contact_id?: string | null;
          show_id?: string | null;
          title?: string;
          stage?: string;
          value?: number | null;
          probability?: number;
          exploitation_mode?: string;
          cession_fee?: number;
          estimated_box_office?: number;
          company_share_percent?: number;
          minimum_guarantee?: number;
          venue_rental?: number;
          performance_date?: string | null;
          next_action?: string | null;
          next_follow_up_at?: string | null;
          lost_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      exploitations: {
        Row: { id: string; company_id: string; show_id: string; contact_id: string | null; opportunity_id: string | null; title: string; venue: string | null; city: string | null; exploitation_mode: string; status: string; start_date: string; end_date: string; cession_fee_per_performance: number; company_share_percent: number; minimum_guarantee: number; venue_rental_total: number; fixed_costs_total: number; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; show_id: string; contact_id?: string | null; opportunity_id?: string | null; title: string; venue?: string | null; city?: string | null; exploitation_mode?: string; status?: string; start_date: string; end_date: string; cession_fee_per_performance?: number; company_share_percent?: number; minimum_guarantee?: number; venue_rental_total?: number; fixed_costs_total?: number; created_at?: string; updated_at?: string };
        Update: { title?: string; contact_id?: string | null; venue?: string | null; city?: string | null; exploitation_mode?: string; status?: string; start_date?: string; end_date?: string; cession_fee_per_performance?: number; company_share_percent?: number; minimum_guarantee?: number; venue_rental_total?: number; fixed_costs_total?: number; updated_at?: string };
        Relationships: [];
      };
      exploitation_performances: {
        Row: { id: string; company_id: string; exploitation_id: string; performance_date: string; performance_time: string | null; capacity: number; paid_tickets: number; complimentary_tickets: number; gross_box_office: number; ticketing_fees: number; variable_costs: number; sacd_declared: boolean; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; exploitation_id: string; performance_date: string; performance_time?: string | null; capacity?: number; paid_tickets?: number; complimentary_tickets?: number; gross_box_office?: number; ticketing_fees?: number; variable_costs?: number; sacd_declared?: boolean; notes?: string | null; created_at?: string; updated_at?: string };
        Update: { performance_date?: string; performance_time?: string | null; capacity?: number; paid_tickets?: number; complimentary_tickets?: number; gross_box_office?: number; ticketing_fees?: number; variable_costs?: number; sacd_declared?: boolean; notes?: string | null; updated_at?: string };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          due_date: string;
          related_to: string | null;
          opportunity_id: string | null;
          contact_id: string | null;
          show_id: string | null;
          action_type: "call" | "email" | "document" | "quote" | "administration" | "other";
          priority: "low" | "normal" | "high";
          done: boolean;
          completed_at: string | null;
          completion_outcome: "positive" | "follow_up" | "no_answer" | "negative" | "other" | null;
          completion_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          due_date: string;
          related_to?: string | null;
          opportunity_id?: string | null;
          contact_id?: string | null;
          show_id?: string | null;
          action_type?: "call" | "email" | "document" | "quote" | "administration" | "other";
          priority?: "low" | "normal" | "high";
          done?: boolean;
          completed_at?: string | null;
          completion_outcome?: "positive" | "follow_up" | "no_answer" | "negative" | "other" | null;
          completion_note?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          due_date?: string;
          related_to?: string | null;
          opportunity_id?: string | null;
          contact_id?: string | null;
          show_id?: string | null;
          action_type?: "call" | "email" | "document" | "quote" | "administration" | "other";
          priority?: "low" | "normal" | "high";
          done?: boolean;
          completed_at?: string | null;
          completion_outcome?: "positive" | "follow_up" | "no_answer" | "negative" | "other" | null;
          completion_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      reminder_events: {
        Row: {
          id: string;
          company_id: string;
          reminder_id: string;
          user_id: string | null;
          show_id: string | null;
          contact_id: string | null;
          reminder_title: string;
          event_type: "created" | "completed" | "reopened" | "rescheduled";
          note: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          reminder_id: string;
          user_id?: string | null;
          show_id?: string | null;
          contact_id?: string | null;
          reminder_title: string;
          event_type: "created" | "completed" | "reopened" | "rescheduled";
          note?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          note?: string | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "reminder_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminder_events_reminder_id_fkey";
            columns: ["reminder_id"];
            isOneToOne: false;
            referencedRelation: "reminders";
            referencedColumns: ["id"];
          },
        ];
      };
      show_documents: {
        Row: {
          id: string;
          company_id: string;
          show_id: string;
          title: string;
          document_type:
            | "Affiche"
            | "Dossier artistique"
            | "Note d'intention"
            | "Synopsis"
            | "Texte"
            | "Budget"
            | "Fiche technique"
            | "RIB"
            | "Statuts"
            | "Devis"
            | "A renseigner";
          status: "Manquant" | "A mettre a jour" | "Pret";
          file_url: string | null;
          storage_path: string | null;
          storage_provider: "supabase" | "r2";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          show_id: string;
          title: string;
          document_type:
            | "Affiche"
            | "Dossier artistique"
            | "Note d'intention"
            | "Synopsis"
            | "Texte"
            | "Budget"
            | "Fiche technique"
            | "RIB"
            | "Statuts"
            | "Devis"
            | "A renseigner";
          status?: "Manquant" | "A mettre a jour" | "Pret";
          file_url?: string | null;
          storage_path?: string | null;
          storage_provider?: "supabase" | "r2";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          show_id?: string;
          title?: string;
          document_type?:
            | "Affiche"
            | "Dossier artistique"
            | "Note d'intention"
            | "Synopsis"
            | "Texte"
            | "Budget"
            | "Fiche technique"
            | "RIB"
            | "Statuts"
            | "Devis"
            | "A renseigner";
          status?: "Manquant" | "A mettre a jour" | "Pret";
          file_url?: string | null;
          storage_path?: string | null;
          storage_provider?: "supabase" | "r2";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "show_documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_documents_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      beta_signups: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          city: string | null;
          discipline: string;
          main_need: string;
          status: "reserved" | "waitlist";
          position: number;
          created_at: string;
          is_demo: boolean;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone?: string | null;
          city?: string | null;
          discipline: string;
          main_need: string;
          status: "reserved" | "waitlist";
          position: number;
          created_at?: string;
          is_demo?: boolean;
        };
        Update: {
          company_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string | null;
          city?: string | null;
          discipline?: string;
          main_need?: string;
          status?: "reserved" | "waitlist";
          position?: number;
          created_at?: string;
          is_demo?: boolean;
        };
        Relationships: [];
      };
      performance_invitations: {
        Row: {
          id: string;
          company_id: string;
          opportunity_id: string;
          performance_opportunity_id: string;
          contact_id: string | null;
          show_id: string | null;
          token: string;
          recipient_name: string;
          recipient_email: string;
          subject: string;
          performance_date: string;
          venue: string | null;
          provider_message_id: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          email_opened_at: string | null;
          email_clicked_at: string | null;
          bounced_at: string | null;
          link_opened_at: string | null;
          responded_at: string | null;
          response: "yes" | "no" | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          opportunity_id: string;
          performance_opportunity_id: string;
          contact_id?: string | null;
          show_id?: string | null;
          token?: string;
          recipient_name: string;
          recipient_email: string;
          subject: string;
          performance_date: string;
          venue?: string | null;
          provider_message_id?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          email_opened_at?: string | null;
          email_clicked_at?: string | null;
          bounced_at?: string | null;
          link_opened_at?: string | null;
          responded_at?: string | null;
          response?: "yes" | "no" | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_message_id?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          email_opened_at?: string | null;
          email_clicked_at?: string | null;
          bounced_at?: string | null;
          link_opened_at?: string | null;
          responded_at?: string | null;
          response?: "yes" | "no" | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fixed_costs: {
        Row: {
          id: string;
          company_id: string;
          label: string;
          category:
            | "Assurance"
            | "Banque"
            | "Comptable"
            | "Stockage"
            | "Logiciel"
            | "Local"
            | "Salaire"
            | "Autre";
          amount: number;
          frequency: "Mensuel" | "Trimestriel" | "Annuel";
          next_due_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          label: string;
          category?:
            | "Assurance"
            | "Banque"
            | "Comptable"
            | "Stockage"
            | "Logiciel"
            | "Local"
            | "Salaire"
            | "Autre";
          amount?: number;
          frequency?: "Mensuel" | "Trimestriel" | "Annuel";
          next_due_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          company_id?: string;
          label?: string;
          category?:
            | "Assurance"
            | "Banque"
            | "Comptable"
            | "Stockage"
            | "Logiciel"
            | "Local"
            | "Salaire"
            | "Autre";
          amount?: number;
          frequency?: "Mensuel" | "Trimestriel" | "Annuel";
          next_due_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fixed_costs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_logs: {
        Row: {
          id: string;
          company_id: string;
          actor_id: string | null;
          actor_name: string;
          action: string;
          entity_type: string;
          entity_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          actor_id?: string | null;
          actor_name?: string;
          action: string;
          entity_type: string;
          entity_label?: string | null;
          created_at?: string;
        };
        Update: {
          action?: string;
          entity_type?: string;
          entity_label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          id: boolean;
          maintenance_mode: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          maintenance_mode?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          maintenance_mode?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      access_events: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          company_id: string | null;
          company_name: string | null;
          actor_name: string;
          event_type: "login" | "signup" | "page_view";
          path: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          company_id?: string | null;
          company_name?: string | null;
          actor_name?: string;
          event_type: "login" | "signup" | "page_view";
          path?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          company_id?: string | null;
          company_name?: string | null;
          actor_name?: string;
          event_type?: "login" | "signup" | "page_view";
          path?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      public_analytics_events: {
        Row: {
          id: string;
          session_id: string;
          event_type: "page_view" | "cta_click" | "beta_signup";
          path: string;
          event_name: string | null;
          target: string | null;
          referrer_host: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          device_type: "mobile" | "tablet" | "desktop";
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: "page_view" | "cta_click" | "beta_signup";
          path: string;
          event_name?: string | null;
          target?: string | null;
          referrer_host?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          device_type?: "mobile" | "tablet" | "desktop";
          created_at?: string;
        };
        Update: {
          session_id?: string;
          event_type?: "page_view" | "cta_click" | "beta_signup";
          path?: string;
          event_name?: string | null;
          target?: string | null;
          referrer_host?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          device_type?: "mobile" | "tablet" | "desktop";
          created_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          public_read: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          public_read?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          value?: Json;
          public_read?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      grant_catalog: {
        Row: {
          id: string;
          title: string;
          funder: string;
          territory: string | null;
          discipline: string | null;
          deadline: string | null;
          amount_max: number;
          eligibility: string | null;
          requirements: string[];
          themes: string[];
          source_url: string | null;
          active: boolean;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          funder: string;
          territory?: string | null;
          discipline?: string | null;
          deadline?: string | null;
          amount_max?: number;
          eligibility?: string | null;
          requirements?: string[];
          themes?: string[];
          source_url?: string | null;
          active?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          funder?: string;
          territory?: string | null;
          discipline?: string | null;
          deadline?: string | null;
          amount_max?: number;
          eligibility?: string | null;
          requirements?: string[];
          themes?: string[];
          source_url?: string | null;
          active?: boolean;
          last_verified_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      patronage_catalog: {
        Row: {
          id: string;
          organization_name: string;
          program_name: string;
          themes: string[];
          territories: string[];
          next_deadline: string | null;
          amount_min: number;
          amount_max: number;
          eligibility: string | null;
          source_url: string | null;
          notes: string | null;
          active: boolean;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_name: string;
          program_name: string;
          themes?: string[];
          territories?: string[];
          next_deadline?: string | null;
          amount_min?: number;
          amount_max?: number;
          eligibility?: string | null;
          source_url?: string | null;
          notes?: string | null;
          active?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_name?: string;
          program_name?: string;
          themes?: string[];
          territories?: string[];
          next_deadline?: string | null;
          amount_min?: number;
          amount_max?: number;
          eligibility?: string | null;
          source_url?: string | null;
          notes?: string | null;
          active?: boolean;
          last_verified_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_email_templates: {
        Row: {
          id: string;
          name: string;
          message_type: "first-touch" | "follow-up" | "date-option";
          subject_template: string;
          body_json: Json;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          message_type?: "first-touch" | "follow-up" | "date-option";
          subject_template: string;
          body_json: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          message_type?: "first-touch" | "follow-up" | "date-option";
          subject_template?: string;
          body_json?: Json;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_settings: {
        Row: {
          id: boolean;
          enabled: boolean;
          provider: "deepseek" | "openai" | "anthropic" | "mistral";
          model: string;
          embedding_provider: "openai" | "supabase";
          embedding_model: string;
          rag_top_k: number;
          system_prompt: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          enabled?: boolean;
          provider?: "deepseek" | "openai" | "anthropic" | "mistral";
          model?: string;
          embedding_provider?: "openai" | "supabase";
          embedding_model?: string;
          rag_top_k?: number;
          system_prompt?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          provider?: "deepseek" | "openai" | "anthropic" | "mistral";
          model?: string;
          embedding_provider?: "openai" | "supabase";
          embedding_model?: string;
          rag_top_k?: number;
          system_prompt?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_token_reservations: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          reserved_tokens: number;
          status: "reserved" | "consumed" | "released";
          created_at: string;
          finalized_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          reserved_tokens: number;
          status?: "reserved" | "consumed" | "released";
          created_at?: string;
          finalized_at?: string | null;
        };
        Update: {
          reserved_tokens?: number;
          status?: "reserved" | "consumed" | "released";
          finalized_at?: string | null;
        };
        Relationships: [];
      };
      ai_usage_events: {
        Row: {
          id: string;
          reservation_id: string | null;
          company_id: string;
          user_id: string;
          provider: "deepseek" | "openai" | "anthropic" | "mistral";
          model: string;
          request_kind: string;
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          company_id: string;
          user_id: string;
          provider: "deepseek" | "openai" | "anthropic";
          model: string;
          request_kind?: string;
          input_tokens?: number;
          output_tokens?: number;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      ai_credit_purchases: {
        Row: {
          id: string;
          company_id: string;
          purchased_by: string | null;
          token_amount: number;
          amount_paid: number;
          currency: string;
          stripe_checkout_session_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          purchased_by?: string | null;
          token_amount: number;
          amount_paid?: number;
          currency?: string;
          stripe_checkout_session_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      rag_documents: {
        Row: {
          id: string;
          company_id: string | null;
          source_type: "manual" | "grant_catalog" | "patronage_catalog" | "show" | "show_document" | "company_document";
          source_id: string | null;
          title: string;
          content: string;
          source_url: string | null;
          metadata: Json;
          embedding: string | null;
          search_vector: unknown;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          source_type: "manual" | "grant_catalog" | "patronage_catalog" | "show" | "show_document" | "company_document";
          source_id?: string | null;
          title: string;
          content: string;
          source_url?: string | null;
          metadata?: Json;
          embedding?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          source_url?: string | null;
          metadata?: Json;
          embedding?: string | null;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rag_documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          message_type: "first-touch" | "follow-up" | "date-option";
          subject_template: string;
          body_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          message_type?: "first-touch" | "follow-up" | "date-option";
          subject_template: string;
          body_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          message_type?: "first-touch" | "follow-up" | "date-option";
          subject_template?: string;
          body_json?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          id: string;
          company_id: string;
          actor_id: string | null;
          actor_name: string;
          page: string | null;
          kind: "bug" | "idee" | "avis";
          message: string;
          status: "nouveau" | "en_cours" | "traite";
          admin_response: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          actor_id?: string | null;
          actor_name?: string;
          page?: string | null;
          kind?: "bug" | "idee" | "avis";
          message: string;
          status?: "nouveau" | "en_cours" | "traite";
          admin_response?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          kind?: "bug" | "idee" | "avis";
          message?: string;
          status?: "nouveau" | "en_cours" | "traite";
          admin_response?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      patronage_deals: {
        Row: {
          id: string;
          company_id: string;
          company_name: string;
          contact_name: string | null;
          amount: number;
          status: "Prospect" | "Argumentaire" | "Negociation" | "Signe";
          next_action: string | null;
          next_follow_up_at: string | null;
          pack_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          company_name: string;
          contact_name?: string | null;
          amount?: number;
          status?: "Prospect" | "Argumentaire" | "Negociation" | "Signe";
          next_action?: string | null;
          next_follow_up_at?: string | null;
          pack_id?: string | null;
          created_at?: string;
        };
        Update: {
          company_name?: string;
          contact_name?: string | null;
          amount?: number;
          status?: "Prospect" | "Argumentaire" | "Negociation" | "Signe";
          next_action?: string | null;
          next_follow_up_at?: string | null;
          pack_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patronage_deals_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      grant_opportunities: {
        Row: {
          id: string;
          company_id: string;
          show_id: string | null;
          title: string;
          funder: string;
          territory: string | null;
          discipline: string | null;
          deadline: string;
          amount: number;
          status: "A surveiller" | "En montage" | "Depose" | "Attribue";
          requirements: string[];
          eligibility: string | null;
          source_url: string | null;
          themes: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          show_id?: string | null;
          title: string;
          funder: string;
          territory?: string | null;
          discipline?: string | null;
          deadline: string;
          amount?: number;
          status?: "A surveiller" | "En montage" | "Depose" | "Attribue";
          requirements?: string[];
          eligibility?: string | null;
          source_url?: string | null;
          themes?: string[];
          created_at?: string;
        };
        Update: {
          show_id?: string | null;
          title?: string;
          funder?: string;
          territory?: string | null;
          discipline?: string | null;
          deadline?: string;
          amount?: number;
          status?: "A surveiller" | "En montage" | "Depose" | "Attribue";
          requirements?: string[];
          eligibility?: string | null;
          source_url?: string | null;
          themes?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grant_opportunities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grant_opportunities_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      treasury_snapshots: {
        Row: {
          id: string;
          company_id: string;
          balance: number;
          recorded_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          balance: number;
          recorded_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          balance?: number;
          recorded_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treasury_snapshots_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          id: string;
          company_id: string;
          opportunity_id: string | null;
          number: string;
          title: string;
          organization: string | null;
          amount: number;
          deposit_due: number;
          balance_due: number;
          status: "A preparer" | "Envoye" | "Acompte attendu" | "Solde attendu" | "Archive";
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          opportunity_id?: string | null;
          number: string;
          title: string;
          organization?: string | null;
          amount?: number;
          deposit_due?: number;
          balance_due?: number;
          status?: "A preparer" | "Envoye" | "Acompte attendu" | "Solde attendu" | "Archive";
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          opportunity_id?: string | null;
          number?: string;
          title?: string;
          organization?: string | null;
          amount?: number;
          deposit_due?: number;
          balance_due?: number;
          status?: "A preparer" | "Envoye" | "Acompte attendu" | "Solde attendu" | "Archive";
          due_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_beta_signup_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          reserved_count: number;
          waitlist_count: number;
        }[];
      };
      get_public_performance_invitation: {
        Args: { invitation_token: string };
        Returns: {
          company_name: string;
          show_title: string | null;
          performance_date: string;
          venue: string | null;
          recipient_name: string;
          response: "yes" | "no" | null;
          responded_at: string | null;
        }[];
      };
      respond_to_performance_invitation: {
        Args: { invitation_token: string; invitation_response: string };
        Returns: boolean;
      };
      ensure_workspace: {
        Args: {
          company_name?: string;
        };
        Returns: string;
      };
      is_company_admin: {
        Args: {
          target_company_id: string;
        };
        Returns: boolean;
      };
      list_company_members: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string | null;
          role: "owner" | "admin" | "member" | "readonly";
          email: string | null;
          is_self: boolean;
        }[];
      };
      set_member_role: {
        Args: {
          target_user_id: string;
          new_role: string;
        };
        Returns: undefined;
      };
      join_company_by_code: {
        Args: {
          code: string;
        };
        Returns: string;
      };
      regenerate_invite_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_company_role: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      company_has_access: {
        Args: {
          target_company_id: string;
        };
        Returns: boolean;
      };
      log_activity: {
        Args: {
          action_text: string;
          entity_type_text: string;
          entity_label_text?: string | null;
        };
        Returns: undefined;
      };
      is_super_admin_user: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_platform_permission: { Args: { requested_permission: string }; Returns: boolean };
      is_platform_admin_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      get_my_platform_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: { is_super_admin: boolean; permissions: string[] }[];
      };
      admin_list_platform_admins: {
        Args: Record<PropertyKey, never>;
        Returns: { user_id: string; email: string; full_name: string; permissions: string[]; updated_at: string }[];
      };
      admin_set_platform_admin: { Args: { target_user_id: string; new_permissions: string[] }; Returns: undefined };
      admin_list_companies: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          billing_status: "trial" | "active" | "comped" | "past_due" | "cancelled";
          plan_code: string;
          comped_until: string | null;
          billing_notes: string | null;
          created_at: string;
          owner_name: string | null;
          owner_email: string | null;
          member_count: number;
          show_count: number;
          contact_count: number;
          deal_count: number;
          last_activity: string | null;
        }[];
      };
      admin_set_company_billing: {
        Args: {
          target_company_id: string;
          new_status: string;
          new_plan_code: string;
          new_comped_until: string | null;
          new_notes: string;
        };
        Returns: undefined;
      };
      admin_list_beta_signups: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          city: string | null;
          discipline: string;
          main_need: string;
          status: "reserved" | "waitlist";
          position: number;
          is_demo: boolean;
          created_at: string;
        }[];
      };
      register_beta_signup: {
        Args: {
          signup_company_name: string;
          signup_contact_name: string;
          signup_email: string;
          signup_phone: string;
          signup_city: string;
          signup_discipline: string;
          signup_main_need: string;
        };
        Returns: {
          status: "reserved" | "waitlist";
          position: number;
        }[];
      };
      submit_feedback: {
        Args: {
          feedback_kind: string;
          feedback_message: string;
          feedback_page?: string | null;
        };
        Returns: undefined;
      };
      admin_list_feedback: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          company_id: string;
          company_name: string;
          actor_name: string;
          page: string | null;
          kind: "bug" | "idee" | "avis";
          message: string;
          status: "nouveau" | "en_cours" | "traite";
          admin_response: string | null;
          created_at: string;
        }[];
      };
      admin_set_maintenance_mode: {
        Args: {
          enabled: boolean;
        };
        Returns: undefined;
      };
      admin_list_access_events: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          id: string;
          user_id: string | null;
          email: string | null;
          company_id: string | null;
          company_name: string | null;
          actor_name: string;
          event_type: "login" | "signup" | "page_view";
          path: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        }[];
      };
      admin_list_public_analytics_events: {
        Args: {
          since_days?: number;
          limit_count?: number;
        };
        Returns: {
          id: string;
          session_id: string;
          event_type: "page_view" | "cta_click" | "beta_signup";
          path: string;
          event_name: string | null;
          target: string | null;
          referrer_host: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          device_type: "mobile" | "tablet" | "desktop";
          created_at: string;
        }[];
      };
      admin_set_feedback_status: {
        Args: {
          target_feedback_id: string;
          new_status: string;
          new_response?: string | null;
        };
        Returns: undefined;
      };
      search_rag_documents: {
        Args: {
          search_query: string;
          target_company_id?: string | null;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          source_type: string;
          source_url: string | null;
          metadata: Json;
          rank: number;
        }[];
      };
      match_rag_documents: {
        Args: {
          query_embedding: string;
          target_company_id?: string | null;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          source_type: string;
          source_url: string | null;
          metadata: Json;
          similarity: number;
        }[];
      };
      get_my_ai_entitlement: {
        Args: Record<PropertyKey, never>;
        Returns: {
          enabled: boolean;
          is_unlimited: boolean;
          monthly_quota: number;
          monthly_used: number;
          bonus_balance: number;
          remaining_tokens: number;
          period_started_at: string;
        }[];
      };
      reserve_my_ai_tokens: {
        Args: { p_requested_tokens: number };
        Returns: string;
      };
      finalize_ai_token_reservation: {
        Args: {
          p_reservation_id: string;
          p_provider: string;
          p_model: string;
          p_input_tokens: number;
          p_output_tokens: number;
          p_request_kind?: string;
        };
        Returns: undefined;
      };
      release_ai_token_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      grant_ai_credit_purchase: {
        Args: {
          p_company_id: string;
          p_purchased_by: string | null;
          p_token_amount: number;
          p_amount_paid: number;
          p_currency: string;
          p_stripe_checkout_session_id: string;
        };
        Returns: undefined;
      };
      admin_list_ai_accounts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          email: string | null;
          full_name: string;
          company_id: string;
          company_name: string;
          company_ai_enabled: boolean;
          user_ai_enabled: boolean;
          is_super_admin: boolean;
          is_founder: boolean;
          role: string;
          monthly_quota: number;
          monthly_used: number;
          account_monthly_used: number;
          bonus_balance: number;
        }[];
      };
      admin_set_company_ai: {
        Args: {
          p_company_id: string;
          p_enabled: boolean;
          p_monthly_quota: number;
          p_bonus_balance: number;
        };
        Returns: undefined;
      };
      admin_set_user_ai_access: {
        Args: { p_user_id: string; p_enabled: boolean };
        Returns: undefined;
      };
      admin_set_founder_account: {
        Args: { p_user_id: string; p_enabled: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
