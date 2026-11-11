
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_cache": {
                  Row: {
                    "created_at": string,"job_id": string | null,"key": string,"kind": string,"payload": NonNullable<Json>,"profile_version": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"job_id"?: string | null,"key": string,"kind": string,"payload": NonNullable<Json>,"profile_version"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"job_id"?: string | null,"key"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"profile_version"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_cache_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"application_events": {
                  Row: {
                    "actor_id": string | null,"application_id": string,"created_at": string,"id": number,"note": string | null,"status": Database["public"]['Enums']["application_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"application_id": string,"created_at"?: string,"id"?: never,"note"?: string | null,"status": Database["public"]['Enums']["application_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"application_id"?: string,"created_at"?: string,"id"?: never,"note"?: string | null,"status"?: Database["public"]['Enums']["application_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "application_events_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "candidate_id": string,"cover_note": string | null,"created_at": string,"id": string,"job_id": string,"resume_path": string | null,"status": Database["public"]['Enums']["application_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id"?: string,"cover_note"?: string | null,"created_at"?: string,"id"?: string,"job_id": string,"resume_path"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"cover_note"?: string | null,"created_at"?: string,"id"?: string,"job_id"?: string,"resume_path"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "about": string,"hq": string,"id": string,"industry": string,"name": string,"size": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "about": string,"hq": string,"id"?: string,"industry": string,"name": string,"size": string,"slug": string
                  }
                  Update: {
                    "about"?: string,"hq"?: string,"id"?: string,"industry"?: string,"name"?: string,"size"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_contacts": {
                  Row: {
                    "background": string,"company_id": string,"email": string,"full_name": string,"id": string,"kind": string,"slug": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "background"?: string,"company_id": string,"email": string,"full_name": string,"id"?: string,"kind": string,"slug": string,"title": string
                  }
                  Update: {
                    "background"?: string,"company_id"?: string,"email"?: string,"full_name"?: string,"id"?: string,"kind"?: string,"slug"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_contacts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "closes_at": string | null,"company_id": string,"currency": string,"first_posted_at": string | null,"id": string,"is_vague": boolean | null,"job_type": Database["public"]['Enums']["job_type"],"level": Database["public"]['Enums']["job_level"],"location": string,"posted_at": string,"repost_count": number,"requirements": (string)[],"responsibilities": (string)[],"salary_max": number | null,"salary_max_inr": number | null,"salary_min": number | null,"search": unknown,"skills": (string)[],"slug": string,"summary": string,"title": string,"work_mode": Database["public"]['Enums']["work_mode"]
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at"?: string | null,"company_id": string,"currency"?: string,"first_posted_at"?: string | null,"id"?: string,"is_vague"?: never,"job_type": Database["public"]['Enums']["job_type"],"level": Database["public"]['Enums']["job_level"],"location": string,"posted_at"?: string,"repost_count"?: number,"requirements"?: (string)[],"responsibilities"?: (string)[],"salary_max"?: number | null,"salary_max_inr"?: never,"salary_min"?: number | null,"search"?: unknown,"skills"?: (string)[],"slug": string,"summary": string,"title": string,"work_mode": Database["public"]['Enums']["work_mode"]
                  }
                  Update: {
                    "closes_at"?: string | null,"company_id"?: string,"currency"?: string,"first_posted_at"?: string | null,"id"?: string,"is_vague"?: never,"job_type"?: Database["public"]['Enums']["job_type"],"level"?: Database["public"]['Enums']["job_level"],"location"?: string,"posted_at"?: string,"repost_count"?: number,"requirements"?: (string)[],"responsibilities"?: (string)[],"salary_max"?: number | null,"salary_max_inr"?: never,"salary_min"?: number | null,"search"?: unknown,"skills"?: (string)[],"slug"?: string,"summary"?: string,"title"?: string,"work_mode"?: Database["public"]['Enums']["work_mode"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"education": NonNullable<Json>,"experience": NonNullable<Json>,"full_name": string,"headline": string | null,"id": string,"location": string | null,"phone": string | null,"profile_version": number,"resume_path": string | null,"role": Database["public"]['Enums']["app_role"],"skills": (string)[],"summary": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"education"?: NonNullable<Json>,"experience"?: NonNullable<Json>,"full_name"?: string,"headline"?: string | null,"id": string,"location"?: string | null,"phone"?: string | null,"profile_version"?: number,"resume_path"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"skills"?: (string)[],"summary"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"education"?: NonNullable<Json>,"experience"?: NonNullable<Json>,"full_name"?: string,"headline"?: string | null,"id"?: string,"location"?: string | null,"phone"?: string | null,"profile_version"?: number,"resume_path"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"skills"?: (string)[],"summary"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saved_jobs": {
                  Row: {
                    "candidate_id": string,"created_at": string,"job_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id"?: string,"created_at"?: string,"job_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"job_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_jobs_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_jobs_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_searches": {
                  Row: {
                    "candidate_id": string,"created_at": string,"id": string,"name": string,"query": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id"?: string,"created_at"?: string,"id"?: string,"name": string,"query": NonNullable<Json>
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"query"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_searches_candidate_id_fkey"
      columns: ["candidate_id"]
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
            "admin_set_application_status":
{ Args: { "p_application_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["application_status"] }; Returns: {
              "candidate_id": string,
"cover_note": string | null,
"created_at": string,
"id": string,
"job_id": string,
"resume_path": string | null,
"status": Database["public"]['Enums']["application_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "applications"
        isOneToOne: true
        isSetofReturn: false
      } },
"application_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["application_status"],"p_to": Database["public"]['Enums']["application_status"] }; Returns: boolean
                           },
"company_response":
{ Args: { "p_slug": string }; Returns: {
              "applications": number,"median_hours": number,"replied": number
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"jobs_tsquery":
{ Args: { "p_q": string }; Returns: unknown
                           },
"search_jobs":
{ Args: { "p_levels"?: (Database["public"]['Enums']["job_level"])[],"p_limit"?: number,"p_location"?: string,"p_modes"?: (Database["public"]['Enums']["work_mode"])[],"p_offset"?: number,"p_q"?: string,"p_sort"?: string,"p_types"?: (Database["public"]['Enums']["job_type"])[] }; Returns: {
              "job_id": string,"total": number
            }[]
                           },
"undo_application":
{ Args: { "p_application_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "candidate"|"admin","application_status": "applied"|"under_review"|"shortlisted"|"interview"|"offered"|"rejected","job_level": "intern"|"junior"|"mid"|"senior"|"lead","job_type": "full_time"|"part_time"|"contract"|"internship","work_mode": "onsite"|"hybrid"|"remote"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["candidate", "admin"],"application_status": ["applied", "under_review", "shortlisted", "interview", "offered", "rejected"],"job_level": ["intern", "junior", "mid", "senior", "lead"],"job_type": ["full_time", "part_time", "contract", "internship"],"work_mode": ["onsite", "hybrid", "remote"]
          }
        }
} as const
