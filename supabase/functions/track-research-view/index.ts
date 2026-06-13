import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { research_id, action, credit_cost, downloader_id } = await req.json();

    if (!research_id) {
      return new Response(
        JSON.stringify({ error: "research_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const rawIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawIp + research_id));
    const ip_address = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: paper, error: paperError } = await supabase
      .from("research_papers")
      .select("id, author_id, views_count, downloads_count, title, download_credit_cost, institution_id, supervisor_id")
      .eq("id", research_id)
      .maybeSingle();

    if (paperError || !paper) {
      return new Response(
        JSON.stringify({ error: "Research paper not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = false;
    let newCount = 0;

    if (action === "view") {
      const today = new Date().toISOString().split("T")[0];
      const viewKey = `view_${research_id}_${ip_address}_${today}`;

      const { data: existingView } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("reference", viewKey)
        .maybeSingle();

      if (!existingView) {
        const { data: updatedPaper, error: updateError } = await supabase
          .from("research_papers")
          .update({ views_count: (paper.views_count || 0) + 1 })
          .eq("id", research_id)
          .select("views_count")
          .maybeSingle();

        if (!updateError && updatedPaper) {
          updated = true;
          newCount = updatedPaper.views_count;

          const { data: wallet } = await supabase
            .from("student_wallet")
            .select("id, balance, total_earned")
            .eq("user_id", paper.author_id)
            .maybeSingle();

          if (wallet) {
            await supabase
              .from("student_wallet")
              .update({
                balance: (wallet.balance || 0) + 1,
                total_earned: (wallet.total_earned || 0) + 1,
              })
              .eq("id", wallet.id);
          } else {
            await supabase
              .from("student_wallet")
              .insert({
                user_id: paper.author_id,
                balance: 1,
                total_earned: 1,
                currency: "NGN",
              });
          }

          await supabase.from("wallet_transactions").insert({
            user_id: paper.author_id,
            amount: 1,
            currency: "NGN",
            transaction_type: "payment",
            description: "Research view earning",
            reference: viewKey,
            status: "completed",
          });
        }
      } else {
        newCount = paper.views_count || 0;
      }
    } else if (action === "download") {
      // Get institution download_credit_cost if the paper has an institution
      let actualCreditCost = paper.download_credit_cost ?? 0;
      if (paper.institution_id) {
        const { data: inst } = await supabase
          .from("institutions")
          .select("download_credit_cost")
          .eq("id", paper.institution_id)
          .maybeSingle();
        if (inst && inst.download_credit_cost !== null && inst.download_credit_cost !== undefined) {
          actualCreditCost = inst.download_credit_cost;
        }
      }

      const actualDownloaderId = downloader_id;
      const isOwnPaper = actualDownloaderId === paper.author_id;

      // Handle credit deduction and wallet crediting for paid downloads
      if (actualCreditCost > 0 && !isOwnPaper) {
        if (!actualDownloaderId) {
          return new Response(
            JSON.stringify({ error: "You do not have sufficient credit, please subscribe to a plan." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 1. Check and deduct credits from downloader's subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id, ai_credits_remaining, tier, current_period_start")
          .eq("user_id", actualDownloaderId)
          .eq("is_active", true)
          .maybeSingle();

        if (!subscription || subscription.tier === 'free') {
          return new Response(
            JSON.stringify({ error: "You do not have sufficient credit, please subscribe to a plan." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get plan base credits
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("ai_credits_per_day")
          .eq("plan_id", `researcher_${subscription.tier}`)
          .eq("is_active", true)
          .maybeSingle();

        // Get topup credits for current period
        const { data: topups } = await supabase
          .from("credit_topup_purchases")
          .select("credits")
          .eq("user_id", actualDownloaderId)
          .in("status", ["completed", "success"])
          .gte("created_at", new Date(subscription.current_period_start!).toISOString());

        const topupCredits = (topups || []).reduce((sum: number, t: any) => sum + Number(t.credits || 0), 0);

        // Get used credits from ai_credits
        const { data: aiCredits } = await supabase
          .from("ai_credits")
          .select("credits_used")
          .eq("user_id", actualDownloaderId)
          .maybeSingle();

        const totalLimit = Number(planData?.ai_credits_per_day || 0) + topupCredits;
        const used = Number(aiCredits?.credits_used || 0);
        const available = totalLimit - used;

        if (available < actualCreditCost) {
          return new Response(
            JSON.stringify({ error: "You do not have sufficient credit, please subscribe to a plan or top up your credits." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Deduct credits
        if (aiCredits) {
          await supabase
            .from("ai_credits")
            .update({ credits_used: used + actualCreditCost })
            .eq("user_id", actualDownloaderId);
        }

        const currentRemaining = Number(subscription.ai_credits_remaining || 0);
        await supabase
          .from("subscriptions")
          .update({ ai_credits_remaining: Math.max(0, currentRemaining - actualCreditCost) })
          .eq("id", subscription.id);

        // 2. Get the download credit rate for cash conversion
        const { data: rateSetting } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "download_credit_rate_ngn")
          .maybeSingle();

        const ratePerCredit = Number(rateSetting?.value || 100);
        const ngnAmount = actualCreditCost * ratePerCredit;

        // 3. Get sharing formula from platform_settings
        const { data: shareSettings } = await supabase
          .from("platform_settings")
          .select("key, value")
          .in("key", ["download_student_share", "download_supervisor_share", "download_institution_share", "download_platform_share"]);

        const shares: Record<string, number> = {
          download_student_share: 50,
          download_supervisor_share: 20,
          download_institution_share: 20,
          download_platform_share: 10,
        };
        if (shareSettings) {
          shareSettings.forEach((s: any) => {
            if (s.key in shares) shares[s.key] = Number(s.value || 0);
          });
        }

        const studentAmount = Math.round(ngnAmount * shares.download_student_share / 100);
        const supervisorAmount = Math.round(ngnAmount * shares.download_supervisor_share / 100);
        const institutionAmount = Math.round(ngnAmount * shares.download_institution_share / 100);
        // Platform amount is remainder
        const platformAmount = ngnAmount - studentAmount - supervisorAmount - institutionAmount;

        const downloadKey = `download_earn_${research_id}_${actualDownloaderId}_${Date.now()}`;

        // --- STUDENT SHARE ---
        const { data: studentWallet } = await supabase
          .from("student_wallet")
          .select("id, balance, total_earned")
          .eq("user_id", paper.author_id)
          .maybeSingle();

        if (studentWallet) {
          await supabase.from("student_wallet").update({
            balance: (studentWallet.balance || 0) + studentAmount,
            total_earned: (studentWallet.total_earned || 0) + studentAmount,
          }).eq("id", studentWallet.id);
        } else {
          await supabase.from("student_wallet").insert({
            user_id: paper.author_id,
            balance: studentAmount,
            total_earned: studentAmount,
            currency: "NGN",
          });
        }
        await supabase.from("wallet_transactions").insert({
          user_id: paper.author_id,
          amount: studentAmount,
          currency: "NGN",
          transaction_type: "payment",
          description: `Research download earning (student share ${shares.download_student_share}%) - "${paper.title?.substring(0, 50)}"`,
          reference: downloadKey + "_student",
          status: "completed",
        });

        // --- SUPERVISOR SHARE ---
        if (paper.supervisor_id && supervisorAmount > 0) {
          const { data: supWallet } = await supabase
            .from("supervisor_wallet")
            .select("id, balance, total_earned")
            .eq("user_id", paper.supervisor_id)
            .maybeSingle();

          if (supWallet) {
            await supabase.from("supervisor_wallet").update({
              balance: (supWallet.balance || 0) + supervisorAmount,
              total_earned: (supWallet.total_earned || 0) + supervisorAmount,
            }).eq("id", supWallet.id);
          } else {
            await supabase.from("supervisor_wallet").insert({
              user_id: paper.supervisor_id,
              balance: supervisorAmount,
              total_earned: supervisorAmount,
              currency: "NGN",
            });
          }
          await supabase.from("wallet_transactions").insert({
            user_id: paper.supervisor_id,
            amount: supervisorAmount,
            currency: "NGN",
            transaction_type: "payment",
            description: `Research download earning (supervisor share ${shares.download_supervisor_share}%) - "${paper.title?.substring(0, 50)}"`,
            reference: downloadKey + "_supervisor",
            status: "completed",
          });
        }

        // --- INSTITUTION SHARE ---
        if (paper.institution_id && institutionAmount > 0) {
          const { data: instData } = await supabase
            .from("institutions")
            .select("id, available_balance, total_commission")
            .eq("id", paper.institution_id)
            .maybeSingle();

          if (instData) {
            await supabase.from("institutions").update({
              available_balance: (instData.available_balance || 0) + institutionAmount,
              total_commission: (instData.total_commission || 0) + institutionAmount,
            }).eq("id", instData.id);
          }

          await supabase.from("institution_commissions").insert({
            institution_id: paper.institution_id,
            researcher_id: paper.author_id,
            amount: institutionAmount,
            commission_rate: shares.download_institution_share,
            currency: "NGN",
            status: "completed",
          });
        }

        // --- PLATFORM SHARE (recorded as admin revenue in payment_history) ---
        if (platformAmount > 0) {
          await supabase.from("payment_history").insert({
            user_id: paper.author_id,
            amount: platformAmount,
            currency: "NGN",
            plan_name: "Download Revenue (Platform Share)",
            tier: "platform",
            reference: downloadKey + "_platform",
            status: "completed",
            payment_method: "system",
          });
        }

        // 4. Send email notifications
        try {
          const { data: downloaderProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", actualDownloaderId)
            .maybeSingle();

          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", paper.author_id)
            .maybeSingle();

          const zeptoApiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
          if (zeptoApiKey && downloaderProfile?.email && ownerProfile?.email) {
            // Email to downloader
            await fetch("https://api.zeptomail.com/v1.1/email", {
              method: "POST",
              headers: { "Authorization": zeptoApiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: { address: "noreply@r2pconnect.com", name: "R2P Connect" },
                to: [{ email_address: { address: downloaderProfile.email, name: downloaderProfile.full_name || "Researcher" } }],
                subject: `Download Confirmed - ${paper.title?.substring(0, 60)}`,
                htmlbody: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Download Confirmed</h2>
                    <p>Hi ${downloaderProfile.full_name || "there"},</p>
                    <p>You have successfully downloaded the research paper:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                      <p style="font-weight: bold; margin: 0;">${paper.title}</p>
                      <p style="color: #666; margin: 5px 0 0;">by ${ownerProfile.full_name || "Unknown Author"}</p>
                    </div>
                    <p><strong>${actualCreditCost} credit${actualCreditCost > 1 ? 's' : ''}</strong> were used for this download.</p>
                    <p style="color: #666; font-size: 13px;">Remember: You agreed to properly cite the author(s) and not republish this research elsewhere.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">R2P Connect - Research to Practice</p>
                  </div>
                `,
              }),
            });

            // Email to research owner
            await fetch("https://api.zeptomail.com/v1.1/email", {
              method: "POST",
              headers: { "Authorization": zeptoApiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: { address: "noreply@r2pconnect.com", name: "R2P Connect" },
                to: [{ email_address: { address: ownerProfile.email, name: ownerProfile.full_name || "Researcher" } }],
                subject: `Your Research Was Downloaded! 🎉`,
                htmlbody: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Someone Downloaded Your Research!</h2>
                    <p>Hi ${ownerProfile.full_name || "there"},</p>
                    <p>Great news! Your research paper has been downloaded:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                      <p style="font-weight: bold; margin: 0;">${paper.title}</p>
                    </div>
                    <p>You earned <strong>₦${studentAmount.toLocaleString()}</strong> from this download (${shares.download_student_share}% of ₦${ngnAmount.toLocaleString()}).</p>
                    <p>The earnings have been added to your wallet balance.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">R2P Connect - Research to Practice</p>
                  </div>
                `,
              }),
            });
          }
        } catch (emailError) {
          console.error("Failed to send download notification emails:", emailError);
        }
      }

      // Increment download count
      const { data: updatedPaper, error: updateError } = await supabase
        .from("research_papers")
        .update({ downloads_count: (paper.downloads_count || 0) + 1 })
        .eq("id", research_id)
        .select("downloads_count")
        .maybeSingle();

      if (!updateError && updatedPaper) {
        updated = true;
        newCount = updatedPaper.downloads_count;

        // For free downloads, still credit ₦1 to author
        if (actualCreditCost === 0 || isOwnPaper) {
          const dlKey = `download_${research_id}_${ip_address}_${Date.now()}`;
          const { data: wallet } = await supabase
            .from("student_wallet")
            .select("id, balance, total_earned")
            .eq("user_id", paper.author_id)
            .maybeSingle();

          if (wallet) {
            await supabase.from("student_wallet").update({
              balance: (wallet.balance || 0) + 1,
              total_earned: (wallet.total_earned || 0) + 1,
            }).eq("id", wallet.id);
          } else {
            await supabase.from("student_wallet").insert({
              user_id: paper.author_id,
              balance: 1,
              total_earned: 1,
              currency: "NGN",
            });
          }

          await supabase.from("wallet_transactions").insert({
            user_id: paper.author_id,
            amount: 1,
            currency: "NGN",
            transaction_type: "payment",
            description: "Research download earning",
            reference: dlKey,
            status: "completed",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, count: newCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Track research view error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
