import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_location: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useFAQ(options?: { category?: string; displayLocation?: string }) {
  return useQuery({
    queryKey: ["faq", options?.category, options?.displayLocation],
    queryFn: async () => {
      let query = supabase
        .from("faq")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (options?.category) {
        query = query.eq("category", options.category);
      }

      if (options?.displayLocation) {
        query = query.or(`display_location.eq.${options.displayLocation},display_location.eq.global`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FAQ[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useFAQAdmin() {
  return useQuery({
    queryKey: ["faq-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq")
        .select("*")
        .order("category")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as FAQ[];
    },
  });
}

export const FAQ_CATEGORIES = [
  { value: "students", label: "For Students" },
  { value: "supervisors", label: "For Supervisors" },
  { value: "institutions", label: "For Institutions" },
  { value: "industry", label: "For Industry & Employers" },
  { value: "payments", label: "Payments & Revenue" },
  { value: "ai_privacy", label: "AI Supervisor & Data Privacy" },
  { value: "general", label: "General" },
];

export const FAQ_LOCATIONS = [
  { value: "full_page", label: "Full FAQ Page Only" },
  { value: "student_research", label: "Student Research Page" },
  { value: "research_public", label: "Research Public Page" },
  { value: "jobs", label: "Jobs Page" },
  { value: "global", label: "Global (All Pages)" },
];
