import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SupervisorCredits {
  credits_remaining: number;
  credits_limit: number;
  student_count: number;
}

export function useSupervisorCredits() {
  const [credits, setCredits] = useState<SupervisorCredits>({
    credits_remaining: 0,
    credits_limit: 0,
    student_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is a supervisor
      const { data: supervisorData } = await supabase
        .from("supervisors")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!supervisorData) {
        setIsSupervisor(false);
        setLoading(false);
        return;
      }

      setIsSupervisor(true);

      // Get supervisor credits
      const { data: creditsData } = await supabase
        .from("supervisor_ai_credits")
        .select("credits_remaining, credits_limit")
        .eq("supervisor_id", user.id)
        .maybeSingle();

      // Count students
      const { count: studentCount } = await supabase
        .from("research_papers")
        .select("author_id", { count: "exact", head: true })
        .eq("supervisor_id", user.id)
        .eq("research_type", "student");

      if (creditsData) {
        setCredits({
          credits_remaining: creditsData.credits_remaining,
          credits_limit: creditsData.credits_limit,
          student_count: studentCount || 0,
        });
      } else {
        // Calculate expected credits for display
        const expectedCredits = (studentCount || 0) * 3; // Default 3 per free student
        setCredits({
          credits_remaining: expectedCredits,
          credits_limit: expectedCredits,
          student_count: studentCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching supervisor credits:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("supervisor-credits-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "supervisor_ai_credits",
        },
        () => {
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCredits]);

  return {
    credits,
    creditsRemaining: credits.credits_remaining,
    creditsLimit: credits.credits_limit,
    studentCount: credits.student_count,
    loading,
    isSupervisor,
    refresh: fetchCredits,
  };
}
