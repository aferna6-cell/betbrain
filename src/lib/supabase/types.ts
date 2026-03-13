export type Sport = 'nba' | 'nfl' | 'mlb' | 'nhl'
export type SubscriptionTier = 'free' | 'pro'
export type RiskLevel = 'low' | 'medium' | 'high'
export type PickType = 'moneyline' | 'spread' | 'over' | 'under' | 'prop'
export type PickOutcome = 'win' | 'loss' | 'push' | 'pending'
export type ApiName = 'odds' | 'balldontlie' | 'claude'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          subscription_tier: SubscriptionTier
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          analyses_today: number
          analyses_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          subscription_tier?: SubscriptionTier
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          analyses_today?: number
          analyses_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          subscription_tier?: SubscriptionTier
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          analyses_today?: number
          analyses_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_cache: {
        Row: {
          id: string
          external_game_id: string
          sport: Sport
          home_team: string
          away_team: string
          game_date: string
          data: Record<string, unknown>
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_game_id: string
          sport: Sport
          home_team: string
          away_team: string
          game_date: string
          data?: Record<string, unknown>
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_game_id?: string
          sport?: Sport
          home_team?: string
          away_team?: string
          game_date?: string
          data?: Record<string, unknown>
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      odds_cache: {
        Row: {
          id: string
          external_game_id: string
          sport: Sport
          bookmaker: string
          market: string
          home_odds: number | null
          away_odds: number | null
          draw_odds: number | null
          spread_home: number | null
          spread_away: number | null
          total_over: number | null
          total_under: number | null
          total_line: number | null
          spread_line: number | null
          data: Record<string, unknown>
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_game_id: string
          sport: Sport
          bookmaker: string
          market?: string
          home_odds?: number | null
          away_odds?: number | null
          draw_odds?: number | null
          spread_home?: number | null
          spread_away?: number | null
          total_over?: number | null
          total_under?: number | null
          total_line?: number | null
          spread_line?: number | null
          data?: Record<string, unknown>
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_game_id?: string
          sport?: Sport
          bookmaker?: string
          market?: string
          home_odds?: number | null
          away_odds?: number | null
          draw_odds?: number | null
          spread_home?: number | null
          spread_away?: number | null
          total_over?: number | null
          total_under?: number | null
          total_line?: number | null
          spread_line?: number | null
          data?: Record<string, unknown>
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          id: string
          external_game_id: string
          sport: Sport
          summary: string
          key_factors: unknown[]
          value_assessment: Record<string, unknown>
          risk_level: RiskLevel
          confidence: number
          raw_analysis: Record<string, unknown>
          model: string
          disclaimer: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_game_id: string
          sport: Sport
          summary: string
          key_factors?: unknown[]
          value_assessment?: Record<string, unknown>
          risk_level: RiskLevel
          confidence: number
          raw_analysis?: Record<string, unknown>
          model?: string
          disclaimer?: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_game_id?: string
          sport?: Sport
          summary?: string
          key_factors?: unknown[]
          value_assessment?: Record<string, unknown>
          risk_level?: RiskLevel
          confidence?: number
          raw_analysis?: Record<string, unknown>
          model?: string
          disclaimer?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_analyses: {
        Row: {
          id: string
          user_id: string
          insight_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          insight_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          insight_id?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_analyses_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "ai_insights"
            referencedColumns: ["id"]
          }
        ]
      }
      user_picks: {
        Row: {
          id: string
          user_id: string
          external_game_id: string
          sport: Sport
          pick_type: PickType
          pick_team: string | null
          pick_line: number | null
          odds: number
          units: number
          outcome: PickOutcome | null
          profit: number | null
          notes: string | null
          game_date: string
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          external_game_id: string
          sport: Sport
          pick_type: PickType
          pick_team?: string | null
          pick_line?: number | null
          odds: number
          units?: number
          outcome?: PickOutcome | null
          profit?: number | null
          notes?: string | null
          game_date: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          external_game_id?: string
          sport?: Sport
          pick_type?: PickType
          pick_team?: string | null
          pick_line?: number | null
          odds?: number
          units?: number
          outcome?: PickOutcome | null
          profit?: number | null
          notes?: string | null
          game_date?: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      api_usage: {
        Row: {
          id: string
          user_id: string | null
          api_name: ApiName
          call_count: number
          month: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          api_name: ApiName
          call_count?: number
          month: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          api_name?: ApiName
          call_count?: number
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_api_usage: {
        Args: {
          p_user_id: string | null
          p_api_name: string
          p_month: string
        }
        Returns: undefined
      }
      reset_daily_analyses: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
