export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Legacy generated database types retained for app table typing.
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          expense_date: string
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_credits: {
        Row: {
          created_at: string
          credits_limit: number | null
          credits_used: number | null
          id: string
          reset_date: string
          reset_month: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_limit?: number | null
          credits_used?: number | null
          id?: string
          reset_date?: string
          reset_month?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_limit?: number | null
          credits_used?: number | null
          id?: string
          reset_date?: string
          reset_month?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenge_matches: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          is_contacted: boolean | null
          match_reason: string | null
          paper_id: string
          relevance_score: number
          researcher_id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          is_contacted?: boolean | null
          match_reason?: string | null
          paper_id: string
          relevance_score: number
          researcher_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          is_contacted?: boolean | null
          match_reason?: string | null
          paper_id?: string
          relevance_score?: number
          researcher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_matches_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_matches_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          proposal: string
          researcher_id: string
          status: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          proposal: string
          researcher_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          proposal?: string
          researcher_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          deadline: string | null
          description: string
          id: string
          industry_id: string
          is_active: boolean | null
          reward_amount: number | null
          reward_currency: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          industry_id: string
          is_active?: boolean | null
          reward_amount?: number | null
          reward_currency?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          industry_id?: string
          is_active?: boolean | null
          reward_amount?: number | null
          reward_currency?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapter_review_comments: {
        Row: {
          author_role: string
          comment: string
          created_at: string
          id: string
          research_id: string
          review_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_role: string
          comment: string
          created_at?: string
          id?: string
          research_id: string
          review_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_role?: string
          comment?: string
          created_at?: string
          id?: string
          research_id?: string
          review_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_review_comments_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "research_chapter_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_messages: {
        Row: {
          collaboration_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          collaboration_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          collaboration_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_messages_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "researcher_collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_earnings: {
        Row: {
          amount: number
          beneficiary_id: string
          beneficiary_type: string
          commission_rate: number
          created_at: string | null
          currency: string | null
          id: string
          status: string | null
          student_id: string
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          beneficiary_id: string
          beneficiary_type: string
          commission_rate: number
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          student_id: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          beneficiary_type?: string
          commission_rate?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          student_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_earnings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_percentage: number
          id: string
          institution_id: string | null
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          plan_id: string | null
          updated_at: string
          user_type: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_percentage: number
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          plan_id?: string | null
          updated_at?: string
          user_type?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          plan_id?: string | null
          updated_at?: string
          user_type?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          activation_month: string
          coupon_id: string
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          subscription_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          activation_month?: string
          coupon_id: string
          discount_amount: number
          final_amount: number
          id?: string
          original_amount: number
          subscription_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          activation_month?: string
          coupon_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          subscription_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_topup_packages: {
        Row: {
          amount_ngn: number
          created_at: string | null
          credits: number
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          amount_ngn?: number
          created_at?: string | null
          credits: number
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_ngn?: number
          created_at?: string | null
          credits?: number
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_topup_purchases: {
        Row: {
          amount: number
          created_at: string | null
          credits: number
          currency: string | null
          id: string
          package_id: string | null
          reference: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          credits: number
          currency?: string | null
          id?: string
          package_id?: string | null
          reference?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credits?: number
          currency?: string | null
          id?: string
          package_id?: string | null
          reference?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_topup_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "credit_topup_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          onboarding_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          onboarding_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          onboarding_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      documentaries: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          researcher_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          video_url: string
          views_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          researcher_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          video_url: string
          views_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          researcher_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          video_url?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentaries_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documentaries_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      documentary_comments: {
        Row: {
          content: string
          created_at: string
          documentary_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          documentary_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          documentary_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentary_comments_documentary_id_fkey"
            columns: ["documentary_id"]
            isOneToOne: false
            referencedRelation: "documentaries"
            referencedColumns: ["id"]
          },
        ]
      }
      external_supervisor_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          department: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          institution_name: string | null
          invite_code: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email: string
          expires_at?: string
          full_name: string
          id?: string
          institution_name?: string | null
          invite_code: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          institution_name?: string | null
          invite_code?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq: {
        Row: {
          answer: string
          category: string
          created_at: string
          display_location: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          display_location?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          display_location?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      hired_students: {
        Row: {
          application_id: string
          created_at: string | null
          end_date: string | null
          id: string
          industry_id: string
          job_id: string
          start_date: string | null
          status: string | null
          student_id: string
          total_payment: number | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          industry_id: string
          job_id: string
          start_date?: string | null
          status?: string | null
          student_id: string
          total_payment?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          industry_id?: string
          job_id?: string
          start_date?: string | null
          status?: string | null
          student_id?: string
          total_payment?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hired_students_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hired_students_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_job_payments: {
        Row: {
          amount_ngn: number
          applicant_id: string
          application_id: string | null
          created_at: string
          id: string
          industry_share_ngn: number
          job_id: string
          paystack_reference: string | null
          platform_share_ngn: number
          status: string
        }
        Insert: {
          amount_ngn?: number
          applicant_id: string
          application_id?: string | null
          created_at?: string
          id?: string
          industry_share_ngn?: number
          job_id: string
          paystack_reference?: string | null
          platform_share_ngn?: number
          status?: string
        }
        Update: {
          amount_ngn?: number
          applicant_id?: string
          application_id?: string | null
          created_at?: string
          id?: string
          industry_share_ngn?: number
          job_id?: string
          paystack_reference?: string | null
          platform_share_ngn?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_job_payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_job_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_wallet: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          total_funded: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_funded?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_funded?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      institution_commissions: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string
          currency: string
          id: string
          institution_id: string
          researcher_id: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          institution_id: string
          researcher_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string
          researcher_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_commissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_verification_codes: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          used_at: string | null
          verification_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          used_at?: string | null
          verification_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          used_at?: string | null
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_verification_codes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_withdrawals: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string
          currency: string
          id: string
          institution_id: string
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string
          currency?: string
          id?: string
          institution_id: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_withdrawals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          admin_user_id: string | null
          ai_content_threshold: string | null
          available_balance: number | null
          created_at: string
          description: string | null
          download_credit_cost: number
          id: string
          is_verified: boolean | null
          logo_url: string | null
          name: string
          onboarding_type: string | null
          plagiarism_threshold: number | null
          total_commission: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_user_id?: string | null
          ai_content_threshold?: string | null
          available_balance?: number | null
          created_at?: string
          description?: string | null
          download_credit_cost?: number
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          onboarding_type?: string | null
          plagiarism_threshold?: number | null
          total_commission?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_user_id?: string | null
          ai_content_threshold?: string | null
          available_balance?: number | null
          created_at?: string
          description?: string | null
          download_credit_cost?: number
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          onboarding_type?: string | null
          plagiarism_threshold?: number | null
          total_commission?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      invite_messages: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_messages_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "researcher_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      ipn_activations: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          id_document_url: string | null
          payment_amount: number | null
          payment_reference: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          id_document_url?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          id_document_url?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ipn_applications: {
        Row: {
          applicant_email: string | null
          applicant_id: string
          applicant_name: string | null
          cover_letter: string | null
          created_at: string
          cv_url: string | null
          employer_feedback: string | null
          id: string
          opportunity_id: string
          payment_reference: string | null
          profile_snapshot: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_email?: string | null
          applicant_id: string
          applicant_name?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          employer_feedback?: string | null
          id?: string
          opportunity_id: string
          payment_reference?: string | null
          profile_snapshot?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_email?: string | null
          applicant_id?: string
          applicant_name?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          employer_feedback?: string | null
          id?: string
          opportunity_id?: string
          payment_reference?: string | null
          profile_snapshot?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ipn_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "ipn_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      ipn_companies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          ipn_user_id: string
          is_active: boolean
          location: string | null
          logo_url: string | null
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          ipn_user_id: string
          is_active?: boolean
          location?: string | null
          logo_url?: string | null
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          ipn_user_id?: string
          is_active?: boolean
          location?: string | null
          logo_url?: string | null
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ipn_opportunities: {
        Row: {
          application_fee_ngn: number
          company_id: string
          created_at: string
          deadline: string | null
          description: string
          duration: string | null
          id: string
          ipn_user_id: string
          is_paid: boolean
          is_published: boolean
          job_type: string
          location: string | null
          requirements: string[] | null
          requires_cv: boolean
          responsibilities: string[] | null
          slots_available: number | null
          slots_filled: number | null
          title: string
          updated_at: string
          work_mode: string | null
        }
        Insert: {
          application_fee_ngn?: number
          company_id: string
          created_at?: string
          deadline?: string | null
          description?: string
          duration?: string | null
          id?: string
          ipn_user_id: string
          is_paid?: boolean
          is_published?: boolean
          job_type?: string
          location?: string | null
          requirements?: string[] | null
          requires_cv?: boolean
          responsibilities?: string[] | null
          slots_available?: number | null
          slots_filled?: number | null
          title: string
          updated_at?: string
          work_mode?: string | null
        }
        Update: {
          application_fee_ngn?: number
          company_id?: string
          created_at?: string
          deadline?: string | null
          description?: string
          duration?: string | null
          id?: string
          ipn_user_id?: string
          is_paid?: boolean
          is_published?: boolean
          job_type?: string
          location?: string | null
          requirements?: string[] | null
          requires_cv?: boolean
          responsibilities?: string[] | null
          slots_available?: number | null
          slots_filled?: number | null
          title?: string
          updated_at?: string
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipn_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ipn_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ipn_payments: {
        Row: {
          amount_ngn: number
          applicant_id: string
          application_id: string | null
          created_at: string
          id: string
          ipn_share_ngn: number
          opportunity_id: string
          paystack_reference: string | null
          platform_share_ngn: number
          status: string
        }
        Insert: {
          amount_ngn?: number
          applicant_id: string
          application_id?: string | null
          created_at?: string
          id?: string
          ipn_share_ngn?: number
          opportunity_id: string
          paystack_reference?: string | null
          platform_share_ngn?: number
          status?: string
        }
        Update: {
          amount_ngn?: number
          applicant_id?: string
          application_id?: string | null
          created_at?: string
          id?: string
          ipn_share_ngn?: number
          opportunity_id?: string
          paystack_reference?: string | null
          platform_share_ngn?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ipn_payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "ipn_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipn_payments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "ipn_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      ipn_payout_requests: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ipn_profiles: {
        Row: {
          bio: string | null
          company_name: string
          created_at: string
          id: string
          location: string | null
          logo_url: string | null
          means_of_identification: string | null
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
          what_do_you_do: string | null
        }
        Insert: {
          bio?: string | null
          company_name?: string
          created_at?: string
          id?: string
          location?: string | null
          logo_url?: string | null
          means_of_identification?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          what_do_you_do?: string | null
        }
        Update: {
          bio?: string | null
          company_name?: string
          created_at?: string
          id?: string
          location?: string | null
          logo_url?: string | null
          means_of_identification?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          what_do_you_do?: string | null
        }
        Relationships: []
      }
      ipn_wallet: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          approved_at: string | null
          cover_letter: string | null
          created_at: string | null
          cv_url: string | null
          employer_feedback: string | null
          hired_at: string | null
          id: string
          job_id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_avatar_url: string | null
          student_id: string
          student_institution_id: string | null
          student_institution_name: string | null
          student_level: string | null
          student_name: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          cover_letter?: string | null
          created_at?: string | null
          cv_url?: string | null
          employer_feedback?: string | null
          hired_at?: string | null
          id?: string
          job_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_avatar_url?: string | null
          student_id: string
          student_institution_id?: string | null
          student_institution_name?: string | null
          student_level?: string | null
          student_name?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          cover_letter?: string | null
          created_at?: string | null
          cv_url?: string | null
          employer_feedback?: string | null
          hired_at?: string | null
          id?: string
          job_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_avatar_url?: string | null
          student_id?: string
          student_institution_id?: string | null
          student_institution_name?: string | null
          student_level?: string | null
          student_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_feedback_messages: {
        Row: {
          application_id: string
          application_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          application_id: string
          application_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_role?: string
        }
        Update: {
          application_id?: string
          application_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          application_fee_ngn: number
          company_city: string | null
          company_location: string | null
          company_name: string | null
          company_region: string | null
          created_at: string | null
          deadline: string | null
          department: string | null
          description: string
          duration: string | null
          id: string
          industry_id: string
          institution_id: string | null
          is_active: boolean | null
          is_paid: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          payment_amount: number | null
          payment_currency: string | null
          required_level: string[] | null
          requirements: string[] | null
          requires_cv: boolean
          responsibilities: string[] | null
          slots_available: number | null
          slots_filled: number | null
          title: string
          updated_at: string | null
          work_mode: string | null
        }
        Insert: {
          application_fee_ngn?: number
          company_city?: string | null
          company_location?: string | null
          company_name?: string | null
          company_region?: string | null
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          description: string
          duration?: string | null
          id?: string
          industry_id: string
          institution_id?: string | null
          is_active?: boolean | null
          is_paid?: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          payment_amount?: number | null
          payment_currency?: string | null
          required_level?: string[] | null
          requirements?: string[] | null
          requires_cv?: boolean
          responsibilities?: string[] | null
          slots_available?: number | null
          slots_filled?: number | null
          title: string
          updated_at?: string | null
          work_mode?: string | null
        }
        Update: {
          application_fee_ngn?: number
          company_city?: string | null
          company_location?: string | null
          company_name?: string | null
          company_region?: string | null
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          description?: string
          duration?: string | null
          id?: string
          industry_id?: string
          institution_id?: string | null
          is_active?: boolean | null
          is_paid?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          payment_amount?: number | null
          payment_currency?: string | null
          required_level?: string[] | null
          requirements?: string[] | null
          requires_cv?: boolean
          responsibilities?: string[] | null
          slots_available?: number | null
          slots_filled?: number | null
          title?: string
          updated_at?: string | null
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      paper_reviews: {
        Row: {
          clarity_rating: number | null
          created_at: string | null
          decision: string | null
          feedback: string
          id: string
          methodology_rating: number | null
          originality_rating: number | null
          overall_rating: number | null
          paper_id: string
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          clarity_rating?: number | null
          created_at?: string | null
          decision?: string | null
          feedback: string
          id?: string
          methodology_rating?: number | null
          originality_rating?: number | null
          overall_rating?: number | null
          paper_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          clarity_rating?: number | null
          created_at?: string | null
          decision?: string | null
          feedback?: string
          id?: string
          methodology_rating?: number | null
          originality_rating?: number | null
          overall_rating?: number | null
          paper_id?: string
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_reviews_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string
          currency: string
          discount_amount: number | null
          id: string
          payment_method: string | null
          plan_name: string
          reference: string
          status: string
          tier: string
          user_id: string
        }
        Insert: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          id?: string
          payment_method?: string | null
          plan_name: string
          reference: string
          status?: string
          tier: string
          user_id: string
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          id?: string
          payment_method?: string | null
          plan_name?: string
          reference?: string
          status?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          type: string | null
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          assigned_supervisor_id: string | null
          availability: string | null
          avatar_url: string | null
          bank_name: string | null
          bio: string | null
          company_address: string | null
          created_at: string
          cv_url: string | null
          department: string | null
          email: string
          email_verified: boolean | null
          fields_of_interest: string[] | null
          full_name: string
          id: string
          institution_id: string | null
          is_verified: boolean | null
          level: string | null
          matric_number: string | null
          phone_number: string | null
          preferred_job_type: string[] | null
          researcher_type: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          assigned_supervisor_id?: string | null
          availability?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bio?: string | null
          company_address?: string | null
          created_at?: string
          cv_url?: string | null
          department?: string | null
          email: string
          email_verified?: boolean | null
          fields_of_interest?: string[] | null
          full_name: string
          id?: string
          institution_id?: string | null
          is_verified?: boolean | null
          level?: string | null
          matric_number?: string | null
          phone_number?: string | null
          preferred_job_type?: string[] | null
          researcher_type?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          assigned_supervisor_id?: string | null
          availability?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bio?: string | null
          company_address?: string | null
          created_at?: string
          cv_url?: string | null
          department?: string | null
          email?: string
          email_verified?: boolean | null
          fields_of_interest?: string[] | null
          full_name?: string
          id?: string
          institution_id?: string | null
          is_verified?: boolean | null
          level?: string | null
          matric_number?: string | null
          phone_number?: string | null
          preferred_job_type?: string[] | null
          researcher_type?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_institution"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          credits_earned: number
          id: string
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          credits_earned?: number
          id?: string
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          credits_earned?: number
          id?: string
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_usages: {
        Row: {
          created_at: string
          credits_awarded: number
          id: string
          referral_code_id: string
          referred_credits_awarded: number | null
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referral_code_id: string
          referred_credits_awarded?: number | null
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referral_code_id?: string
          referred_credits_awarded?: number | null
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_usages_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      research_chapter_reviews: {
        Row: {
          academic_clarity_score: number | null
          academic_language_tone: string | null
          academic_level_feedback: string[] | null
          ai_confidence_explanation: string | null
          ai_confidence_score: number | null
          chapter_name: string
          chapter_number: number | null
          clarity_readability: string | null
          created_at: string
          encouragement_note: string | null
          examiner_expectations: string[] | null
          examiner_readiness: string | null
          generic_examples: string[] | null
          id: string
          literature_review_quality: string | null
          methodology_alignment: number | null
          methodology_assessment: string | null
          next_action_steps: string[] | null
          optional_improvements: string[] | null
          originality_critical_thinking: string | null
          practical_relevance: string | null
          priority_fix_list: string[] | null
          purpose_based_recommendations: string[] | null
          rating: number | null
          recommendations: string[] | null
          referencing_check: string | null
          required_fixes: string[] | null
          research_id: string
          review_mode: string | null
          revision_checklist: Json | null
          risk_gap_identification: string[] | null
          strengths: string[] | null
          structure_review: string | null
          style_match_score: number | null
          suggested_improvements: string[] | null
          summary: string | null
          supervisor_insight: string | null
          updated_at: string
          user_id: string
          weak_areas: string[] | null
          what_to_change: string[] | null
          why_it_matters: string[] | null
        }
        Insert: {
          academic_clarity_score?: number | null
          academic_language_tone?: string | null
          academic_level_feedback?: string[] | null
          ai_confidence_explanation?: string | null
          ai_confidence_score?: number | null
          chapter_name: string
          chapter_number?: number | null
          clarity_readability?: string | null
          created_at?: string
          encouragement_note?: string | null
          examiner_expectations?: string[] | null
          examiner_readiness?: string | null
          generic_examples?: string[] | null
          id?: string
          literature_review_quality?: string | null
          methodology_alignment?: number | null
          methodology_assessment?: string | null
          next_action_steps?: string[] | null
          optional_improvements?: string[] | null
          originality_critical_thinking?: string | null
          practical_relevance?: string | null
          priority_fix_list?: string[] | null
          purpose_based_recommendations?: string[] | null
          rating?: number | null
          recommendations?: string[] | null
          referencing_check?: string | null
          required_fixes?: string[] | null
          research_id: string
          review_mode?: string | null
          revision_checklist?: Json | null
          risk_gap_identification?: string[] | null
          strengths?: string[] | null
          structure_review?: string | null
          style_match_score?: number | null
          suggested_improvements?: string[] | null
          summary?: string | null
          supervisor_insight?: string | null
          updated_at?: string
          user_id: string
          weak_areas?: string[] | null
          what_to_change?: string[] | null
          why_it_matters?: string[] | null
        }
        Update: {
          academic_clarity_score?: number | null
          academic_language_tone?: string | null
          academic_level_feedback?: string[] | null
          ai_confidence_explanation?: string | null
          ai_confidence_score?: number | null
          chapter_name?: string
          chapter_number?: number | null
          clarity_readability?: string | null
          created_at?: string
          encouragement_note?: string | null
          examiner_expectations?: string[] | null
          examiner_readiness?: string | null
          generic_examples?: string[] | null
          id?: string
          literature_review_quality?: string | null
          methodology_alignment?: number | null
          methodology_assessment?: string | null
          next_action_steps?: string[] | null
          optional_improvements?: string[] | null
          originality_critical_thinking?: string | null
          practical_relevance?: string | null
          priority_fix_list?: string[] | null
          purpose_based_recommendations?: string[] | null
          rating?: number | null
          recommendations?: string[] | null
          referencing_check?: string | null
          required_fixes?: string[] | null
          research_id?: string
          review_mode?: string | null
          revision_checklist?: Json | null
          risk_gap_identification?: string[] | null
          strengths?: string[] | null
          structure_review?: string | null
          style_match_score?: number | null
          suggested_improvements?: string[] | null
          summary?: string | null
          supervisor_insight?: string | null
          updated_at?: string
          user_id?: string
          weak_areas?: string[] | null
          what_to_change?: string[] | null
          why_it_matters?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "research_chapter_reviews_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      research_papers: {
        Row: {
          abstract: string | null
          ai_content_risk: string | null
          ai_style_source: string | null
          ai_summary: string | null
          ai_tools_used: string | null
          ai_usage_declared: boolean | null
          allow_download: boolean | null
          author_id: string
          author_names: string[] | null
          citation_count: number
          co_supervisor_id: string | null
          created_at: string
          department_id: string | null
          download_credit_cost: number
          downloads_count: number | null
          file_name: string | null
          file_url: string | null
          funding_currency: string | null
          funding_required: number | null
          funding_status: string | null
          id: string
          industry_tags: string[] | null
          institution_id: string | null
          is_patented: boolean | null
          is_published_journal: boolean | null
          journal_name: string | null
          journal_url: string | null
          key_findings: string | null
          keywords: string[] | null
          last_resubmitted_at: string | null
          methodology: string | null
          patent_number: string | null
          plagiarism_checked_at: string | null
          plagiarism_score: number | null
          plagiarism_status: string | null
          practical_applications: string[] | null
          problem_statement: string | null
          published_at: string | null
          research_field: string | null
          research_level: string | null
          research_purpose: string | null
          research_stage: string | null
          research_type: string | null
          resubmission_count: number | null
          reviewer_comments: string | null
          reviewer_id: string | null
          sdg_category: string | null
          solution_approach: string | null
          status: Database["public"]["Enums"]["research_status"]
          supervision_mode: string | null
          supervision_type: string | null
          supervisor_approval_status: string | null
          supervisor_approved_at: string | null
          supervisor_comments: string | null
          supervisor_id: string | null
          supervisor_reviewed_at: string | null
          title: string
          updated_at: string
          views_count: number | null
          year_completed: number | null
        }
        Insert: {
          abstract?: string | null
          ai_content_risk?: string | null
          ai_style_source?: string | null
          ai_summary?: string | null
          ai_tools_used?: string | null
          ai_usage_declared?: boolean | null
          allow_download?: boolean | null
          author_id: string
          author_names?: string[] | null
          citation_count?: number
          co_supervisor_id?: string | null
          created_at?: string
          department_id?: string | null
          download_credit_cost?: number
          downloads_count?: number | null
          file_name?: string | null
          file_url?: string | null
          funding_currency?: string | null
          funding_required?: number | null
          funding_status?: string | null
          id?: string
          industry_tags?: string[] | null
          institution_id?: string | null
          is_patented?: boolean | null
          is_published_journal?: boolean | null
          journal_name?: string | null
          journal_url?: string | null
          key_findings?: string | null
          keywords?: string[] | null
          last_resubmitted_at?: string | null
          methodology?: string | null
          patent_number?: string | null
          plagiarism_checked_at?: string | null
          plagiarism_score?: number | null
          plagiarism_status?: string | null
          practical_applications?: string[] | null
          problem_statement?: string | null
          published_at?: string | null
          research_field?: string | null
          research_level?: string | null
          research_purpose?: string | null
          research_stage?: string | null
          research_type?: string | null
          resubmission_count?: number | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          sdg_category?: string | null
          solution_approach?: string | null
          status?: Database["public"]["Enums"]["research_status"]
          supervision_mode?: string | null
          supervision_type?: string | null
          supervisor_approval_status?: string | null
          supervisor_approved_at?: string | null
          supervisor_comments?: string | null
          supervisor_id?: string | null
          supervisor_reviewed_at?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
          year_completed?: number | null
        }
        Update: {
          abstract?: string | null
          ai_content_risk?: string | null
          ai_style_source?: string | null
          ai_summary?: string | null
          ai_tools_used?: string | null
          ai_usage_declared?: boolean | null
          allow_download?: boolean | null
          author_id?: string
          author_names?: string[] | null
          citation_count?: number
          co_supervisor_id?: string | null
          created_at?: string
          department_id?: string | null
          download_credit_cost?: number
          downloads_count?: number | null
          file_name?: string | null
          file_url?: string | null
          funding_currency?: string | null
          funding_required?: number | null
          funding_status?: string | null
          id?: string
          industry_tags?: string[] | null
          institution_id?: string | null
          is_patented?: boolean | null
          is_published_journal?: boolean | null
          journal_name?: string | null
          journal_url?: string | null
          key_findings?: string | null
          keywords?: string[] | null
          last_resubmitted_at?: string | null
          methodology?: string | null
          patent_number?: string | null
          plagiarism_checked_at?: string | null
          plagiarism_score?: number | null
          plagiarism_status?: string | null
          practical_applications?: string[] | null
          problem_statement?: string | null
          published_at?: string | null
          research_field?: string | null
          research_level?: string | null
          research_purpose?: string | null
          research_stage?: string | null
          research_type?: string | null
          resubmission_count?: number | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          sdg_category?: string | null
          solution_approach?: string | null
          status?: Database["public"]["Enums"]["research_status"]
          supervision_mode?: string | null
          supervision_type?: string | null
          supervisor_approval_status?: string | null
          supervisor_approved_at?: string | null
          supervisor_comments?: string | null
          supervisor_id?: string | null
          supervisor_reviewed_at?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
          year_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "research_papers_co_supervisor_id_fkey"
            columns: ["co_supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "research_papers_co_supervisor_id_fkey"
            columns: ["co_supervisor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "research_papers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_papers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_papers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "research_papers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      researcher_collaborations: {
        Row: {
          created_at: string
          id: string
          match_reason: string | null
          match_score: number | null
          message: string | null
          recipient_id: string
          requester_id: string
          research_overlap: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          message?: string | null
          recipient_id: string
          requester_id: string
          research_overlap?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          message?: string | null
          recipient_id?: string
          requester_id?: string
          research_overlap?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      researcher_invites: {
        Row: {
          challenge_id: string
          company_name: string
          created_at: string
          id: string
          industry_id: string
          match_id: string | null
          message: string
          researcher_id: string
          researcher_institution_id: string | null
          researcher_institution_name: string | null
          researcher_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          company_name: string
          created_at?: string
          id?: string
          industry_id: string
          match_id?: string | null
          message: string
          researcher_id: string
          researcher_institution_id?: string | null
          researcher_institution_name?: string | null
          researcher_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          company_name?: string
          created_at?: string
          id?: string
          industry_id?: string
          match_id?: string | null
          message?: string
          researcher_id?: string
          researcher_institution_id?: string | null
          researcher_institution_name?: string | null
          researcher_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_invites_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researcher_invites_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "challenge_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_subscriptions: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          researcher_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          researcher_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          researcher_id?: string
        }
        Relationships: []
      }
      reviewer_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string
          id: string
          institution_id: string
          invite_code: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          institution_id: string
          invite_code: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          institution_id?: string
          invite_code?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_invites_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_research: {
        Row: {
          created_at: string
          id: string
          paper_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paper_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paper_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_research_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_style_references: {
        Row: {
          created_at: string
          declaration_accepted: boolean
          file_name: string
          file_size: number | null
          id: string
          source_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          declaration_accepted?: boolean
          file_name: string
          file_size?: number | null
          id?: string
          source_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          declaration_accepted?: boolean
          file_name?: string
          file_size?: number | null
          id?: string
          source_description?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          hired_student_id: string
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          hired_student_id: string
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          hired_student_id?: string
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_tasks_hired_student_id_fkey"
            columns: ["hired_student_id"]
            isOneToOne: false
            referencedRelation: "hired_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_wallet: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_withdrawals: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string | null
          currency: string | null
          id: string
          processed_at: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string | null
          currency?: string | null
          id?: string
          processed_at?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          processed_at?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ai_credits_per_day: number
          ai_matches_per_challenge: number
          amount_ngn: number
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          max_challenges: number
          max_research_uploads: number
          name: string
          period: string
          plan_id: string
          sort_order: number | null
          updated_at: string
          user_type: string
        }
        Insert: {
          ai_credits_per_day?: number
          ai_matches_per_challenge?: number
          amount_ngn?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_challenges?: number
          max_research_uploads?: number
          name: string
          period?: string
          plan_id: string
          sort_order?: number | null
          updated_at?: string
          user_type?: string
        }
        Update: {
          ai_credits_per_day?: number
          ai_matches_per_challenge?: number
          amount_ngn?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_challenges?: number
          max_research_uploads?: number
          name?: string
          period?: string
          plan_id?: string
          sort_order?: number | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          ai_credits_remaining: number | null
          ai_matchers_remaining: number | null
          ai_matches_per_challenge: number | null
          amount: number | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_active: boolean | null
          max_challenges_per_month: number | null
          paystack_customer_id: string | null
          paystack_subscription_code: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits_remaining?: number | null
          ai_matchers_remaining?: number | null
          ai_matches_per_challenge?: number | null
          amount?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_active?: boolean | null
          max_challenges_per_month?: number | null
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits_remaining?: number | null
          ai_matchers_remaining?: number | null
          ai_matches_per_challenge?: number | null
          amount?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_active?: boolean | null
          max_challenges_per_month?: number | null
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supervisor_activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: string | null
          id: string
          metadata: Json | null
          research_id: string | null
          student_id: string | null
          supervisor_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: string | null
          id?: string
          metadata?: Json | null
          research_id?: string | null
          student_id?: string | null
          supervisor_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: string | null
          id?: string
          metadata?: Json | null
          research_id?: string | null
          student_id?: string | null
          supervisor_id?: string
        }
        Relationships: []
      }
      supervisor_ai_credits: {
        Row: {
          credits_limit: number
          credits_remaining: number
          id: string
          last_reset_at: string
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          credits_limit?: number
          credits_remaining?: number
          id?: string
          last_reset_at?: string
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          credits_limit?: number
          credits_remaining?: number
          id?: string
          last_reset_at?: string
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_ai_training: {
        Row: {
          citation_style: string | null
          created_at: string
          custom_guidance: string | null
          do_rules: string[]
          dont_rules: string[]
          example_feedback: string | null
          focus_areas: string[]
          id: string
          is_active: boolean
          preferred_methodology: string | null
          research_field: string | null
          strictness: string
          supervisor_id: string
          tone: string
          updated_at: string
        }
        Insert: {
          citation_style?: string | null
          created_at?: string
          custom_guidance?: string | null
          do_rules?: string[]
          dont_rules?: string[]
          example_feedback?: string | null
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          preferred_methodology?: string | null
          research_field?: string | null
          strictness?: string
          supervisor_id: string
          tone?: string
          updated_at?: string
        }
        Update: {
          citation_style?: string | null
          created_at?: string
          custom_guidance?: string | null
          do_rules?: string[]
          dont_rules?: string[]
          example_feedback?: string | null
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          preferred_methodology?: string | null
          research_field?: string | null
          strictness?: string
          supervisor_id?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_ai_training_presets: {
        Row: {
          citation_style: string | null
          created_at: string
          custom_guidance: string | null
          description: string | null
          do_rules: string[]
          dont_rules: string[]
          example_feedback: string | null
          focus_areas: string[]
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          preferred_methodology: string | null
          research_field: string | null
          strictness: string
          supervisor_id: string
          tone: string
          updated_at: string
        }
        Insert: {
          citation_style?: string | null
          created_at?: string
          custom_guidance?: string | null
          description?: string | null
          do_rules?: string[]
          dont_rules?: string[]
          example_feedback?: string | null
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          preferred_methodology?: string | null
          research_field?: string | null
          strictness?: string
          supervisor_id: string
          tone?: string
          updated_at?: string
        }
        Update: {
          citation_style?: string | null
          created_at?: string
          custom_guidance?: string | null
          description?: string | null
          do_rules?: string[]
          dont_rules?: string[]
          example_feedback?: string | null
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          preferred_methodology?: string | null
          research_field?: string | null
          strictness?: string
          supervisor_id?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_feedback_uploads: {
        Row: {
          comments: string | null
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          research_id: string
          review_stage: string
          supervisor_id: string
          version_number: number
        }
        Insert: {
          comments?: string | null
          created_at?: string
          file_name: string
          file_type?: string
          file_url: string
          id?: string
          research_id: string
          review_stage: string
          supervisor_id: string
          version_number?: number
        }
        Update: {
          comments?: string | null
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          research_id?: string
          review_stage?: string
          supervisor_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_feedback_uploads_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          department: string | null
          email: string
          expires_at: string | null
          full_name: string
          id: string
          institution_id: string
          invite_code: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          institution_id: string
          invite_code: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          institution_id?: string
          invite_code?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_invites_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_review_history: {
        Row: {
          action: string
          comments: string | null
          created_at: string
          feedback_file_id: string | null
          id: string
          new_status: string
          previous_status: string | null
          research_id: string
          supervisor_id: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string
          feedback_file_id?: string | null
          id?: string
          new_status: string
          previous_status?: string | null
          research_id: string
          supervisor_id: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string
          feedback_file_id?: string | null
          id?: string
          new_status?: string
          previous_status?: string | null
          research_id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_review_history_feedback_file_id_fkey"
            columns: ["feedback_file_id"]
            isOneToOne: false
            referencedRelation: "supervisor_feedback_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_review_history_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "research_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_student_invites: {
        Row: {
          created_at: string | null
          department: string | null
          expires_at: string | null
          id: string
          institution_id: string | null
          invite_code: string
          is_active: boolean | null
          max_students: number | null
          supervisor_id: string
          updated_at: string | null
          used_count: number | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          invite_code: string
          is_active?: boolean | null
          max_students?: number | null
          supervisor_id: string
          updated_at?: string | null
          used_count?: number | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          invite_code?: string
          is_active?: boolean | null
          max_students?: number | null
          supervisor_id?: string
          updated_at?: string | null
          used_count?: number | null
        }
        Relationships: []
      }
      supervisor_student_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          sender_id: string
          student_id: string
          supervisor_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          sender_id: string
          student_id: string
          supervisor_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string
          student_id?: string
          supervisor_id?: string
        }
        Relationships: []
      }
      supervisor_style_references: {
        Row: {
          created_at: string
          declaration_accepted: boolean
          file_name: string
          file_size: number | null
          id: string
          source_description: string | null
          student_id: string
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          declaration_accepted?: boolean
          file_name: string
          file_size?: number | null
          id?: string
          source_description?: string | null
          student_id: string
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          declaration_accepted?: boolean
          file_name?: string
          file_size?: number | null
          id?: string
          source_description?: string | null
          student_id?: string
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_training_assignments: {
        Row: {
          created_at: string
          id: string
          preset_id: string
          research_id: string | null
          student_id: string | null
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          preset_id: string
          research_id?: string | null
          student_id?: string | null
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          preset_id?: string
          research_id?: string | null
          student_id?: string | null
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_training_assignments_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "supervisor_ai_training_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_wallet: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      supervisor_withdrawals: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string | null
          currency: string | null
          id: string
          processed_at: string | null
          status: string | null
          supervisor_id: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string | null
          currency?: string | null
          id?: string
          processed_at?: string | null
          status?: string | null
          supervisor_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          processed_at?: string | null
          status?: string | null
          supervisor_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supervisors: {
        Row: {
          academic_rank: string | null
          created_at: string | null
          current_students: number | null
          department: string | null
          department_id: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          is_external: boolean | null
          max_students: number | null
          specialization: string[] | null
          staff_id: string | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          academic_rank?: string | null
          created_at?: string | null
          current_students?: number | null
          department?: string | null
          department_id?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          is_external?: boolean | null
          max_students?: number | null
          specialization?: string[] | null
          staff_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          academic_rank?: string | null
          created_at?: string | null
          current_students?: number | null
          department?: string | null
          department_id?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          is_external?: boolean | null
          max_students?: number | null
          specialization?: string[] | null
          staff_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisors_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number | null
          created_at: string
          currency: string | null
          id: string
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          type: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          type: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          type?: string
          used?: boolean
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference: string | null
          status: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          institution_id: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          institution_id?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          institution_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_institution"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string | null
          is_active: boolean | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          is_active?: boolean | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          is_active?: boolean | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_supervisor_credits: {
        Args: { p_supervisor_id: string }
        Returns: {
          student_count: number
          total_credits: number
        }[]
      }
      create_notification: {
        Args: {
          _link?: string
          _message?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      get_subscription_limits: {
        Args: { tier_name: Database["public"]["Enums"]["subscription_tier"] }
        Returns: {
          ai_matches: number
          max_challenges: number
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_institution_id: { Args: { _user_id: string }; Returns: string }
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
    }
    Enums: {
      app_role:
        | "researcher"
        | "institution"
        | "industry"
        | "investor"
        | "admin"
        | "reviewer"
        | "supervisor"
        | "ipn"
        | "job_applicant"
      application_status: "pending" | "approved" | "rejected" | "hired"
      job_type: "part_time" | "siwes" | "industrial_training" | "internship"
      research_status:
        | "draft"
        | "under_review"
        | "revision_requested"
        | "approved"
        | "published"
        | "rejected"
      subscription_tier: "free" | "basic" | "pro" | "enterprise"
      transaction_type: "funding" | "payment" | "withdrawal" | "commission"
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
      app_role: [
        "researcher",
        "institution",
        "industry",
        "investor",
        "admin",
        "reviewer",
        "supervisor",
        "ipn",
        "job_applicant",
      ],
      application_status: ["pending", "approved", "rejected", "hired"],
      job_type: ["part_time", "siwes", "industrial_training", "internship"],
      research_status: [
        "draft",
        "under_review",
        "revision_requested",
        "approved",
        "published",
        "rejected",
      ],
      subscription_tier: ["free", "basic", "pro", "enterprise"],
      transaction_type: ["funding", "payment", "withdrawal", "commission"],
    },
  },
} as const
