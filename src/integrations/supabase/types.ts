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
      access_requests: {
        Row: {
          boutique_name: string | null
          centre_id: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          company_email: string | null
          company_name: string | null
          confirm_final: boolean | null
          confirm_hours: boolean | null
          confirm_parking: boolean | null
          confirm_waste: boolean | null
          created_at: string
          created_by: string
          date_end: string | null
          date_start: string | null
          id: string
          intervenant_1: string | null
          intervenant_2: string | null
          intervention_detail: string | null
          location_detail: string | null
          person_company: string | null
          person_name: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          request_code: string | null
          responsible_name: string | null
          responsible_phone: string | null
          risk_electric: boolean | null
          risk_electric_detail: string | null
          risk_fire: boolean | null
          risk_fire_detail: string | null
          risk_height: boolean | null
          risk_height_detail: string | null
          signature_date: string | null
          signature_name: string | null
          status: string
          time_end: string | null
          time_start: string | null
          vehicle_plate: string | null
          visit_date: string
          visit_time: string | null
        }
        Insert: {
          boutique_name?: string | null
          centre_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          company_email?: string | null
          company_name?: string | null
          confirm_final?: boolean | null
          confirm_hours?: boolean | null
          confirm_parking?: boolean | null
          confirm_waste?: boolean | null
          created_at?: string
          created_by: string
          date_end?: string | null
          date_start?: string | null
          id?: string
          intervenant_1?: string | null
          intervenant_2?: string | null
          intervention_detail?: string | null
          location_detail?: string | null
          person_company?: string | null
          person_name: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          request_code?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          risk_electric?: boolean | null
          risk_electric_detail?: string | null
          risk_fire?: boolean | null
          risk_fire_detail?: string | null
          risk_height?: boolean | null
          risk_height_detail?: string | null
          signature_date?: string | null
          signature_name?: string | null
          status?: string
          time_end?: string | null
          time_start?: string | null
          vehicle_plate?: string | null
          visit_date: string
          visit_time?: string | null
        }
        Update: {
          boutique_name?: string | null
          centre_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          company_email?: string | null
          company_name?: string | null
          confirm_final?: boolean | null
          confirm_hours?: boolean | null
          confirm_parking?: boolean | null
          confirm_waste?: boolean | null
          created_at?: string
          created_by?: string
          date_end?: string | null
          date_start?: string | null
          id?: string
          intervenant_1?: string | null
          intervenant_2?: string | null
          intervention_detail?: string | null
          location_detail?: string | null
          person_company?: string | null
          person_name?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          request_code?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          risk_electric?: boolean | null
          risk_electric_detail?: string | null
          risk_fire?: boolean | null
          risk_fire_detail?: string | null
          risk_height?: boolean | null
          risk_height_detail?: string | null
          signature_date?: string | null
          signature_name?: string | null
          status?: string
          time_end?: string | null
          time_start?: string | null
          vehicle_plate?: string | null
          visit_date?: string
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_module_access: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          centre_id: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          centre_id?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          centre_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      banner_config: {
        Row: {
          centre_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
        }
        Insert: {
          centre_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
        }
        Update: {
          centre_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_config_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      bon_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          boutique_name: string | null
          centre_id: string | null
          created_at: string
          created_by: string
          description: string
          file_url: string | null
          id: string
          status: string
          target_boutique: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          boutique_name?: string | null
          centre_id?: string | null
          created_at?: string
          created_by: string
          description: string
          file_url?: string | null
          id?: string
          status?: string
          target_boutique?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          boutique_name?: string | null
          centre_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          file_url?: string | null
          id?: string
          status?: string
          target_boutique?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bon_plans_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      boutique_contacts: {
        Row: {
          adjoint_email: string | null
          adjoint_nom: string | null
          adjoint_prenom: string | null
          adjoint_tel_fixe: string | null
          adjoint_tel_mobile: string | null
          boutique_group_id: string
          centre_id: string | null
          created_at: string
          id: string
          notes: string | null
          responsable_email: string | null
          responsable_nom: string | null
          responsable_prenom: string | null
          responsable_tel_fixe: string | null
          responsable_tel_mobile: string | null
          updated_at: string
          updated_by: string | null
          updated_via_token: boolean
        }
        Insert: {
          adjoint_email?: string | null
          adjoint_nom?: string | null
          adjoint_prenom?: string | null
          adjoint_tel_fixe?: string | null
          adjoint_tel_mobile?: string | null
          boutique_group_id: string
          centre_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          responsable_email?: string | null
          responsable_nom?: string | null
          responsable_prenom?: string | null
          responsable_tel_fixe?: string | null
          responsable_tel_mobile?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_via_token?: boolean
        }
        Update: {
          adjoint_email?: string | null
          adjoint_nom?: string | null
          adjoint_prenom?: string | null
          adjoint_tel_fixe?: string | null
          adjoint_tel_mobile?: string | null
          boutique_group_id?: string
          centre_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          responsable_email?: string | null
          responsable_nom?: string | null
          responsable_prenom?: string | null
          responsable_tel_fixe?: string | null
          responsable_tel_mobile?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_via_token?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "boutique_contacts_boutique_group_id_fkey"
            columns: ["boutique_group_id"]
            isOneToOne: true
            referencedRelation: "boutique_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boutique_contacts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      boutique_event_types: {
        Row: {
          centre_id: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number | null
          type_key: string
        }
        Insert: {
          centre_id?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number | null
          type_key: string
        }
        Update: {
          centre_id?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number | null
          type_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutique_event_types_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      boutique_events: {
        Row: {
          boutique_group_id: string
          centre_id: string | null
          comment: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          event_label: string
          event_type: string
          id: string
        }
        Insert: {
          boutique_group_id: string
          centre_id?: string | null
          comment?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          event_label: string
          event_type: string
          id?: string
        }
        Update: {
          boutique_group_id?: string
          centre_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          event_label?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutique_events_boutique_group_id_fkey"
            columns: ["boutique_group_id"]
            isOneToOne: false
            referencedRelation: "boutique_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boutique_events_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      boutique_groups: {
        Row: {
          centre_id: string | null
          charges: number | null
          created_at: string
          date_depot_dat: string | null
          date_fermeture: string | null
          date_livraison_coque: string | null
          date_ouverture: string | null
          date_validation_dat: string | null
          id: string
          loyer: number | null
          name: string
          plan_image_url: string | null
          plan_position_x: number | null
          plan_position_y: number | null
          secteur: string | null
          surface: number | null
        }
        Insert: {
          centre_id?: string | null
          charges?: number | null
          created_at?: string
          date_depot_dat?: string | null
          date_fermeture?: string | null
          date_livraison_coque?: string | null
          date_ouverture?: string | null
          date_validation_dat?: string | null
          id?: string
          loyer?: number | null
          name: string
          plan_image_url?: string | null
          plan_position_x?: number | null
          plan_position_y?: number | null
          secteur?: string | null
          surface?: number | null
        }
        Update: {
          centre_id?: string | null
          charges?: number | null
          created_at?: string
          date_depot_dat?: string | null
          date_fermeture?: string | null
          date_livraison_coque?: string | null
          date_ouverture?: string | null
          date_validation_dat?: string | null
          id?: string
          loyer?: number | null
          name?: string
          plan_image_url?: string | null
          plan_position_x?: number | null
          plan_position_y?: number | null
          secteur?: string | null
          surface?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boutique_groups_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      boutique_notes: {
        Row: {
          author_id: string
          author_name: string | null
          boutique_group_id: string
          centre_id: string | null
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          boutique_group_id: string
          centre_id?: string | null
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          boutique_group_id?: string
          centre_id?: string | null
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      boutique_update_tokens: {
        Row: {
          boutique_group_id: string
          centre_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          token: string
        }
        Insert: {
          boutique_group_id: string
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          token?: string
        }
        Update: {
          boutique_group_id?: string
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutique_update_tokens_boutique_group_id_fkey"
            columns: ["boutique_group_id"]
            isOneToOne: true
            referencedRelation: "boutique_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boutique_update_tokens_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_collecte: {
        Row: {
          boutique_name: string | null
          ca_ht: number
          centre_id: string | null
          created_at: string
          id: string
          mois: string
          objectif: number | null
          panier_moyen: number | null
          satisfaction: number | null
          satisfaction_activite: number | null
          satisfaction_frequentation: number | null
          satisfaction_reseau: number | null
          taux_transformation: number | null
          user_id: string
        }
        Insert: {
          boutique_name?: string | null
          ca_ht: number
          centre_id?: string | null
          created_at?: string
          id?: string
          mois: string
          objectif?: number | null
          panier_moyen?: number | null
          satisfaction?: number | null
          satisfaction_activite?: number | null
          satisfaction_frequentation?: number | null
          satisfaction_reseau?: number | null
          taux_transformation?: number | null
          user_id: string
        }
        Update: {
          boutique_name?: string | null
          ca_ht?: number
          centre_id?: string | null
          created_at?: string
          id?: string
          mois?: string
          objectif?: number | null
          panier_moyen?: number | null
          satisfaction?: number | null
          satisfaction_activite?: number | null
          satisfaction_frequentation?: number | null
          satisfaction_reseau?: number | null
          taux_transformation?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_collecte_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_reminder_log: {
        Row: {
          centre_id: string | null
          channel: string
          error_message: string | null
          id: string
          mois: string
          sent_at: string
          step: string
          success: boolean
          user_id: string
        }
        Insert: {
          centre_id?: string | null
          channel: string
          error_message?: string | null
          id?: string
          mois: string
          sent_at?: string
          step: string
          success?: boolean
          user_id: string
        }
        Update: {
          centre_id?: string | null
          channel?: string
          error_message?: string | null
          id?: string
          mois?: string
          sent_at?: string
          step?: string
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_reminder_log_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_reminder_settings: {
        Row: {
          centre_id: string | null
          channels_email_final: string[]
          channels_initial: string[]
          channels_relance_1: string[]
          channels_relance_2: string[]
          created_at: string
          day_of_month: number
          delay_email_final: number
          delay_relance_1: number
          delay_relance_2: number
          email_subject: string
          email_template: string
          id: string
          is_active: boolean
          skip_weekend: boolean
          updated_at: string
        }
        Insert: {
          centre_id?: string | null
          channels_email_final?: string[]
          channels_initial?: string[]
          channels_relance_1?: string[]
          channels_relance_2?: string[]
          created_at?: string
          day_of_month?: number
          delay_email_final?: number
          delay_relance_1?: number
          delay_relance_2?: number
          email_subject?: string
          email_template?: string
          id?: string
          is_active?: boolean
          skip_weekend?: boolean
          updated_at?: string
        }
        Update: {
          centre_id?: string | null
          channels_email_final?: string[]
          channels_initial?: string[]
          channels_relance_1?: string[]
          channels_relance_2?: string[]
          created_at?: string
          day_of_month?: number
          delay_email_final?: number
          delay_relance_1?: number
          delay_relance_2?: number
          email_subject?: string
          email_template?: string
          id?: string
          is_active?: boolean
          skip_weekend?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_reminder_settings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      centres: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      cv_interests: {
        Row: {
          boutique_name: string | null
          created_at: string
          cv_id: string
          id: string
          retained: boolean
          retained_at: string | null
          user_id: string
        }
        Insert: {
          boutique_name?: string | null
          created_at?: string
          cv_id: string
          id?: string
          retained?: boolean
          retained_at?: string | null
          user_id: string
        }
        Update: {
          boutique_name?: string | null
          created_at?: string
          cv_id?: string
          id?: string
          retained?: boolean
          retained_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_interests_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          boutique_name: string | null
          centre_id: string | null
          competences: string[] | null
          complement_request: string | null
          created_at: string
          created_by: string | null
          cv_file_url: string | null
          email: string | null
          experience: string | null
          expires_at: string | null
          id: string
          job_offer_id: string | null
          motivation_file_url: string | null
          nom: string
          poste: string
          prenom: string | null
          rejection_reason: string | null
          secteur: string | null
          status: string
          submission_source: string
          telephone: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status: string
        }
        Insert: {
          boutique_name?: string | null
          centre_id?: string | null
          competences?: string[] | null
          complement_request?: string | null
          created_at?: string
          created_by?: string | null
          cv_file_url?: string | null
          email?: string | null
          experience?: string | null
          expires_at?: string | null
          id?: string
          job_offer_id?: string | null
          motivation_file_url?: string | null
          nom: string
          poste: string
          prenom?: string | null
          rejection_reason?: string | null
          secteur?: string | null
          status?: string
          submission_source?: string
          telephone?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Update: {
          boutique_name?: string | null
          centre_id?: string | null
          competences?: string[] | null
          complement_request?: string | null
          created_at?: string
          created_by?: string | null
          cv_file_url?: string | null
          email?: string | null
          experience?: string | null
          expires_at?: string | null
          id?: string
          job_offer_id?: string | null
          motivation_file_url?: string | null
          nom?: string
          poste?: string
          prenom?: string | null
          rejection_reason?: string | null
          secteur?: string | null
          status?: string
          submission_source?: string
          telephone?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cvs_job_offer_fk"
            columns: ["job_offer_id"]
            isOneToOne: false
            referencedRelation: "job_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      informations: {
        Row: {
          centre_id: string | null
          content: string
          created_at: string
          created_by: string
          file_url: string | null
          id: string
          info_type: string
          priority: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          centre_id?: string | null
          content: string
          created_at?: string
          created_by: string
          file_url?: string | null
          id?: string
          info_type?: string
          priority?: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          centre_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          file_url?: string | null
          id?: string
          info_type?: string
          priority?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "informations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          approved_by: string | null
          boutique_group_id: string | null
          boutique_name: string | null
          centre_id: string | null
          contract_type: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          description: string
          id: string
          published_at: string | null
          rejection_reason: string | null
          status: string
          title: string
          updated_at: string
          work_time: string | null
        }
        Insert: {
          approved_by?: string | null
          boutique_group_id?: string | null
          boutique_name?: string | null
          centre_id?: string | null
          contract_type?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          description: string
          id?: string
          published_at?: string | null
          rejection_reason?: string | null
          status?: string
          title: string
          updated_at?: string
          work_time?: string | null
        }
        Update: {
          approved_by?: string | null
          boutique_group_id?: string | null
          boutique_name?: string | null
          centre_id?: string | null
          contract_type?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          description?: string
          id?: string
          published_at?: string | null
          rejection_reason?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_boutique_group_id_fkey"
            columns: ["boutique_group_id"]
            isOneToOne: false
            referencedRelation: "boutique_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_offers_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_quotes: {
        Row: {
          centre_id: string | null
          created_at: string
          id: string
          text: string
        }
        Insert: {
          centre_id?: string | null
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          centre_id?: string | null
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivational_quotes_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          centre_id: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          id: string
          link_url: string | null
          notif_type: string
          target_boutique_group_id: string | null
          target_centre_id: string | null
          target_scope: string
          target_secteur: string | null
          title: string
        }
        Insert: {
          body: string
          centre_id?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          id?: string
          link_url?: string | null
          notif_type?: string
          target_boutique_group_id?: string | null
          target_centre_id?: string | null
          target_scope: string
          target_secteur?: string | null
          title: string
        }
        Update: {
          body?: string
          centre_id?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          id?: string
          link_url?: string | null
          notif_type?: string
          target_boutique_group_id?: string | null
          target_centre_id?: string | null
          target_scope?: string
          target_secteur?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_boutique_group_id_fkey"
            columns: ["target_boutique_group_id"]
            isOneToOne: false
            referencedRelation: "boutique_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_centre_id_fkey"
            columns: ["target_centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          boutique_group_id: string | null
          boutique_name: string | null
          centre_id: string | null
          created_at: string
          email: string
          id: string
          is_manager: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          boutique_group_id?: string | null
          boutique_name?: string | null
          centre_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_manager?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          boutique_group_id?: string | null
          boutique_name?: string | null
          centre_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_manager?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_boutique_group_id_fkey"
            columns: ["boutique_group_id"]
            isOneToOne: false
            referencedRelation: "boutique_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          centre_id: string | null
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          centre_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          centre_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      signalement_messages: {
        Row: {
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          id: string
          signalement_id: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          signalement_id: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          signalement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signalement_messages_signalement_id_fkey"
            columns: ["signalement_id"]
            isOneToOne: false
            referencedRelation: "signalements"
            referencedColumns: ["id"]
          },
        ]
      }
      signalements: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          boutique_name: string | null
          category: string
          centre_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string | null
          photo_url: string | null
          plan_x: number | null
          plan_y: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          boutique_name?: string | null
          category: string
          centre_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          location?: string | null
          photo_url?: string | null
          plan_x?: number | null
          plan_y?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          boutique_name?: string | null
          category?: string
          centre_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location?: string | null
          photo_url?: string | null
          plan_x?: number | null
          plan_y?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "signalements_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      sondage_questions: {
        Row: {
          id: string
          options: Json | null
          question: string
          question_type: string
          sondage_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          options?: Json | null
          question: string
          question_type?: string
          sondage_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          options?: Json | null
          question?: string
          question_type?: string
          sondage_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sondage_questions_sondage_id_fkey"
            columns: ["sondage_id"]
            isOneToOne: false
            referencedRelation: "sondages"
            referencedColumns: ["id"]
          },
        ]
      }
      sondage_responses: {
        Row: {
          boutique_name: string | null
          comment: string | null
          created_at: string
          id: string
          note: number | null
          satisfaction_emoji: number | null
          sondage_id: string | null
          user_id: string
        }
        Insert: {
          boutique_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          note?: number | null
          satisfaction_emoji?: number | null
          sondage_id?: string | null
          user_id: string
        }
        Update: {
          boutique_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          note?: number | null
          satisfaction_emoji?: number | null
          sondage_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sondage_responses_sondage_id_fkey"
            columns: ["sondage_id"]
            isOneToOne: false
            referencedRelation: "sondages"
            referencedColumns: ["id"]
          },
        ]
      }
      sondages: {
        Row: {
          centre_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          published_at: string | null
          status: string
          title: string
        }
        Insert: {
          centre_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title: string
        }
        Update: {
          centre_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sondages_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          boutique_name: string | null
          centre_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          boutique_name?: string | null
          centre_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          boutique_name?: string | null
          centre_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      support_permissions: {
        Row: {
          can_view_collecte: boolean
          can_view_informations: boolean
          can_view_sondages: boolean
          can_view_stats: boolean
          created_at: string
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_view_collecte?: boolean
          can_view_informations?: boolean
          can_view_sondages?: boolean
          can_view_stats?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_view_collecte?: boolean
          can_view_informations?: boolean
          can_view_sondages?: boolean
          can_view_stats?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upcoming_events: {
        Row: {
          centre_id: string | null
          created_at: string
          event_date: string
          id: string
          title: string
        }
        Insert: {
          centre_id?: string | null
          created_at?: string
          event_date: string
          id?: string
          title: string
        }
        Update: {
          centre_id?: string | null
          created_at?: string
          event_date?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_events_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_centre: {
        Args: { _centre_id: string; _user_id: string }
        Returns: boolean
      }
      get_centre_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      get_contacts_by_token: {
        Args: { _token: string }
        Returns: {
          adjoint_email: string
          adjoint_nom: string
          adjoint_prenom: string
          adjoint_tel_fixe: string
          adjoint_tel_mobile: string
          boutique_group_id: string
          boutique_name: string
          centre_id: string
          notes: string
          numero_local: string
          responsable_email: string
          responsable_nom: string
          responsable_prenom: string
          responsable_tel_fixe: string
          responsable_tel_mobile: string
          site_internet: string
          telephone_boutique: string
        }[]
      }
      get_published_offers_by_centre: {
        Args: { _centre_id: string }
        Returns: {
          boutique_name: string
          contract_type: string
          description: string
          id: string
          published_at: string
          title: string
          work_time: string
        }[]
      }
      get_user_centre_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_centre_or_fonciere: { Args: { _user_id: string }; Returns: boolean }
      is_notif_recipient: {
        Args: { _notif_id: string; _user_id: string }
        Returns: boolean
      }
      is_notif_sender: {
        Args: { _notif_id: string; _user_id: string }
        Returns: boolean
      }
      upsert_contacts_by_token: {
        Args: {
          _adjoint_email: string
          _adjoint_nom: string
          _adjoint_prenom: string
          _adjoint_tel_fixe: string
          _adjoint_tel_mobile: string
          _notes: string
          _numero_local: string
          _responsable_email: string
          _responsable_nom: string
          _responsable_prenom: string
          _responsable_tel_fixe: string
          _responsable_tel_mobile: string
          _site_internet: string
          _telephone_boutique: string
          _token: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "boutique" | "fonciere" | "securite" | "centre" | "proprietaire"
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
      app_role: ["boutique", "fonciere", "securite", "centre", "proprietaire"],
    },
  },
} as const
