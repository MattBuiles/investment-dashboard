export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          currency: string
          ibkr_account_id: string | null
          id: string
          institution: string | null
          interest_rate: number | null
          kind: Database["public"]["Enums"]["account_kind"]
          maturity_date: string | null
          metadata: Json
          name: string
          principal: number | null
          start_date: string | null
          term_months: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          ibkr_account_id?: string | null
          id?: string
          institution?: string | null
          interest_rate?: number | null
          kind: Database["public"]["Enums"]["account_kind"]
          maturity_date?: string | null
          metadata?: Json
          name: string
          principal?: number | null
          start_date?: string | null
          term_months?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          ibkr_account_id?: string | null
          id?: string
          institution?: string | null
          interest_rate?: number | null
          kind?: Database["public"]["Enums"]["account_kind"]
          maturity_date?: string | null
          metadata?: Json
          name?: string
          principal?: number | null
          start_date?: string | null
          term_months?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          account_id: string
          asset_class: string | null
          avg_cost: number
          currency: string
          ibkr_contract_id: string | null
          id: string
          last_price: number | null
          last_price_at: string | null
          quantity: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          asset_class?: string | null
          avg_cost: number
          currency?: string
          ibkr_contract_id?: string | null
          id?: string
          last_price?: number | null
          last_price_at?: string | null
          quantity: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          asset_class?: string | null
          avg_cost?: number
          currency?: string
          ibkr_contract_id?: string | null
          id?: string
          last_price?: number | null
          last_price_at?: string | null
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ibkr_credentials: {
        Row: {
          connected_at: string
          live_session_token: string | null
          live_session_token_expires_at: string | null
          oauth_token: string
          oauth_token_secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          live_session_token?: string | null
          live_session_token_expires_at?: string | null
          oauth_token: string
          oauth_token_secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          live_session_token?: string | null
          live_session_token_expires_at?: string | null
          oauth_token?: string
          oauth_token_secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_currency: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          account_id: string | null
          created_at: string
          currency: string
          id: string
          taken_on: string
          total_value: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          taken_on: string
          total_value: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          taken_on?: string
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          ibkr_execution_id: string | null
          id: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          notes: string | null
          occurred_at: string
          price: number | null
          quantity: number | null
          symbol: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: string
          ibkr_execution_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          notes?: string | null
          occurred_at?: string
          price?: number | null
          quantity?: number | null
          symbol?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          ibkr_execution_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["transaction_kind"]
          notes?: string | null
          occurred_at?: string
          price?: number | null
          quantity?: number | null
          symbol?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ibkr_connection_status: {
        Row: {
          connected_at: string | null
          session_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          session_active?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          session_active?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: { [_ in never]: never }
    Enums: {
      account_kind: "cdt" | "brokerage" | "custom"
      transaction_kind:
        | "buy"
        | "sell"
        | "deposit"
        | "withdraw"
        | "interest"
        | "dividend"
        | "fee"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
