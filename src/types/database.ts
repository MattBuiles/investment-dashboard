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
      broker_connections: {
        Row: {
          account_id: string | null
          broker_kind: Database["public"]["Enums"]["broker_kind"]
          created_at: string
          flex_query_id: string | null
          id: string
          label: string
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          vault_secret_id: string
        }
        Insert: {
          account_id?: string | null
          broker_kind: Database["public"]["Enums"]["broker_kind"]
          created_at?: string
          flex_query_id?: string | null
          id?: string
          label: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          vault_secret_id: string
        }
        Update: {
          account_id?: string | null
          broker_kind?: Database["public"]["Enums"]["broker_kind"]
          created_at?: string
          flex_query_id?: string | null
          id?: string
          label?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          vault_secret_id?: string
        }
        Relationships: []
      }
      broker_secret_access_log: {
        Row: {
          action: Database["public"]["Enums"]["broker_secret_action"]
          connection_id: string | null
          created_at: string
          id: string
          source: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["broker_secret_action"]
          connection_id?: string | null
          created_at?: string
          id?: string
          source?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["broker_secret_action"]
          connection_id?: string | null
          created_at?: string
          id?: string
          source?: string | null
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      delete_broker_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      get_broker_secret: { Args: { p_connection_id: string }; Returns: string }
      mark_broker_sync: {
        Args: { p_connection_id: string; p_error: string; p_status: string }
        Returns: undefined
      }
      save_broker_connection: {
        Args: {
          p_broker_kind: Database["public"]["Enums"]["broker_kind"]
          p_flex_query_id: string
          p_label: string
          p_secret_text: string
          p_token_expires_at?: string
        }
        Returns: string
      }
      update_broker_connection_secret: {
        Args: {
          p_connection_id: string
          p_flex_query_id: string
          p_secret_text: string
          p_token_expires_at?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_kind: "cdt" | "brokerage" | "custom"
      broker_kind: "ibkr_flex"
      broker_secret_action: "create" | "read" | "update" | "delete"
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
