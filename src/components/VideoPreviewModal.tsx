import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { YouTubePlayer } from "@/components/YouTubePlayer";

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export function VideoPreviewModal({ isOpen, onClose, videoUrl, title }: VideoPreviewModalProps) {
  // Check if it's a YouTube video
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  
  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const youtubeId = isYouTube ? getYouTubeId(videoUrl) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black rounded-2xl overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          
          {/* Video title */}
          <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1.5 rounded-lg">
            <p className="text-white text-sm font-medium line-clamp-1">{title}</p>
          </div>
          
          {/* Video player */}
          <div className="aspect-video w-full">
            {isYouTube && youtubeId ? (
              <YouTubePlayer videoId={youtubeId} className="w-full h-full" />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
