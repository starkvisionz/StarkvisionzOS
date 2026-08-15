// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Canonical regeneration (requires Docker):
//   supabase gen types typescript --linked --schema public \
//     > packages/shared/src/database.types.ts
//
// Docker-free equivalent (used to produce this file):
//   python db/gen_types.py "$DATABASE_URL" > packages/shared/src/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          snapshot_id: string
          wbs_id: string | null
          activity_id: string
          name: string
          orig_dur_days: number | null
          rem_dur_days: number | null
          early_start: string | null
          early_finish: string | null
          late_start: string | null
          late_finish: string | null
          actual_start: string | null
          actual_finish: string | null
          total_float_days: number | null
          is_critical: boolean | null
          pct_complete: number | null
          calendar_id: string | null
        }
        Insert: {
          id?: string
          snapshot_id: string
          wbs_id?: string | null
          activity_id: string
          name: string
          orig_dur_days?: number | null
          rem_dur_days?: number | null
          early_start?: string | null
          early_finish?: string | null
          late_start?: string | null
          late_finish?: string | null
          actual_start?: string | null
          actual_finish?: string | null
          total_float_days?: number | null
          pct_complete?: number | null
          calendar_id?: string | null
        }
        Update: {
          id?: string
          snapshot_id?: string
          wbs_id?: string | null
          activity_id?: string
          name?: string
          orig_dur_days?: number | null
          rem_dur_days?: number | null
          early_start?: string | null
          early_finish?: string | null
          late_start?: string | null
          late_finish?: string | null
          actual_start?: string | null
          actual_finish?: string | null
          total_float_days?: number | null
          pct_complete?: number | null
          calendar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "schedule_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_accounts: {
        Row: {
          id: string
          project_id: string
          wbs_id: string | null
          code: string
          description: string | null
          budget: number
        }
        Insert: {
          id?: string
          project_id: string
          wbs_id?: string | null
          code: string
          description?: string | null
          budget?: number
        }
        Update: {
          id?: string
          project_id?: string
          wbs_id?: string | null
          code?: string
          description?: string | null
          budget?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_accounts_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      dcma_results: {
        Row: {
          id: string
          snapshot_id: string
          metric: string
          value: number | null
          threshold: number | null
          pass: boolean | null
          detail: Json | null
        }
        Insert: {
          id?: string
          snapshot_id: string
          metric: string
          value?: number | null
          threshold?: number | null
          pass?: boolean | null
          detail?: Json | null
        }
        Update: {
          id?: string
          snapshot_id?: string
          metric?: string
          value?: number | null
          threshold?: number | null
          pass?: boolean | null
          detail?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dcma_results_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "schedule_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      evm_results: {
        Row: {
          id: string
          project_id: string
          wbs_id: string | null
          period_end: string
          bcws: number | null
          bcwp: number | null
          acwp: number | null
          cpi: number | null
          spi: number | null
          eac: number | null
          etc: number | null
          vac: number | null
          tcpi: number | null
          computed_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          wbs_id?: string | null
          period_end: string
          bcws?: number | null
          bcwp?: number | null
          acwp?: number | null
          cpi?: number | null
          spi?: number | null
          eac?: number | null
          etc?: number | null
          vac?: number | null
          tcpi?: number | null
          computed_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          wbs_id?: string | null
          period_end?: string
          bcws?: number | null
          bcwp?: number | null
          acwp?: number | null
          cpi?: number | null
          spi?: number | null
          eac?: number | null
          etc?: number | null
          vac?: number | null
          tcpi?: number | null
          computed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evm_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evm_results_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      pcos: {
        Row: {
          id: string
          project_id: string
          pco_number: string
          title: string
          status: string | null
          rom_value: number | null
          approved_value: number | null
          schedule_impact_days: number | null
          submitted_date: string | null
          resolved_date: string | null
          narrative: string | null
        }
        Insert: {
          id?: string
          project_id: string
          pco_number: string
          title: string
          status?: string | null
          rom_value?: number | null
          approved_value?: number | null
          schedule_impact_days?: number | null
          submitted_date?: string | null
          resolved_date?: string | null
          narrative?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          pco_number?: string
          title?: string
          status?: string | null
          rom_value?: number | null
          approved_value?: number | null
          schedule_impact_days?: number | null
          submitted_date?: string | null
          resolved_date?: string | null
          narrative?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pcos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      period_actuals: {
        Row: {
          id: string
          cost_account_id: string
          period_end: string
          acwp: number
          earned_pct: number | null
        }
        Insert: {
          id?: string
          cost_account_id: string
          period_end: string
          acwp?: number
          earned_pct?: number | null
        }
        Update: {
          id?: string
          cost_account_id?: string
          period_end?: string
          acwp?: number
          earned_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "period_actuals_cost_account_id_fkey"
            columns: ["cost_account_id"]
            isOneToOne: false
            referencedRelation: "cost_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          org_id: string
          code: string
          name: string
          currency: string | null
          timezone: string | null
          data_date: string | null
          budget_at_completion: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          code: string
          name: string
          currency?: string | null
          timezone?: string | null
          data_date?: string | null
          budget_at_completion?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          code?: string
          name?: string
          currency?: string | null
          timezone?: string | null
          data_date?: string | null
          budget_at_completion?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          id: string
          snapshot_id: string
          pred_activity_id: string
          succ_activity_id: string
          link_type: string | null
          lag_days: number | null
        }
        Insert: {
          id?: string
          snapshot_id: string
          pred_activity_id: string
          succ_activity_id: string
          link_type?: string | null
          lag_days?: number | null
        }
        Update: {
          id?: string
          snapshot_id?: string
          pred_activity_id?: string
          succ_activity_id?: string
          link_type?: string | null
          lag_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relationships_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "schedule_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_snapshots: {
        Row: {
          id: string
          project_id: string
          data_date: string
          source_file_r2_key: string
          is_baseline: boolean | null
          imported_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          data_date: string
          source_file_r2_key: string
          is_baseline?: boolean | null
          imported_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          data_date?: string
          source_file_r2_key?: string
          is_baseline?: boolean | null
          imported_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_nodes: {
        Row: {
          id: string
          project_id: string
          parent_id: string | null
          code: string
          name: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_id?: string | null
          code: string
          name: string
        }
        Update: {
          id?: string
          project_id?: string
          parent_id?: string | null
          code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbs_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "wbs_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
