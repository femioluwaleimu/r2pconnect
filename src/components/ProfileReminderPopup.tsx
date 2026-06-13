import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, AlertCircle } from "lucide-react";

interface ProfileReminderPopupProps {
  role: "researcher" | "industry";
}

export default function ProfileReminderPopup({ role }: ProfileReminderPopupProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfileCompletion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio, avatar_url, phone_number")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return;

      // Check if profile is incomplete
      const isIncomplete = 
        !profile.full_name?.trim() ||
        !profile.bio?.trim() ||
        !profile.phone_number?.trim();

      // Check if we've shown the popup in this session
      const popupKey = `profile_reminder_shown_${user.id}`;
      const alreadyShown = sessionStorage.getItem(popupKey);

      if (isIncomplete && !alreadyShown) {
        setOpen(true);
        sessionStorage.setItem(popupKey, "true");
      }
    };

    // Delay check to allow page to load
    const timer = setTimeout(checkProfileCompletion, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToProfile = () => {
    setOpen(false);
    navigate(role === "industry" ? "/industry/profile" : "/dashboard/profile");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Your profile is incomplete. A complete profile helps you get discovered by {role === "industry" ? "researchers" : "industry partners"} and build trust.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Missing information:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Profile photo</li>
                <li>Bio / Description</li>
                <li>Contact information</li>
              </ul>
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Later
            </Button>
            <Button onClick={handleGoToProfile} className="rounded-xl gradient-hero">
              <User className="w-4 h-4 mr-2" />
              Go to Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
