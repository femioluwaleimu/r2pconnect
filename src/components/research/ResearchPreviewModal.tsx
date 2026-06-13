import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Sparkles, FileText, Film, Banknote } from "lucide-react";
import type { PublicPaper } from "./ResearchResultCard";

interface Props {
  paper: PublicPaper | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{title}</h4>
      <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export default function ResearchPreviewModal({ paper, open, onOpenChange }: Props) {
  if (!paper) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-xl leading-tight pr-8">{paper.title}</DialogTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {paper.research_field && <Badge variant="secondary" className="rounded-full text-xs">{paper.research_field}</Badge>}
            {paper.research_level && <Badge variant="outline" className="rounded-full text-xs">{paper.research_level}</Badge>}
            {paper.research_stage && <Badge variant="outline" className="rounded-full text-xs">{paper.research_stage}</Badge>}
            {paper.sdg_category && (
              <Badge className="rounded-full text-xs bg-emerald-500/15 text-emerald-700 border-0">SDG · {paper.sdg_category}</Badge>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 py-5 space-y-5">
            {paper.ai_summary && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-center gap-2 mb-2 text-violet-700 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" /> AI Simplified Summary
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{paper.ai_summary}</p>
              </div>
            )}
            <Section title="Abstract">{paper.abstract || "No abstract provided."}</Section>
            {paper.author_names && (
              <Section title="Authors">
                <Link to={`/researcher/${paper.author_id}`} className="text-primary hover:underline">
                  {paper.author_names.join(", ")}
                </Link>
              </Section>
            )}
            {paper.institutionName && <Section title="Institution">{paper.institutionName}</Section>}
            {paper.supervisorName && <Section title="Supervisor">{paper.supervisorName}</Section>}
            {paper.keywords && paper.keywords.length > 0 && (
              <Section title="Keywords">
                <div className="flex flex-wrap gap-1.5">
                  {paper.keywords.map((k, i) => (
                    <Badge key={i} variant="secondary" className="rounded-full text-xs">{k}</Badge>
                  ))}
                </div>
              </Section>
            )}
            {paper.file_url && (
              <Section title="File availability">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {(!paper.download_credit_cost || paper.download_credit_cost === 0)
                    ? "Free download available"
                    : `Paid download (${paper.download_credit_cost} credits)`}
                </span>
              </Section>
            )}
            {(paper.funding_status === "needed" || (paper.funding_required ?? 0) > 0) && (
              <Section title="Funding">
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <Banknote className="w-4 h-4" />
                  Researcher is seeking funding{paper.funding_required ? ` (₦${paper.funding_required.toLocaleString()})` : ""}
                </span>
              </Section>
            )}
          </div>
        </ScrollArea>
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Link to={`/research/${paper.id}`}>
            <Button>View full details <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
