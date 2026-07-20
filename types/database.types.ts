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
          created_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          full_name?: string | null;
          role?: "owner" | "admin" | "member" | "readonly";
          is_super_admin?: boolean;
          created_at?: string;
        };
        Update: {
          company_id?: string | null;
          full_name?: string | null;
          role?: "owner" | "admin" | "member" | "readonly";
          is_super_admin?: boolean;
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
          themes: string[];
          target_audience: string | null;
          email_pitch: string | null;
          notes: string | null;
          poster_url: string | null;
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
          themes?: string[];
          target_audience?: string | null;
          email_pitch?: string | null;
          notes?: string | null;
          poster_url?: string | null;
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
          themes?: string[];
          target_audience?: string | null;
          email_pitch?: string | null;
          notes?: string | null;
          poster_url?: string | null;
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
      contacts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          organization: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          city: string | null;
          status: "Prospect" | "En discussion" | "Partenaire";
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          organization: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          status?: "Prospect" | "En discussion" | "Partenaire";
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          organization?: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
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
      reminders: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          due_date: string;
          related_to: string | null;
          opportunity_id: string | null;
          contact_id: string | null;
          priority: "low" | "normal" | "high";
          done: boolean;
          completed_at: string | null;
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
          priority?: "low" | "normal" | "high";
          done?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          due_date?: string;
          related_to?: string | null;
          opportunity_id?: string | null;
          contact_id?: string | null;
          priority?: "low" | "normal" | "high";
          done?: boolean;
          completed_at?: string | null;
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
            | "Devis";
          status: "Manquant" | "A mettre a jour" | "Pret";
          file_url: string | null;
          storage_path: string | null;
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
            | "Devis";
          status?: "Manquant" | "A mettre a jour" | "Pret";
          file_url?: string | null;
          storage_path?: string | null;
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
            | "Devis";
          status?: "Manquant" | "A mettre a jour" | "Pret";
          file_url?: string | null;
          storage_path?: string | null;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
