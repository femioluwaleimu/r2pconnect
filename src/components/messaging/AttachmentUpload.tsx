import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileIcon, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AttachmentUploadProps {
  userId: string;
  onAttachmentSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function AttachmentUpload({
  userId,
  onAttachmentSelect,
  selectedFile,
  disabled = false,
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    onAttachmentSelect(file);
  };

  const handleRemoveFile = () => {
    onAttachmentSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isImage = selectedFile?.type.startsWith("image/");

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        disabled={disabled}
      />
      
      {selectedFile ? (
        <div className="flex items-center gap-1 px-2 py-1 bg-accent rounded-lg text-xs">
          {isImage ? (
            <ImageIcon className="w-3 h-3" />
          ) : (
            <FileIcon className="w-3 h-3" />
          )}
          <span className="truncate max-w-[100px]">{selectedFile.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={handleRemoveFile}
            disabled={disabled}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl h-9 w-9 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export async function uploadAttachment(
  userId: string,
  file: File
): Promise<{ url: string; name: string; type: string } | null> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("message-attachments")
    .upload(fileName, file);

  if (error) {
    console.error("Upload error:", error);
    throw error;
  }

  return {
    url: data.path,
    name: file.name,
    type: file.type,
  };
}
