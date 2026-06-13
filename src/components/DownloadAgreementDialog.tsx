import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Download, Loader2, Zap, ShieldCheck, FileText } from "lucide-react";
import { getEdgeFunctionError } from "@/lib/edgeFunctionError";

interface DownloadAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paper: {
    id: string;
    title: string;
    file_url: string | null;
    download_credit_cost?: number;
    author_id: string;
  };
  authorName: string | null;
  onDownloaded?: () => void;
}

export default function DownloadAgreementDialog({
  open,
  onOpenChange,
  paper,
  authorName,
  onDownloaded,
}: DownloadAgreementDialogProps) {
  const [acknowledgeOwner, setAcknowledgeOwner] = useState(false);
  const [noRepublish, setNoRepublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const creditCost = paper.download_credit_cost || 0;
  const isFree = creditCost === 0;
  const isMobile = useIsMobile();

  const handleDownload = async () => {
    if (!acknowledgeOwner || !noRepublish) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to download", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Call the edge function which handles everything server-side
      const { data, error } = await supabase.functions.invoke('track-research-view', {
        body: {
          research_id: paper.id,
          action: 'download',
          credit_cost: creditCost,
          downloader_id: user.id,
        }
      });

      if (error) {
        let msg = getEdgeFunctionError(error, "Download failed");
        // The API may include the raw Response on error.context; read it for the real reason.
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.clone().json();
            if (body?.error) msg = body.error;
            else if (body?.message) msg = body.message;
          }
        } catch { /* ignore parse errors */ }
        toast({ title: "Download failed", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast({ title: "Download failed", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Proceed with actual file download
      window.open(paper.file_url!, '_blank');
      onOpenChange(false);
      setAcknowledgeOwner(false);
      setNoRepublish(false);
      onDownloaded?.();
      toast({
        title: "Download started",
        description: isFree
          ? "Paper download initiated."
          : `${creditCost} credit${creditCost > 1 ? 's' : ''} used for this download.`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="space-y-4 overflow-hidden">
      <div className="p-3 rounded-xl bg-muted overflow-hidden">
        <p className="font-medium text-sm line-clamp-2 break-words">{paper.title}</p>
        {authorName && <p className="text-xs text-muted-foreground mt-1 truncate">by {authorName}</p>}
      </div>

      {!isFree && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 border border-border">
          <Zap className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {creditCost} Credit{creditCost > 1 ? 's' : ''} Required
            </p>
            <p className="text-xs text-muted-foreground">
              Credits will be deducted from your balance
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Download Agreement
        </p>

        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={acknowledgeOwner}
            onCheckedChange={(checked) => setAcknowledgeOwner(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            I agree to properly acknowledge and cite the author(s) if this research is referenced or used in any paper, publication, or work.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={noRepublish}
            onCheckedChange={(checked) => setNoRepublish(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            I agree not to republish, redistribute, or claim ownership of this research paper elsewhere.
          </span>
        </label>
      </div>
    </div>
  );

  const actions = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl w-full sm:w-auto">
        Cancel
      </Button>
      <Button
        onClick={handleDownload}
        disabled={!acknowledgeOwner || !noRepublish || loading}
        className="rounded-xl gradient-hero text-white w-full sm:w-auto"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isFree ? 'Download' : `Download (${creditCost} Credits)`}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Download Research Paper
            </DrawerTitle>
          </DrawerHeader>
          {content}
          <DrawerFooter className="flex-col gap-2 pt-4">
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Download Research Paper
          </DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter className="gap-2 sm:gap-0">
          {actions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
