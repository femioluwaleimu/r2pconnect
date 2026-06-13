import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupervisorFeedbackUploadProps {
  researchId: string;
  supervisorId: string;
  currentStatus: string;
  onUploadComplete?: () => void;
}

export default function SupervisorFeedbackUpload({
  researchId,
  supervisorId,
  currentStatus,
  onUploadComplete,
}: SupervisorFeedbackUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Only allow upload when status is under_review, pending, or revision_requested
  const canUpload = ["pending", "under_review", "revision_requested"].includes(currentStatus);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Get the next version number
      const { data: existingUploads, error: fetchError } = await supabase
        .from("supervisor_feedback_uploads")
        .select("version_number")
        .eq("research_id", researchId)
        .order("version_number", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextVersion = existingUploads && existingUploads.length > 0 
        ? existingUploads[0].version_number + 1 
        : 1;

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${researchId}/supervisor_feedback_v${nextVersion}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("research-papers")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from("research-papers")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = signedUrlData?.signedUrl || fileName;

      // Insert feedback upload record
      const { error: insertError } = await supabase
        .from("supervisor_feedback_uploads")
        .insert({
          research_id: researchId,
          supervisor_id: supervisorId,
          file_url: fileUrl,
          file_name: file.name,
          file_type: "annotated",
          version_number: nextVersion,
          review_stage: currentStatus,
          comments: comments || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Feedback Uploaded",
        description: `Annotated version ${nextVersion} has been uploaded successfully`,
      });

      setFile(null);
      setComments("");
      onUploadComplete?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!canUpload) {
    return null;
  }

  return (
    <Card className="rounded-2xl border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Upload Annotated Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload an annotated version of the student's research with your feedback. 
          This will be available as a reference document for the student.
        </p>

        {/* File Input */}
        <div className="space-y-2">
          <Label>Annotated Document</Label>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm flex-1 truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="feedback-file-input"
              />
              <label
                htmlFor="feedback-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select annotated document
                </span>
                <span className="text-xs text-muted-foreground/70">
                  PDF, DOC, DOCX (max 10MB)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label>Additional Notes (Optional)</Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add any notes about the annotations..."
            rows={3}
            className="rounded-xl"
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full rounded-xl"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Annotated Version
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Note: This file is for reference only. The student must submit their own revised version.
        </p>
      </CardContent>
    </Card>
  );
}
