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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          company_id?: string | null;
          full_name?: string | null;
          role?: string | null;
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
          notes: string | null;
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
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          discipline?: string;
          status?: "En diffusion" | "Creation" | "En pause";
          next_date?: string | null;
          budget?: number | null;
          notes?: string | null;
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
      contacts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          organization: string;
          role: string | null;
          email: string | null;
          city: string | null;
          status: "Prospect" | "En discussion" | "Partenaire";
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          organization: string;
          role?: string | null;
          email?: string | null;
          city?: string | null;
          status?: "Prospect" | "En discussion" | "Partenaire";
          created_at?: string;
        };
        Update: {
          name?: string;
          organization?: string;
          role?: string | null;
          email?: string | null;
          city?: string | null;
          status?: "Prospect" | "En discussion" | "Partenaire";
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
          created_at?: string;
        };
        Update: {
          contact_id?: string | null;
          show_id?: string | null;
          title?: string;
          stage?: string;
          value?: number | null;
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
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          due_date: string;
          related_to?: string | null;
          done?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          due_date?: string;
          related_to?: string | null;
          done?: boolean;
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
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_workspace: {
        Args: {
          company_name?: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
