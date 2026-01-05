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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "fastest_finger_games"
            referencedColumns: ["id"]
          },
        ]
      }
      fastest_finger_games: {
        Row: {
          countdown: number
          created_at: string
          created_by: string | null
          end_time: string | null
          entry_fee: number
          id: string
          max_duration: number
          participant_count: number
          pool_value: number
          start_time: string | null
          status: string
        }
        Insert: {
          countdown?: number
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          entry_fee?: number
          id?: string
          max_duration?: number
          participant_count?: number
          pool_value?: number
          start_time?: string | null
          status?: string
        }
        Update: {
          countdown?: number
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          entry_fee?: number
          id?: string
          max_duration?: number
          participant_count?: number
          pool_value?: number
          start_time?: string | null
          status?: string
        }
        Relationships: []
      }
      fastest_finger_participants: {
        Row: {
          game_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fastest_finger_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "fastest_finger_games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          games_played: number
          id: string
          rank_points: number
          total_wins: number
          updated_at: string
          username: string
          wallet_balance: number
          weekly_rank: number | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          games_played?: number
          id: string
          rank_points?: number
          total_wins?: number
          updated_at?: string
          username: string
          wallet_balance?: number
          weekly_rank?: number | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          games_played?: number
          id?: string
          rank_points?: number
          total_wins?: number
          updated_at?: string
          username?: string
          wallet_balance?: number
          weekly_rank?: number | null
        }
        Relationships: []
      }
      rank_history: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "fastest_finger_games"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      voice_room_participants: {
        Row: {
          game_id: string
          id: string
          is_muted: boolean | null
          is_speaking: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_room_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "fastest_finger_games"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          game_id: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "fastest_finger_games"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          amount_won: number
          created_at: string
          game_id: string
          id: string
          position: number
          user_id: string
        }
        Insert: {
          amount_won: number
          created_at?: string
          game_id: string
          id?: string
          position: number
          user_id: string
        }
        Update: {
          amount_won?: number
          created_at?: string
          game_id?: string
          id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "fastest_finger_games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar: string | null
          created_at: string | null
          games_played: number | null
          id: string | null
          rank_points: number | null
          total_wins: number | null
          username: string | null
          weekly_rank: number | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          games_played?: number | null
          id?: string | null
          rank_points?: number | null
          total_wins?: number | null
          username?: string | null
          weekly_rank?: number | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          games_played?: number | null
          id?: string | null
          rank_points?: number | null
          total_wins?: number | null
          username?: string | null
          weekly_rank?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar: string
          games_played: number
          id: string
          rank_points: number
          total_wins: number
          username: string
          weekly_rank: number
        }[]
      }
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar: string
          created_at: string
          games_played: number
          id: string
          rank_points: number
          total_wins: number
          username: string
          weekly_rank: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_game_atomic: {
        Args: { p_game_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
