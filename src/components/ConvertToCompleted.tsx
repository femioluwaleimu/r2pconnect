import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Globe, Loader2, CheckCircle, DollarSign, AlertCircle } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

interface ConvertToCompletedProps {
  researchId: string;
  title: string;
  abstract: string | null;
  supervisorApprovalStatus: string | null;
  onConversionComplete?: () => void;
}

export default function ConvertToCompleted({
  researchId,
  title,
  abstract,
  supervisorApprovalStatus,
  onConversionComplete,
}: ConvertToCompletedProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [yearCompleted, setYearCompleted] = useState(new Date().getFullYear());
  const [additionalNotes, setAdditionalNotes] = useState("");
  const { toast } = useToast();
  const { currency } = useCurrency();

  const isApproved = supervisorApprovalStatus === "approved";

  const handleConvert = async () => {
    setLoading(true);
    try {
      // First, get the current paper to check supervisor_id
      const { data: paper, error: fetchError } = await supabase
        .from("research_papers")
        .select("supervisor_id, institution_id, author_id")
        .eq("id", researchId)
        .single();

      if (fetchError) throw fetchError;

      // If no institution_id, try to get it from the supervisor or user's profile
      let institutionId = paper.institution_id;
      
      if (!institutionId && paper.supervisor_id) {
        // Get institution from supervisor
        const { data: supervisor } = await supabase
          .from("supervisors")
          .select("institution_id")
          .eq("user_id", paper.supervisor_id)
          .maybeSingle();
        
        if (supervisor?.institution_id) {
          institutionId = supervisor.institution_id;
        }
      }
      
      if (!institutionId) {
        // Get institution from author's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("institution_id")
          .eq("user_id", paper.author_id)
          .maybeSingle();
        
        if (profile?.institution_id) {
          institutionId = profile.institution_id;
        }
      }

      // Update the paper with all required fields for institution review
      const { error } = await supabase
        .from("research_papers")
        .update({
          research_type: "completed",
          research_stage: "completed",
          status: "under_review",
          year_completed: yearCompleted,
          institution_id: institutionId,
          supervisor_approval_status: "approved",
        })
        .eq("id", researchId);

      if (error) throw error;

      toast({
        title: "Research Converted!",
        description: "Your research has been submitted for reviewer approval and will be visible to industry once approved.",
      });

      setOpen(false);
      onConversionComplete?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isApproved) {
    return (
      <Card className="rounded-2xl border-dashed border-muted-foreground/30 bg-muted/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Conversion Not Available</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Your research must be approved by your supervisor before it can be converted to completed research.
              </p>
              <Badge variant="secondary" className="mt-2">
                Status: {supervisorApprovalStatus || "Pending"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Ready for Publication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your supervisor has approved your research. You can now convert it to completed research to:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Make it publicly visible</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Enable monetization</span>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            Convert to Completed Research
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Convert to Completed Research</DialogTitle>
            <DialogDescription>
              This will submit your research for reviewer approval. Once approved, it will be visible to industry partners and eligible for monetization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Research Title</Label>
              <p className="text-sm text-foreground mt-1 p-3 bg-muted rounded-xl">{title}</p>
            </div>

            <div>
              <Label htmlFor="yearCompleted" className="text-sm font-medium">
                Year Completed
              </Label>
              <Input
                id="yearCompleted"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={yearCompleted}
                onChange={(e) => setYearCompleted(parseInt(e.target.value) || new Date().getFullYear())}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any additional information for reviewers..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Please note:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-amber-700 dark:text-amber-300">
                    <li>This action cannot be undone</li>
                    <li>Your supervisor will no longer have oversight</li>
                    <li>A reviewer will evaluate your research before publication</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Convert & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
