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
      access_logs: {
        Row: {
          action: string
          created_at: string
          gated_content_id: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          gated_content_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          gated_content_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_gated_content_id_fkey"
            columns: ["gated_content_id"]
            isOneToOne: false
            referencedRelation: "gated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_build_jobs: {
        Row: {
          completed_at: string | null
          context: Json | null
          created_at: string
          current_step: string | null
          error: string | null
          id: string
          model: string
          progress: number
          project_id: string | null
          prompt: string
          result: Json | null
          sections: Json | null
          skeleton: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string
          current_step?: string | null
          error?: string | null
          id?: string
          model: string
          progress?: number
          project_id?: string | null
          prompt: string
          result?: Json | null
          sections?: Json | null
          skeleton?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string
          current_step?: string | null
          error?: string | null
          id?: string
          model?: string
          progress?: number
          project_id?: string | null
          prompt?: string
          result?: Json | null
          sections?: Json | null
          skeleton?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_build_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          active_integrations: Json | null
          context_id: string
          created_at: string
          id: string
          page_context: string
          preview_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_integrations?: Json | null
          context_id: string
          created_at?: string
          id?: string
          page_context: string
          preview_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_integrations?: Json | null
          context_id?: string
          created_at?: string
          id?: string
          page_context?: string
          preview_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_initial_prompt: boolean | null
          model: string | null
          role: string
          snapshot_data: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_initial_prompt?: boolean | null
          model?: string | null
          role: string
          snapshot_data?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_initial_prompt?: boolean | null
          model?: string | null
          role?: string
          snapshot_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_wall_sessions: {
        Row: {
          created_at: string
          id: string
          model: string
          preset_id: string | null
          prompt: string
          selected_variant_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          preset_id?: string | null
          prompt: string
          selected_variant_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          preset_id?: string | null
          prompt?: string
          selected_variant_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_wall_variants: {
        Row: {
          components: Json
          created_at: string
          description: string | null
          id: string
          layout_type: string
          name: string
          session_id: string
          sort_order: number
        }
        Insert: {
          components?: Json
          created_at?: string
          description?: string | null
          id?: string
          layout_type?: string
          name: string
          session_id: string
          sort_order?: number
        }
        Update: {
          components?: Json
          created_at?: string
          description?: string | null
          id?: string
          layout_type?: string
          name?: string
          session_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_wall_variants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_wall_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          database_id: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          request_body: Json | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number
          table_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          database_id?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          request_body?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code: number
          table_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          database_id?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          request_body?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number
          table_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "database_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "table_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_analytics: {
        Row: {
          country: string | null
          created_at: string
          id: string
          ip_address: unknown
          page_path: string
          published_app_id: string
          referrer: string | null
          session_duration: number | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          page_path?: string
          published_app_id: string
          referrer?: string | null
          session_duration?: number | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          page_path?: string
          published_app_id?: string
          referrer?: string | null
          session_duration?: number | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      app_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "app_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_comments: {
        Row: {
          app_project_id: string
          content: string
          created_at: string | null
          element_id: string | null
          id: string
          is_resolved: boolean | null
          page_id: string
          parent_id: string | null
          position_x: number | null
          position_y: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_project_id: string
          content: string
          created_at?: string | null
          element_id?: string | null
          id?: string
          is_resolved?: boolean | null
          page_id: string
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_project_id?: string
          content?: string
          created_at?: string | null
          element_id?: string | null
          id?: string
          is_resolved?: boolean | null
          page_id?: string
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_comments_app_project_id_fkey"
            columns: ["app_project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "app_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_components: {
        Row: {
          app_project_id: string
          component_data: Json
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_project_id: string
          component_data?: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_project_id?: string
          component_data?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_components_app_project_id_fkey"
            columns: ["app_project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_projects: {
        Row: {
          created_at: string
          description: string | null
          global_styles: Json | null
          id: string
          name: string
          pages: Json
          settings: Json | null
          style_classes: Json | null
          updated_at: string
          user_components: Json | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          global_styles?: Json | null
          id?: string
          name: string
          pages?: Json
          settings?: Json | null
          style_classes?: Json | null
          updated_at?: string
          user_components?: Json | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          global_styles?: Json | null
          id?: string
          name?: string
          pages?: Json
          settings?: Json | null
          style_classes?: Json | null
          updated_at?: string
          user_components?: Json | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_variables: {
        Row: {
          app_project_id: string
          cache_duration: number | null
          computation_logic: string | null
          computed_value: Json | null
          created_at: string
          data_source: Json | null
          data_type: string | null
          description: string | null
          id: string
          initial_value: Json | null
          is_active: boolean
          last_computed_at: string | null
          name: string
          preserve_on_navigation: boolean | null
          query_config: Json | null
          scope: string | null
          updated_at: string
          user_id: string
          variable_type: string
        }
        Insert: {
          app_project_id: string
          cache_duration?: number | null
          computation_logic?: string | null
          computed_value?: Json | null
          created_at?: string
          data_source?: Json | null
          data_type?: string | null
          description?: string | null
          id?: string
          initial_value?: Json | null
          is_active?: boolean
          last_computed_at?: string | null
          name: string
          preserve_on_navigation?: boolean | null
          query_config?: Json | null
          scope?: string | null
          updated_at?: string
          user_id: string
          variable_type?: string
        }
        Update: {
          app_project_id?: string
          cache_duration?: number | null
          computation_logic?: string | null
          computed_value?: Json | null
          created_at?: string
          data_source?: Json | null
          data_type?: string | null
          description?: string | null
          id?: string
          initial_value?: Json | null
          is_active?: boolean
          last_computed_at?: string | null
          name?: string
          preserve_on_navigation?: boolean | null
          query_config?: Json | null
          scope?: string | null
          updated_at?: string
          user_id?: string
          variable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_variables_app_project_id_fkey"
            columns: ["app_project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          code: string
          created_at: string | null
          features: Json
          id: string
          interval: string
          is_active: boolean | null
          is_enterprise: boolean | null
          max_api_calls_monthly: number | null
          max_apps: number | null
          max_databases: number | null
          max_flows: number | null
          max_records_per_db: number | null
          name: string
          price: number
          seat_limit: number | null
          storage_limit_gb: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          features?: Json
          id?: string
          interval: string
          is_active?: boolean | null
          is_enterprise?: boolean | null
          max_api_calls_monthly?: number | null
          max_apps?: number | null
          max_databases?: number | null
          max_flows?: number | null
          max_records_per_db?: number | null
          name: string
          price?: number
          seat_limit?: number | null
          storage_limit_gb?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean | null
          is_enterprise?: boolean | null
          max_api_calls_monthly?: number | null
          max_apps?: number | null
          max_databases?: number | null
          max_flows?: number | null
          max_records_per_db?: number | null
          name?: string
          price?: number
          seat_limit?: number | null
          storage_limit_gb?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      button_presets: {
        Row: {
          app_project_id: string
          created_at: string
          id: string
          name: string
          states: Json
          styles: Json
          updated_at: string
          user_id: string
          variant: string
        }
        Insert: {
          app_project_id: string
          created_at?: string
          id?: string
          name: string
          states?: Json
          styles?: Json
          updated_at?: string
          user_id: string
          variant: string
        }
        Update: {
          app_project_id?: string
          created_at?: string
          id?: string
          name?: string
          states?: Json
          styles?: Json
          updated_at?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      community_plugin_installations: {
        Row: {
          config: Json | null
          id: string
          installed_at: string
          installed_by: string | null
          is_active: boolean | null
          plugin_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json | null
          id?: string
          installed_at?: string
          installed_by?: string | null
          is_active?: boolean | null
          plugin_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json | null
          id?: string
          installed_at?: string
          installed_by?: string | null
          is_active?: boolean | null
          plugin_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_plugin_installations_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "community_plugins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_plugin_installations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      community_plugins: {
        Row: {
          author_email: string | null
          author_name: string | null
          category: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          install_count: number | null
          is_active: boolean | null
          is_featured: boolean | null
          metadata: Json | null
          name: string
          rating: number | null
          updated_at: string
          version: string | null
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          install_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          metadata?: Json | null
          name: string
          rating?: number | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          install_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          metadata?: Json | null
          name?: string
          rating?: number | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          created_at: string
          dns_verified: boolean
          domain: string
          id: string
          published_app_id: string
          ssl_status: string
          updated_at: string
          verification_status: string
          verification_token: string
        }
        Insert: {
          created_at?: string
          dns_verified?: boolean
          domain: string
          id?: string
          published_app_id: string
          ssl_status?: string
          updated_at?: string
          verification_status?: string
          verification_token?: string
        }
        Update: {
          created_at?: string
          dns_verified?: boolean
          domain?: string
          id?: string
          published_app_id?: string
          ssl_status?: string
          updated_at?: string
          verification_status?: string
          verification_token?: string
        }
        Relationships: []
      }
      data_connections: {
        Row: {
          config: Json
          connection_type: string
          created_at: string
          id: string
          last_synced_at: string | null
          name: string
          status: string
          table_project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          connection_type?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          name: string
          status?: string
          table_project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          connection_type?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          status?: string
          table_project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_connections_table_project_id_fkey"
            columns: ["table_project_id"]
            isOneToOne: false
            referencedRelation: "table_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      database_api_keys: {
        Row: {
          created_at: string
          database_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_day: number
          rate_limit_per_minute: number
          scopes: Database["public"]["Enums"]["api_key_scope"][]
          total_requests: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          database_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
          scopes?: Database["public"]["Enums"]["api_key_scope"][]
          total_requests?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          database_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
          scopes?: Database["public"]["Enums"]["api_key_scope"][]
          total_requests?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_api_keys_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      database_webhooks: {
        Row: {
          created_at: string
          database_id: string | null
          events: string[]
          failed_deliveries: number
          headers: Json | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret: string | null
          table_id: string | null
          total_deliveries: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          database_id?: string | null
          events?: string[]
          failed_deliveries?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          table_id?: string | null
          total_deliveries?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          database_id?: string | null
          events?: string[]
          failed_deliveries?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          table_id?: string | null
          total_deliveries?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_webhooks_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_webhooks_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "table_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      databases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "databases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      design_system_templates: {
        Row: {
          button_presets: Json
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_color: string
          sort_order: number | null
          tokens: Json
        }
        Insert: {
          button_presets?: Json
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_color: string
          sort_order?: number | null
          tokens?: Json
        }
        Update: {
          button_presets?: Json
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_color?: string
          sort_order?: number | null
          tokens?: Json
        }
        Relationships: []
      }
      design_tokens: {
        Row: {
          app_project_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          app_project_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          app_project_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      document_attachments: {
        Row: {
          database_id: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          database_id: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          database_id?: string
          document_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string | null
          created_by: string
          database_id: string
          icon: string | null
          id: string
          name: string
          parent_folder_id: string | null
          position: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          database_id: string
          icon?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          position?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          database_id?: string
          icon?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          position?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_revisions: {
        Row: {
          change_summary: string | null
          content: Json
          created_at: string | null
          created_by: string
          document_id: string
          id: string
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          created_at?: string | null
          created_by: string
          document_id: string
          id?: string
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string
          document_id?: string
          id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_revisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          content: Json
          cover_image: string | null
          created_at: string | null
          created_by: string
          database_id: string
          folder_id: string | null
          footer_content: string | null
          header_content: string | null
          icon: string | null
          id: string
          last_edited_by: string | null
          logo: string | null
          page_size: string | null
          position: number | null
          show_page_breaks: boolean | null
          title: string
          updated_at: string | null
          width_mode: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          content?: Json
          cover_image?: string | null
          created_at?: string | null
          created_by: string
          database_id: string
          folder_id?: string | null
          footer_content?: string | null
          header_content?: string | null
          icon?: string | null
          id?: string
          last_edited_by?: string | null
          logo?: string | null
          page_size?: string | null
          position?: number | null
          show_page_breaks?: boolean | null
          title?: string
          updated_at?: string | null
          width_mode?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          content?: Json
          cover_image?: string | null
          created_at?: string | null
          created_by?: string
          database_id?: string
          folder_id?: string | null
          footer_content?: string | null
          header_content?: string | null
          icon?: string | null
          id?: string
          last_edited_by?: string | null
          logo?: string | null
          page_size?: string | null
          position?: number | null
          show_page_breaks?: boolean | null
          title?: string
          updated_at?: string | null
          width_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_files: {
        Row: {
          created_at: string | null
          database_id: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string | null
          name: string
          shared_with: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          database_id: string
          file_path: string
          file_size: number
          file_type: string
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          shared_with?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          database_id?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          shared_with?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_files_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "drive_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folders: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          database_id: string
          icon: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          database_id: string
          icon?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          database_id?: string
          icon?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_folders_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "drive_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_configurations: {
        Row: {
          configuration: Json
          created_at: string
          embed_code: string | null
          embed_type: string
          id: string
          is_active: boolean
          table_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          embed_code?: string | null
          embed_type: string
          id?: string
          is_active?: boolean
          table_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          embed_code?: string | null
          embed_type?: string
          id?: string
          is_active?: boolean
          table_project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embed_configurations_table_project_id_fkey"
            columns: ["table_project_id"]
            isOneToOne: false
            referencedRelation: "table_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_audit_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          last4: string
          scopes: string[]
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          last4: string
          scopes?: string[]
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          last4?: string
          scopes?: string[]
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_services: {
        Row: {
          contract_duration_months: number | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean | null
          monthly_price: number | null
          price: number | null
          service_type: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contract_duration_months?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          monthly_price?: number | null
          price?: number | null
          service_type?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contract_duration_months?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          monthly_price?: number | null
          price?: number | null
          service_type?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      enterprise_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          updated_at: string
          upload_status: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          upload_status?: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          upload_status?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: []
      }
      environment_variables: {
        Row: {
          created_at: string
          environment_id: string
          id: string
          integration_type: string | null
          is_secret: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          environment_id: string
          id?: string
          integration_type?: string | null
          is_secret?: boolean
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          environment_id?: string
          id?: string
          integration_type?: string | null
          is_secret?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "environment_variables_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "flow_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_data: {
        Row: {
          created_at: string
          created_by: string | null
          edges: Json
          flow_project_id: string
          id: string
          is_published: boolean
          nodes: Json
          updated_at: string
          version: number
          version_description: string | null
          version_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edges?: Json
          flow_project_id: string
          id?: string
          is_published?: boolean
          nodes?: Json
          updated_at?: string
          version?: number
          version_description?: string | null
          version_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edges?: Json
          flow_project_id?: string
          id?: string
          is_published?: boolean
          nodes?: Json
          updated_at?: string
          version?: number
          version_description?: string | null
          version_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_data_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_endpoint_analytics: {
        Row: {
          called_at: string
          country: string | null
          created_at: string
          endpoint_id: string | null
          error_message: string | null
          flow_project_id: string | null
          id: string
          ip_address: unknown
          method: string
          request_params: Json | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number
          status_code: number
          user_agent: string | null
        }
        Insert: {
          called_at?: string
          country?: string | null
          created_at?: string
          endpoint_id?: string | null
          error_message?: string | null
          flow_project_id?: string | null
          id?: string
          ip_address?: unknown
          method: string
          request_params?: Json | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms: number
          status_code: number
          user_agent?: string | null
        }
        Update: {
          called_at?: string
          country?: string | null
          created_at?: string
          endpoint_id?: string | null
          error_message?: string | null
          flow_project_id?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          request_params?: Json | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_endpoint_analytics_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "flow_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_endpoint_analytics_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_endpoints: {
        Row: {
          auth_type: string | null
          avg_response_time_ms: number | null
          cache_enabled: boolean | null
          cache_ttl_seconds: number | null
          cors_enabled: boolean | null
          cors_origins: string[] | null
          created_at: string | null
          description: string | null
          endpoint_type: string
          error_calls: number | null
          flow_project_id: string | null
          http_method: string | null
          id: string
          is_active: boolean | null
          last_called_at: string | null
          name: string | null
          parameters: Json | null
          path_suffix: string | null
          rate_limit_per_minute: number | null
          required_headers: Json | null
          response_schema: Json | null
          retry_config: Json | null
          success_calls: number | null
          timeout_seconds: number | null
          total_calls: number | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          auth_type?: string | null
          avg_response_time_ms?: number | null
          cache_enabled?: boolean | null
          cache_ttl_seconds?: number | null
          cors_enabled?: boolean | null
          cors_origins?: string[] | null
          created_at?: string | null
          description?: string | null
          endpoint_type: string
          error_calls?: number | null
          flow_project_id?: string | null
          http_method?: string | null
          id?: string
          is_active?: boolean | null
          last_called_at?: string | null
          name?: string | null
          parameters?: Json | null
          path_suffix?: string | null
          rate_limit_per_minute?: number | null
          required_headers?: Json | null
          response_schema?: Json | null
          retry_config?: Json | null
          success_calls?: number | null
          timeout_seconds?: number | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          auth_type?: string | null
          avg_response_time_ms?: number | null
          cache_enabled?: boolean | null
          cache_ttl_seconds?: number | null
          cors_enabled?: boolean | null
          cors_origins?: string[] | null
          created_at?: string | null
          description?: string | null
          endpoint_type?: string
          error_calls?: number | null
          flow_project_id?: string | null
          http_method?: string | null
          id?: string
          is_active?: boolean | null
          last_called_at?: string | null
          name?: string | null
          parameters?: Json | null
          path_suffix?: string | null
          rate_limit_per_minute?: number | null
          required_headers?: Json | null
          response_schema?: Json | null
          retry_config?: Json | null
          success_calls?: number | null
          timeout_seconds?: number | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_endpoints_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_environments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      flow_executions: {
        Row: {
          completed_at: string | null
          created_by: string | null
          error_message: string | null
          execution_time_ms: number | null
          flow_data_id: string
          id: string
          logs: Json | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          flow_data_id: string
          id?: string
          logs?: Json | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          flow_data_id?: string
          id?: string
          logs?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_flow_data_id_fkey"
            columns: ["flow_data_id"]
            isOneToOne: false
            referencedRelation: "flow_data"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_monitoring_alerts: {
        Row: {
          condition: string
          created_at: string
          description: string | null
          flow_id: string
          id: string
          last_triggered_at: string | null
          name: string
          status: string
          threshold: number
          updated_at: string
        }
        Insert: {
          condition: string
          created_at?: string
          description?: string | null
          flow_id: string
          id?: string
          last_triggered_at?: string | null
          name: string
          status?: string
          threshold: number
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          description?: string | null
          flow_id?: string
          id?: string
          last_triggered_at?: string | null
          name?: string
          status?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_monitoring_alerts_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_monitoring_logs: {
        Row: {
          created_at: string
          execution_id: string | null
          flow_id: string
          id: string
          level: string
          message: string
          metadata: Json | null
          node_id: string | null
        }
        Insert: {
          created_at?: string
          execution_id?: string | null
          flow_id: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          node_id?: string | null
        }
        Update: {
          created_at?: string
          execution_id?: string | null
          flow_id?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_monitoring_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_monitoring_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_monitoring_metrics: {
        Row: {
          cpu_usage_percent: number | null
          created_at: string
          edge_count: number
          error_count: number | null
          execution_id: string
          execution_time_ms: number
          flow_id: string
          id: string
          memory_usage_mb: number | null
          node_count: number
          status: string
        }
        Insert: {
          cpu_usage_percent?: number | null
          created_at?: string
          edge_count: number
          error_count?: number | null
          execution_id: string
          execution_time_ms: number
          flow_id: string
          id?: string
          memory_usage_mb?: number | null
          node_count: number
          status: string
        }
        Update: {
          cpu_usage_percent?: number | null
          created_at?: string
          edge_count?: number
          error_count?: number | null
          execution_id?: string
          execution_time_ms?: number
          flow_id?: string
          id?: string
          memory_usage_mb?: number | null
          node_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_monitoring_metrics_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_monitoring_metrics_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_node_configurations: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          flow_project_id: string
          id: string
          is_enabled: boolean
          node_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          flow_project_id: string
          id?: string
          is_enabled?: boolean
          node_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          flow_project_id?: string
          id?: string
          is_enabled?: boolean
          node_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_node_configurations_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_projects: {
        Row: {
          allowed_methods: string[] | null
          api_description: string | null
          api_headers: Json | null
          api_parameters: Json | null
          chat_widget_config: Json | null
          created_at: string
          deployed_version: number | null
          deployment_status: string | null
          description: string | null
          endpoint_slug: string | null
          external_webhook_secret: string | null
          id: string
          is_deployed: boolean | null
          last_deployed_at: string | null
          mcp_enabled: boolean | null
          mcp_tool_description: string | null
          mcp_tool_name: string | null
          name: string
          primary_endpoint_type: string | null
          rate_limit_enabled: boolean | null
          rate_limit_requests: number | null
          rate_limit_window_seconds: number | null
          signature_algorithm: string | null
          signature_header_name: string | null
          signature_provider: string | null
          signature_timestamp_tolerance: number | null
          updated_at: string
          user_id: string
          webhook_secret: string | null
          workspace_id: string | null
        }
        Insert: {
          allowed_methods?: string[] | null
          api_description?: string | null
          api_headers?: Json | null
          api_parameters?: Json | null
          chat_widget_config?: Json | null
          created_at?: string
          deployed_version?: number | null
          deployment_status?: string | null
          description?: string | null
          endpoint_slug?: string | null
          external_webhook_secret?: string | null
          id?: string
          is_deployed?: boolean | null
          last_deployed_at?: string | null
          mcp_enabled?: boolean | null
          mcp_tool_description?: string | null
          mcp_tool_name?: string | null
          name: string
          primary_endpoint_type?: string | null
          rate_limit_enabled?: boolean | null
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          signature_algorithm?: string | null
          signature_header_name?: string | null
          signature_provider?: string | null
          signature_timestamp_tolerance?: number | null
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
          workspace_id?: string | null
        }
        Update: {
          allowed_methods?: string[] | null
          api_description?: string | null
          api_headers?: Json | null
          api_parameters?: Json | null
          chat_widget_config?: Json | null
          created_at?: string
          deployed_version?: number | null
          deployment_status?: string | null
          description?: string | null
          endpoint_slug?: string | null
          external_webhook_secret?: string | null
          id?: string
          is_deployed?: boolean | null
          last_deployed_at?: string | null
          mcp_enabled?: boolean | null
          mcp_tool_description?: string | null
          mcp_tool_name?: string | null
          name?: string
          primary_endpoint_type?: string | null
          rate_limit_enabled?: boolean | null
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          signature_algorithm?: string | null
          signature_header_name?: string | null
          signature_provider?: string | null
          signature_timestamp_tolerance?: number | null
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_secrets: {
        Row: {
          created_at: string | null
          description: string | null
          flow_project_id: string
          id: string
          name: string
          updated_at: string | null
          user_id: string
          vault_secret_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flow_project_id: string
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          vault_secret_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flow_project_id?: string
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          vault_secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_secrets_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_variables: {
        Row: {
          created_at: string
          description: string | null
          flow_project_id: string
          id: string
          is_secret: boolean
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_project_id: string
          id?: string
          is_secret?: boolean
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_project_id?: string
          id?: string
          is_secret?: boolean
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_variables_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          agent_id: string | null
          allowed_domains: string[] | null
          created_at: string | null
          flow_project_id: string
          id: string
          org_id: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          allowed_domains?: string[] | null
          created_at?: string | null
          flow_project_id: string
          id?: string
          org_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          allowed_domains?: string[] | null
          created_at?: string | null
          flow_project_id?: string
          id?: string
          org_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: true
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gated_content: {
        Row: {
          access_rules: Json
          content_url: string
          created_at: string
          data_ms_conditions: Json
          id: string
          is_active: boolean
          page_title: string | null
          required_plans: Json
          table_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_rules?: Json
          content_url: string
          created_at?: string
          data_ms_conditions?: Json
          id?: string
          is_active?: boolean
          page_title?: string | null
          required_plans?: Json
          table_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_rules?: Json
          content_url?: string
          created_at?: string
          data_ms_conditions?: Json
          id?: string
          is_active?: boolean
          page_title?: string | null
          required_plans?: Json
          table_project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gated_content_table_project_id_fkey"
            columns: ["table_project_id"]
            isOneToOne: false
            referencedRelation: "table_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          flow_builder_instructions: Json | null
          icon: string | null
          id: string
          installation_config: Json | null
          integration_id: string
          is_completed: boolean
          is_enabled: boolean
          is_integrated: boolean | null
          LongDescription: string | null
          name: string
          node_type: string | null
          priority: number
          provider: string
          requires_installation: boolean
          updated_at: string
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          flow_builder_instructions?: Json | null
          icon?: string | null
          id?: string
          installation_config?: Json | null
          integration_id: string
          is_completed?: boolean
          is_enabled?: boolean
          is_integrated?: boolean | null
          LongDescription?: string | null
          name: string
          node_type?: string | null
          priority?: number
          provider: string
          requires_installation?: boolean
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          flow_builder_instructions?: Json | null
          icon?: string | null
          id?: string
          installation_config?: Json | null
          integration_id?: string
          is_completed?: boolean
          is_enabled?: boolean
          is_integrated?: boolean | null
          LongDescription?: string | null
          name?: string
          node_type?: string | null
          priority?: number
          provider?: string
          requires_installation?: boolean
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      mcp_api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      node_implementation_status: {
        Row: {
          created_at: string
          id: string
          implemented_at: string | null
          implemented_by: string | null
          is_implemented: boolean
          node_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          implemented_at?: string | null
          implemented_by?: string | null
          is_implemented?: boolean
          node_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          implemented_at?: string | null
          implemented_by?: string | null
          is_implemented?: boolean
          node_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_variables: {
        Row: {
          app_project_id: string
          created_at: string
          data_type: string
          description: string | null
          id: string
          initial_value: Json | null
          is_active: boolean | null
          is_persisted: boolean | null
          name: string
          page_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_project_id: string
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          initial_value?: Json | null
          is_active?: boolean | null
          is_persisted?: boolean | null
          name: string
          page_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_project_id?: string
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          initial_value?: Json | null
          is_active?: boolean | null
          is_persisted?: boolean | null
          name?: string
          page_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_variables_app_project_id_fkey"
            columns: ["app_project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      published_apps: {
        Row: {
          access_type: string
          api_key_prefix: string | null
          app_project_id: string
          created_at: string
          custom_domain: string | null
          data_connections: Json | null
          favicon_url: string | null
          id: string
          last_accessed_at: string | null
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          password_hash: string | null
          read_only_api_key_id: string | null
          slug: string
          status: string
          unique_visitors: number
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          access_type?: string
          api_key_prefix?: string | null
          app_project_id: string
          created_at?: string
          custom_domain?: string | null
          data_connections?: Json | null
          favicon_url?: string | null
          id?: string
          last_accessed_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          password_hash?: string | null
          read_only_api_key_id?: string | null
          slug: string
          status?: string
          unique_visitors?: number
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          access_type?: string
          api_key_prefix?: string | null
          app_project_id?: string
          created_at?: string
          custom_domain?: string | null
          data_connections?: Json | null
          favicon_url?: string | null
          id?: string
          last_accessed_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          password_hash?: string | null
          read_only_api_key_id?: string | null
          slug?: string
          status?: string
          unique_visitors?: number
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "published_apps_app_project_id_fkey"
            columns: ["app_project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_apps_read_only_api_key_id_fkey"
            columns: ["read_only_api_key_id"]
            isOneToOne: false
            referencedRelation: "database_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      search_documents: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_public: boolean
          metadata: Json | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      style_classes: {
        Row: {
          app_project_id: string
          applied_to: Json
          created_at: string
          id: string
          name: string
          styles: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          app_project_id: string
          applied_to?: Json
          created_at?: string
          id?: string
          name: string
          styles?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          app_project_id?: string
          applied_to?: Json
          created_at?: string
          id?: string
          name?: string
          styles?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          access_level: string
          billing_period: string
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_records_per_table: number | null
          max_tables: number | null
          name: string
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_records_per_table?: number | null
          max_tables?: number | null
          name: string
          price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_records_per_table?: number | null
          max_tables?: number | null
          name?: string
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      table_projects: {
        Row: {
          analytics_config: Json | null
          created_at: string
          database_id: string | null
          description: string | null
          form_config: Json | null
          gated_content_enabled: boolean | null
          id: string
          name: string
          password_hash: string | null
          records: Json | null
          schema: Json | null
          subscription_enabled: boolean | null
          updated_at: string
          user_id: string
          view_settings: Json
          workspace_id: string | null
        }
        Insert: {
          analytics_config?: Json | null
          created_at?: string
          database_id?: string | null
          description?: string | null
          form_config?: Json | null
          gated_content_enabled?: boolean | null
          id?: string
          name: string
          password_hash?: string | null
          records?: Json | null
          schema?: Json | null
          subscription_enabled?: boolean | null
          updated_at?: string
          user_id: string
          view_settings?: Json
          workspace_id?: string | null
        }
        Update: {
          analytics_config?: Json | null
          created_at?: string
          database_id?: string | null
          description?: string | null
          form_config?: Json | null
          gated_content_enabled?: boolean | null
          id?: string
          name?: string
          password_hash?: string | null
          records?: Json | null
          schema?: Json | null
          subscription_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          view_settings?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_projects_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_github_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          created_at: string
          github_user_id: number | null
          github_username: string | null
          id: string
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          created_at?: string
          github_user_id?: number | null
          github_username?: string | null
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          created_at?: string
          github_user_id?: number | null
          github_username?: string | null
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          api_key: string | null
          auth_token: string | null
          configuration: Json
          created_at: string
          id: string
          integration_id: string
          is_enabled: boolean
          oauth_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          auth_token?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          integration_id: string
          is_enabled?: boolean
          oauth_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          auth_token?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          integration_id?: string
          is_enabled?: boolean
          oauth_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_searches: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          results_count: number | null
          search_query: string
          search_type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          results_count?: number | null
          search_query: string
          search_type?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          results_count?: number | null
          search_query?: string
          search_type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_searches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          current_workspace_id: string | null
          id: string
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_workspace_id?: string | null
          id: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_workspace_id?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_supabase_connections: {
        Row: {
          created_at: string
          id: string
          project_name: string
          supabase_anon_key: string
          supabase_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_name: string
          supabase_anon_key: string
          supabase_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_name?: string
          supabase_anon_key?: string
          supabase_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variable_computations: {
        Row: {
          computation_time_ms: number | null
          created_at: string
          error_message: string | null
          id: string
          result_value: Json | null
          status: string
          variable_id: string
        }
        Insert: {
          computation_time_ms?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          result_value?: Json | null
          status: string
          variable_id: string
        }
        Update: {
          computation_time_ms?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          result_value?: Json | null
          status?: string
          variable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_computations_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "app_variables"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "database_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_test_payloads: {
        Row: {
          body: Json | null
          captured_at: string | null
          created_at: string | null
          expires_at: string | null
          flow_project_id: string | null
          headers: Json | null
          id: string
          is_sample: boolean | null
          method: string
          node_id: string
          provider_detected: string | null
          query: Json | null
          source_ip: string | null
          user_id: string
        }
        Insert: {
          body?: Json | null
          captured_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          flow_project_id?: string | null
          headers?: Json | null
          id?: string
          is_sample?: boolean | null
          method?: string
          node_id: string
          provider_detected?: string | null
          query?: Json | null
          source_ip?: string | null
          user_id: string
        }
        Update: {
          body?: Json | null
          captured_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          flow_project_id?: string | null
          headers?: Json | null
          id?: string
          is_sample?: boolean | null
          method?: string
          node_id?: string
          provider_detected?: string | null
          query?: Json | null
          source_ip?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_test_payloads_flow_project_id_fkey"
            columns: ["flow_project_id"]
            isOneToOne: false
            referencedRelation: "flow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_customization: {
        Row: {
          created_at: string
          enabled_plugins: Json | null
          id: string
          logo_url: string | null
          navigation_bg_color: string | null
          navigation_text_color: string | null
          theme_color: string | null
          theme_font: string | null
          topbar_bg_color: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled_plugins?: Json | null
          id?: string
          logo_url?: string | null
          navigation_bg_color?: string | null
          navigation_text_color?: string | null
          theme_color?: string | null
          theme_font?: string | null
          topbar_bg_color?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled_plugins?: Json | null
          id?: string
          logo_url?: string | null
          navigation_bg_color?: string | null
          navigation_text_color?: string | null
          theme_color?: string | null
          theme_font?: string | null
          topbar_bg_color?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          status: string
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string | null
          updated_at: string | null
          user_group: Database["public"]["Enums"]["user_group_type"] | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_group?: Database["public"]["Enums"]["user_group_type"] | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_group?: Database["public"]["Enums"]["user_group_type"] | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_plans: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          external_subscription_id: string | null
          id: string
          plan_id: string | null
          seats: number
          status: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id?: string | null
          seats?: number
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id?: string | null
          seats?: number
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_services: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          service_id: string
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          service_id: string
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          service_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_default: boolean
          is_enterprise: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_default?: boolean
          is_enterprise?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_default?: boolean
          is_enterprise?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      create_flow_secret: {
        Args: {
          p_description?: string
          p_flow_project_id: string
          p_name: string
          p_value: string
        }
        Returns: string
      }
      delete_flow_secret: { Args: { p_secret_id: string }; Returns: boolean }
      generate_api_key: {
        Args: {
          p_database_id?: string
          p_expires_at?: string
          p_name?: string
          p_rate_limit_per_day?: number
          p_rate_limit_per_minute?: number
          p_scopes?: Database["public"]["Enums"]["api_key_scope"][]
          p_user_id: string
        }
        Returns: Json
      }
      generate_endpoint_slug: { Args: { flow_name: string }; Returns: string }
      generate_enterprise_key: {
        Args: { key_scopes?: string[]; target_workspace_id: string }
        Returns: Json
      }
      generate_webhook_secret: { Args: never; Returns: string }
      get_all_flow_secrets: {
        Args: { p_flow_project_id: string }
        Returns: Json
      }
      get_current_workspace_id: { Args: { user_uuid: string }; Returns: string }
      get_flow_secret: {
        Args: { p_flow_project_id: string; p_name: string }
        Returns: string
      }
      get_user_app_count: { Args: { user_uuid: string }; Returns: number }
      get_user_database_count: { Args: { user_uuid: string }; Returns: number }
      get_user_flow_count: { Args: { user_uuid: string }; Returns: number }
      get_user_storage_usage: { Args: { user_uuid: string }; Returns: number }
      get_user_total_projects: { Args: { user_uuid: string }; Returns: number }
      get_user_workspace_role: {
        Args: { target_workspace_id: string }
        Returns: string
      }
      get_workspace_project_count: {
        Args: { workspace_uuid: string }
        Returns: number
      }
      get_workspace_storage_usage: {
        Args: { workspace_uuid: string }
        Returns: number
      }
      is_enterprise_admin: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_enterprise_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      make_workspace_enterprise: {
        Args: { target_workspace_id: string }
        Returns: Json
      }
      migrate_resources_to_default_workspace: {
        Args: never
        Returns: undefined
      }
      revoke_enterprise_key: { Args: { key_id: string }; Returns: Json }
      update_flow_secret: {
        Args: { p_flow_project_id: string; p_name: string; p_new_value: string }
        Returns: boolean
      }
      validate_api_key: {
        Args: { p_key: string }
        Returns: {
          database_id: string
          is_valid: boolean
          key_id: string
          rate_limit_per_day: number
          rate_limit_per_minute: number
          scopes: Database["public"]["Enums"]["api_key_scope"][]
          user_id: string
        }[]
      }
      validate_mcp_key: {
        Args: { p_key: string }
        Returns: {
          is_valid: boolean
          user_id: string
          workspace_id: string
        }[]
      }
    }
    Enums: {
      api_key_scope: "read" | "write" | "delete" | "schema" | "admin"
      user_group_type: "standard" | "enterprise"
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
      api_key_scope: ["read", "write", "delete", "schema", "admin"],
      user_group_type: ["standard", "enterprise"],
    },
  },
} as const
