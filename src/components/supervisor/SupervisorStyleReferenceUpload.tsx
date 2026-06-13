import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, AlertTriangle, BookOpen, Loader2 } from "lucide-react";

interface StyleReference {
  id: string;
  file_name: string;
  file_size: number | null;
  source_description: string | null;
  created_at: string;
}

interface SupervisorStyleReferenceUploadProps {
  supervisorId: string;
  studentId: string;
  studentName: string;
}

const MAX_REFERENCES = 5;

export default function SupervisorStyleReferenceUpload({
  supervisorId,
  studentId,
  studentName,
}: SupervisorStyleReferenceUploadProps) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [sourceDescription, setSourceDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReferences();
  }, [supervisorId, studentId]);

  const fetchReferences = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisor_style_references")
        .select("*")
        .eq("supervisor_id", supervisorId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferences((data as StyleReference[]) || []);
    } catch (error: any) {
      console.error("Error fetching references:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF or Word documents only", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    setNewFile(file);
  };

  const handleUpload = async () => {
    if (!newFile || !declarationAccepted) {
      toast({ title: "Declaration required", description: "Please accept the declaration before uploading", variant: "destructive" });
      return;
    }
    if (references.length >= MAX_REFERENCES) {
      toast({ title: "Maximum reached", description: `You can only upload up to ${MAX_REFERENCES} style references`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from("supervisor_style_references")
        .insert({
          supervisor_id: supervisorId,
          student_id: studentId,
          file_name: newFile.name,
          file_size: newFile.size,
          source_description: sourceDescription || null,
          declaration_accepted: true,
        });

      if (error) throw error;

      toast({ title: "Reference added", description: `Style reference added for ${studentName}` });
      setNewFile(null);
      setSourceDescription("");
      setDeclarationAccepted(false);
      fetchReferences();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("supervisor_style_references").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Reference removed" });
      fetchReferences();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card className="rounded-2xl border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <BookOpen className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Style References for {studentName}</CardTitle>
            <CardDescription>Upload approved academic works as style references for this student's AI guidance</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Privacy:</strong> Only metadata is stored. Raw text is NOT saved. Content is NOT reused across users.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {references.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">References ({references.length}/{MAX_REFERENCES})</Label>
                {references.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{ref.file_name}</p>
                        {ref.source_description && <p className="text-xs text-muted-foreground">{ref.source_description}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(ref.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {references.length < MAX_REFERENCES && (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add Style Reference</Label>
                  <Input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} />
                  {newFile && (
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      {newFile.name}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Source Description (optional)</Label>
                  <Input placeholder="e.g., Published thesis from university repository" value={sourceDescription} onChange={(e) => setSourceDescription(e.target.value)} />
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <Checkbox id="sup-declaration" checked={declarationAccepted} onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)} className="mt-1" />
                  <Label htmlFor="sup-declaration" className="text-sm leading-relaxed cursor-pointer">
                    I confirm this is a <strong>public, approved academic work</strong> used solely for pattern learning. Raw text will NOT be stored.
                  </Label>
                </div>
                <Button onClick={handleUpload} disabled={!newFile || !declarationAccepted || uploading} className="w-full">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Upload className="w-4 h-4 mr-2" />Add Reference</>}
                </Button>
              </div>
            )}

            {references.length >= MAX_REFERENCES && (
              <p className="text-sm text-muted-foreground text-center">Maximum {MAX_REFERENCES} references reached.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
