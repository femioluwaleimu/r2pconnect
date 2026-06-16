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

const nowIso = "2026-06-16T00:00:00.000Z";

export const DEFAULT_PUBLIC_FAQS: FAQ[] = [
  {
    id: "default-ai-saved-history",
    question: "Can I save AI-generated responses and come back to them later?",
    answer:
      "Yes. Topic Refiner, Gap Detector, and AI Research Assistant include a History area where you can save generated AI responses, open them later, restore them back into the tool, or delete them when you no longer need them.",
    category: "ai_tools",
    display_location: "full_page",
    is_active: true,
    sort_order: 10,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-ai-save-limits",
    question: "How many AI responses can I save on the free plan?",
    answer:
      "Free plan users can save up to 3 AI responses. Users on an active paid subscription can save unlimited AI responses. If a paid subscription expires, saving is paused until the user subscribes again.",
    category: "ai_tools",
    display_location: "full_page",
    is_active: true,
    sort_order: 11,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-topic-refiner-gap-detector",
    question: "What can the Topic Refiner and Gap Detector do for me?",
    answer:
      "Topic Refiner helps turn rough ideas into researchable topics with scope, objectives, research questions, methods, and practical guidance. Gap Detector helps identify underexplored research opportunities in a field so students can choose stronger, more original work.",
    category: "ai_tools",
    display_location: "full_page",
    is_active: true,
    sort_order: 12,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-free-ai-credits",
    question: "Do new students get free AI credits?",
    answer:
      "Yes. New researcher/student accounts on the free plan receive 3 AI credits for the month. Free monthly credits renew for free-plan researchers when their free period resets.",
    category: "students",
    display_location: "full_page",
    is_active: true,
    sort_order: 20,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-referral-bonus",
    question: "Is there a referral bonus?",
    answer:
      "Yes. When a new user signs up with another user's referral link, both users receive a 5 AI credit bonus after the referral is processed.",
    category: "students",
    display_location: "full_page",
    is_active: true,
    sort_order: 21,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-download-revenue-share",
    question: "Can research owners earn when people download their papers?",
    answer:
      "Yes. When a paid download uses credits, the platform can share the download value among the student/research owner, supervisor, institution, and platform according to the configured commission settings.",
    category: "payments",
    display_location: "full_page",
    is_active: true,
    sort_order: 30,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-supervisor-verification",
    question: "What happens when a supervisor registers?",
    answer:
      "Supervisor accounts are created pending verification. The institution admin and platform admin are notified by email so they can confirm and verify the supervisor before full access is granted.",
    category: "supervisors",
    display_location: "full_page",
    is_active: true,
    sort_order: 40,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-supervisor-invite-links",
    question: "Can students join through a supervisor invite link?",
    answer:
      "Yes. When a student opens a supervisor invite link, the registration page shows the supervisor's name so the student can confirm they are joining under the right supervisor.",
    category: "students",
    display_location: "full_page",
    is_active: true,
    sort_order: 41,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-install-app",
    question: "Can I install R2P Connect on my phone?",
    answer:
      "Yes. R2P Connect supports app installation from the login page on supported mobile browsers. On iPhone, users can use Safari's Share menu and choose Add to Home Screen.",
    category: "general",
    display_location: "full_page",
    is_active: true,
    sort_order: 50,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "default-admin-impersonation",
    question: "Can anyone access an institution dashboard?",
    answer:
      "No. Institution dashboard access is restricted to the institution account and authorized platform administrators. Admin impersonation is limited to platform admins for support and verification workflows.",
    category: "institutions",
    display_location: "full_page",
    is_active: true,
    sort_order: 51,
    created_at: nowIso,
    updated_at: nowIso,
  },
];

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
      if (error) {
        return filterDefaultFaqs(options);
      }

      const rows = (data || []) as FAQ[];
      return rows.length ? rows : filterDefaultFaqs(options);
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
  { value: "ai_tools", label: "AI Tools & History" },
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

function filterDefaultFaqs(options?: { category?: string; displayLocation?: string }) {
  return DEFAULT_PUBLIC_FAQS.filter((faq) => {
    if (options?.category && faq.category !== options.category) {
      return false;
    }

    if (options?.displayLocation && faq.display_location !== options.displayLocation && faq.display_location !== "global") {
      return false;
    }

    return faq.is_active;
  });
}
