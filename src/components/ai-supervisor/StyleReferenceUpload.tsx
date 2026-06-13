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
import {
  Upload,
  FileText,
  Trash2,
  Shield,
  AlertTriangle,
  BookOpen,
  Loader2,
  Check,
} from "lucide-react";

interface StyleReference {
  id: string;
  file_name: string;
  file_size: number | null;
  source_description: string | null;
  created_at: string;
}

interface StyleReferenceUploadProps {
  onStyleSourceChange?: (source: "institution" | "student") => void;
  hasInstitutionStyle?: boolean;
  currentSource?: "institution" | "student";
}

const MAX_REFERENCES = 5;

export default function StyleReferenceUpload({
  onStyleSourceChange,
  hasInstitutionStyle = false,
  currentSource = "institution",
}: StyleReferenceUploadProps) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [sourceDescription, setSourceDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("student_style_references")
        .select("*")
        .eq("user_id", user.id)
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
      toast({
        title: "Invalid file type",
        description: "Please upload PDF or Word documents only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setNewFile(file);
  };

  const handleUpload = async () => {
    if (!newFile || !declarationAccepted) {
      toast({
        title: "Declaration required",
        description: "Please accept the declaration before uploading",
        variant: "destructive",
      });
      return;
    }

    if (references.length >= MAX_REFERENCES) {
      toast({
        title: "Maximum reached",
        description: `You can only upload up to ${MAX_REFERENCES} style references`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save metadata only (not the actual file content for privacy)
      const { error } = await supabase
        .from("student_style_references")
        .insert({
          user_id: user.id,
          file_name: newFile.name,
          file_size: newFile.size,
          source_description: sourceDescription || null,
          declaration_accepted: true,
        });

      if (error) throw error;

      toast({
        title: "Reference added",
        description: "Style reference metadata has been saved",
      });

      setNewFile(null);
      setSourceDescription("");
      setDeclarationAccepted(false);
      fetchReferences();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_style_references")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Reference removed" });
      fetchReferences();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Style Reference</CardTitle>
            <CardDescription>
              Upload approved past research for pattern learning
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Style Source Selection */}
        {hasInstitutionStyle && (
          <div className="flex gap-3">
            <Button
              variant={currentSource === "institution" ? "default" : "outline"}
              size="sm"
              onClick={() => onStyleSourceChange?.("institution")}
              className="flex-1"
            >
              <Shield className="w-4 h-4 mr-2" />
              Institution Style
            </Button>
            <Button
              variant={currentSource === "student" ? "default" : "outline"}
              size="sm"
              onClick={() => onStyleSourceChange?.("student")}
              className="flex-1"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Student Style
            </Button>
          </div>
        )}

        {/* Privacy Notice */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Privacy:</strong> Only metadata is stored. Raw text is NOT saved. 
            Content is NOT reused across users. Not visible to institutions or industry.
          </AlertDescription>
        </Alert>

        {/* Existing References */}
        {references.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Your References ({references.length}/{MAX_REFERENCES})
            </Label>
            <div className="space-y-2">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{ref.file_name}</p>
                      {ref.source_description && (
                        <p className="text-xs text-muted-foreground">
                          {ref.source_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ref.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload New Reference */}
        {references.length < MAX_REFERENCES && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Style Reference</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
              </div>
              {newFile && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  {newFile.name}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Source Description (optional)</Label>
              <Input
                placeholder="e.g., Published thesis from university repository"
                value={sourceDescription}
                onChange={(e) => setSourceDescription(e.target.value)}
              />
            </div>

            {/* Declaration Checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Checkbox
                id="declaration"
                checked={declarationAccepted}
                onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="declaration" className="text-sm leading-relaxed cursor-pointer">
                I confirm this is a <strong>public, approved academic work</strong> used solely 
                for pattern learning (structure, formatting, citation style). I understand 
                that raw text will NOT be stored and content will NOT be reused.
              </Label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!newFile || !declarationAccepted || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Reference
                </>
              )}
            </Button>
          </div>
        )}

        {references.length >= MAX_REFERENCES && (
          <p className="text-sm text-muted-foreground text-center">
            Maximum {MAX_REFERENCES} references reached. Remove one to add another.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
