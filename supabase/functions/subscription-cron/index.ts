import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  current_period_end: string;
  is_active: boolean;
  ai_credits_remaining: number;
  ai_matchers_remaining: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting subscription cron job...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Calculate date ranges
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysStart = twoDaysFromNow.toISOString().split('T')[0];
    
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const twoDaysEnd = threeDaysFromNow.toISOString().split('T')[0];
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`Date ranges - Today: ${today}, 2 days: ${twoDaysStart}-${twoDaysEnd}, Yesterday: ${yesterdayStr}`);

    // ===== TASK 1: Send renewal reminders (2 days before expiry) =====
    console.log("Checking for subscriptions expiring in 2 days...");
    
    // Fetch subscriptions expiring in 2 days (without complex joins to avoid relationship issues)
    const { data: expiringSubscriptions, error: expiringError } = await supabase
      .from("subscriptions")
      .select("id, user_id, tier, current_period_end, is_active")
      .gte("current_period_end", twoDaysStart)
      .lt("current_period_end", twoDaysEnd)
      .neq("tier", "free")
      .eq("is_active", true);

    if (expiringError) {
      console.error("Error fetching expiring subscriptions:", expiringError);
    } else if (expiringSubscriptions && expiringSubscriptions.length > 0) {
      console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 2 days`);
      
      for (const sub of expiringSubscriptions as Subscription[]) {
        // Fetch user profile separately to avoid join issues
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", sub.user_id)
          .maybeSingle();
        
        if (profileError) {
          console.error(`Error fetching profile for user ${sub.user_id}:`, profileError);
          continue;
        }
        
        // Fetch user role separately
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sub.user_id)
          .maybeSingle();
        
        const email = profile?.email;
        const name = profile?.full_name;
        const role = userRole?.role || "researcher";
        
        if (email) {
          console.log(`Sending renewal reminder to ${email} (${role}) for ${sub.tier} plan`);
          
          // Create in-app notification
          const { error: notifError } = await supabase.from("notifications").insert({
            user_id: sub.user_id,
            title: "Subscription Expiring Soon",
            message: `Your ${sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} plan expires in 2 days. Renew now to keep your benefits.`,
            type: "subscription",
            link: role === "industry" ? "/industry/subscriptions" : "/subscriptions",
            is_read: false,
          });
          
          if (notifError) {
            console.error(`Failed to create in-app notification for ${sub.user_id}:`, notifError);
          } else {
            console.log(`In-app notification created for ${sub.user_id}`);
          }
          
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                type: "subscription_expiring",
                to: email,
                data: {
                  name,
                  planName: sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1),
                  expiryDate: new Date(sub.current_period_end).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  role,
                },
              }),
            });
            
            if (response.ok) {
              console.log(`Renewal reminder email sent successfully to ${email}`);
            } else {
              const errorText = await response.text();
              console.error(`Failed to send renewal reminder email to ${email}:`, errorText);
            }
          } catch (emailError) {
            console.error(`Error sending renewal reminder to ${email}:`, emailError);
          }
        } else {
          console.log(`No email found for user ${sub.user_id}, skipping...`);
        }
      }
    } else {
      console.log("No subscriptions expiring in 2 days");
    }

    // ===== TASK 2: Send expiration notices (for subscriptions expiring TODAY) =====
    console.log("Checking for subscriptions expiring today...");
    
    // Calculate end of today for proper date range
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Fetch subscriptions expiring today (without complex joins)
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from("subscriptions")
      .select("id, user_id, tier, current_period_end, is_active")
      .gte("current_period_end", today)
      .lte("current_period_end", todayEnd.toISOString())
      .neq("tier", "free")
      .eq("is_active", true);

    if (expiredError) {
      console.error("Error fetching expired subscriptions:", expiredError);
    } else if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      console.log(`Found ${expiredSubscriptions.length} subscriptions that expired`);
      
      for (const sub of expiredSubscriptions as Subscription[]) {
        // Fetch user profile separately
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", sub.user_id)
          .maybeSingle();
        
        // Fetch user role separately
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sub.user_id)
          .maybeSingle();
        
        const email = profile?.email;
        const name = profile?.full_name;
        const role = userRole?.role || "researcher";
        
        if (email) {
          console.log(`Sending expiration notice to ${email} (${role}) for ${sub.tier} plan`);
          
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                type: "subscription_expired",
                to: email,
                data: {
                  name,
                  planName: sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1),
                  role,
                },
              }),
            });
            
            if (response.ok) {
              console.log(`Expiration notice sent successfully to ${email}`);
            } else {
              const errorText = await response.text();
              console.error(`Failed to send expiration notice to ${email}:`, errorText);
            }
          } catch (emailError) {
            console.error(`Error sending expiration notice to ${email}:`, emailError);
          }
          
          // Mark subscription as inactive
          await supabase
            .from("subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
        }
      }
    } else {
      console.log("No subscriptions expired today");
    }

    // ===== TASK 3: Monthly free credits reset =====
    console.log("Checking for free-tier subscriptions needing credit reset...");
    
    // Fetch free subscriptions needing reset (without complex joins)
    const { data: freeSubscriptions, error: freeError } = await supabase
      .from("subscriptions")
      .select("id, user_id, tier, current_period_end, ai_credits_remaining, ai_matchers_remaining")
      .eq("tier", "free")
      .lt("current_period_end", now.toISOString());

    if (freeError) {
      console.error("Error fetching free subscriptions:", freeError);
    } else if (freeSubscriptions && freeSubscriptions.length > 0) {
      console.log(`Found ${freeSubscriptions.length} free-tier subscriptions needing reset`);
      
      for (const sub of freeSubscriptions as Subscription[]) {
        // Fetch user role separately
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sub.user_id)
          .maybeSingle();
        
        const role = userRole?.role || "researcher";
        
        const newPeriodStart = now.toISOString();
        const newPeriodEnd = new Date(now);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        
        // Reset credits based on role
        const updateData: Record<string, any> = {
          current_period_start: newPeriodStart,
          current_period_end: newPeriodEnd.toISOString(),
          is_active: true,
        };
        
        if (role === "researcher") {
          updateData.ai_credits_remaining = 2;
          console.log(`Resetting researcher ${sub.user_id} to 2 AI credits`);
        } else if (role === "industry") {
          updateData.ai_matchers_remaining = 3;
          updateData.max_challenges_per_month = 1;
          console.log(`Resetting industry ${sub.user_id} to 3 AI matchers`);
        }
        
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("id", sub.id);
          
        if (updateError) {
          console.error(`Error updating subscription ${sub.id}:`, updateError);
        } else {
          console.log(`Successfully reset credits for subscription ${sub.id}`);
        }
      }
    } else {
      console.log("No free-tier subscriptions need credit reset");
    }

    console.log("Subscription cron job completed successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Subscription cron job completed",
        stats: {
          expiringReminders: expiringSubscriptions?.length || 0,
          expiredNotices: expiredSubscriptions?.length || 0,
          freeCreditsReset: freeSubscriptions?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in subscription-cron function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
