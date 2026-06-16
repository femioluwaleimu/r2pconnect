import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileIcon, ImageIcon, Download, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageAttachmentProps {
  attachmentUrl: string;
  attachmentName: string;
  attachmentType: string;
  isSender?: boolean;
}

export function MessageAttachment({
  attachmentUrl,
  attachmentName,
  attachmentType,
  isSender = false,
}: MessageAttachmentProps) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const isImage = attachmentType?.startsWith("image/");
  
  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("message-attachments")
        .download(attachmentUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachmentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: error.message || "Could not download file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewImage = async () => {
    if (imageUrl) return;
    
    try {
      const { data } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(attachmentUrl, 3600);

      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
      }
    } catch (error) {
      console.error("Error getting signed URL:", error);
    }
  };

  useEffect(() => {
    setImageUrl(null);
  }, [attachmentUrl]);

  useEffect(() => {
    if (isImage && !imageUrl) {
      handleViewImage();
    }
  }, [isImage, imageUrl, attachmentUrl]);

  return (
    <div className="mt-2">
      {isImage ? (
        <div className="rounded-lg overflow-hidden max-w-[200px]">
          {imageUrl ? (
            <a href={imageUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={imageUrl}
                alt={attachmentName}
                className="w-full h-auto object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              />
            </a>
          ) : (
            <div className="w-full h-32 bg-muted/50 animate-pulse rounded-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="text-[10px] opacity-70 mt-1 truncate">{attachmentName}</p>
        </div>
      ) : (
        <button
          onClick={handleDownload}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            isSender
              ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
              : "bg-background/50 hover:bg-background/80"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileIcon className="w-4 h-4" />
          )}
          <span className="text-xs truncate max-w-[120px]">{attachmentName}</span>
          <Download className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
