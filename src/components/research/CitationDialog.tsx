import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CitationDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  paper: {
    title: string;
    author_names?: string[] | null;
    year_completed?: number | null;
    published_at?: string | null;
    institutionName?: string | null;
    id: string;
  };
}

function authorsString(names?: string[] | null) {
  if (!names || names.length === 0) return "Anonymous";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

export default function CitationDialog({ open, onOpenChange, paper }: CitationDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const year =
    paper.year_completed ??
    (paper.published_at ? new Date(paper.published_at).getFullYear() : new Date().getFullYear());
  const authors = authorsString(paper.author_names);
  const inst = paper.institutionName || "R2PConnect";
  const url = `https://r2pconnect.com/research/${paper.id}`;

  const formats: Record<string, string> = {
    APA: `${authors} (${year}). ${paper.title}. ${inst}. Retrieved from ${url}`,
    MLA: `${authors}. "${paper.title}." ${inst}, ${year}, ${url}.`,
    Chicago: `${authors}. "${paper.title}." ${inst}, ${year}. ${url}.`,
    Harvard: `${authors} (${year}) '${paper.title}', ${inst}. Available at: ${url}`,
    BibTeX: `@article{r2p${paper.id.slice(0, 8)},\n  title={${paper.title}},\n  author={${authors}},\n  year={${year}},\n  institution={${inst}},\n  url={${url}}\n}`,
  };

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copied", description: `${label} citation copied to clipboard.` });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cite this research</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="APA">
          <TabsList className="grid grid-cols-5 w-full">
            {Object.keys(formats).map((k) => (
              <TabsTrigger key={k} value={k} className="text-xs">
                {k}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(formats).map(([k, v]) => (
            <TabsContent key={k} value={k} className="mt-4">
              <pre className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap break-words font-mono max-h-64 overflow-auto">
                {v}
              </pre>
              <Button onClick={() => copy(k, v)} className="mt-3 w-full" size="sm">
                {copied === k ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === k ? "Copied" : `Copy ${k}`}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
