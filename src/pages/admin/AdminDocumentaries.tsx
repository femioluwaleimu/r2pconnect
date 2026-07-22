import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, Plus, Search, Trash2, Eye, Upload, User, Edit, Building2, Image, X, Link, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoPreviewModal } from "@/components/VideoPreviewModal";
import { getSignedUrl, isFullUrl } from "@/hooks/useSignedUrl";
import { formatLagos } from "@/lib/dateUtils";
import { createAppNotification } from "@/lib/notifications";

interface Documentary {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  researcher_id: string | null;
  researcher?: { full_name: string };
}

interface Institution {
  id: string;
  name: string;
}

interface Researcher {
  user_id: string;
  full_name: string;
  institution_id: string | null;
}

export default function AdminDocumentaries() {
  const [documentaries, setDocumentaries] = useState<Documentary[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [filteredResearchers, setFilteredResearchers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Documentary | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [researcherSearch, setResearcherSearch] = useState("");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [listFilterInstitution, setListFilterInstitution] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    researcher_id: "",
  });
  const [videoType, setVideoType] = useState<"file" | "youtube">("file");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Documentary | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>("");
  const [signedThumbnails, setSignedThumbnails] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchDocumentaries();
    fetchInstitutions();
    fetchResearchers();
  }, []);

  useEffect(() => {
    let filtered = researchers;
    
    if (selectedInstitution) {
      filtered = filtered.filter(r => r.institution_id === selectedInstitution);
    }
    
    if (researcherSearch) {
      filtered = filtered.filter(r => 
        r.full_name?.toLowerCase().includes(researcherSearch.toLowerCase())
      );
    }
    
    setFilteredResearchers(filtered);
  }, [selectedInstitution, researchers, researcherSearch]);

  const fetchDocumentaries = async () => {
    try {
      const { data, error } = await supabase
        .from('documentaries')
        .select('*, researcher:profiles!documentaries_researcher_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentaries(data || []);
    } catch (error) {
      console.error('Error fetching documentaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .eq('is_verified', true)
        .order('name');

      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const fetchResearchers = async () => {
    try {
      // Fetch only researchers by joining with user_roles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          institution_id
        `)
        .order('full_name');

      if (error) throw error;
      
      // Filter to only include researchers by checking user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'researcher');
      
      if (rolesError) throw rolesError;
      
      const researcherIds = new Set(rolesData?.map(r => r.user_id) || []);
      const researchersOnly = (data || []).filter(p => researcherIds.has(p.user_id));
      
      setResearchers(researchersOnly);
      setFilteredResearchers(researchersOnly);
    } catch (error) {
      console.error('Error fetching researchers:', error);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getYouTubeThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum thumbnail size is 5MB", variant: "destructive" });
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const sendResearcherTagNotification = async (researcherId: string, documentaryTitle: string) => {
    try {
      // Get researcher email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', researcherId)
        .single();

      if (profileError || !profile?.email) {
        console.error('Could not find researcher email');
        return;
      }

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'documentary_tagged',
          to: profile.email,
          data: {
            name: profile.full_name,
            documentaryTitle,
          }
        }
      });

      if (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      // Create in-app notification
      await createAppNotification({
        userId: researcherId,
        title: 'You were tagged in a documentary!',
        message: `You have been featured in the documentary "${documentaryTitle}".`,
        type: 'success',
        link: '/dashboard/documentaries'
      });

    } catch (error) {
      console.error('Error sending researcher notification:', error);
    }
  };

  const handleUpload = async () => {
    if (!formData.title) {
      toast({ title: "Please fill in the title", variant: "destructive" });
      return;
    }

    if (videoType === "file" && !videoFile) {
      toast({ title: "Please select a video file", variant: "destructive" });
      return;
    }

    if (videoType === "youtube" && !youtubeUrl) {
      toast({ title: "Please enter a YouTube URL", variant: "destructive" });
      return;
    }

    if (videoType === "youtube") {
      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) {
        toast({ title: "Invalid YouTube URL", description: "Please enter a valid YouTube video URL", variant: "destructive" });
        return;
      }
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let videoUrl = "";
      let thumbnailUrl = null;

      if (videoType === "file" && videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        // Use UUID for secure, non-predictable file names
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('documentaries')
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        // Store the file path, not public URL (bucket is now private)
        videoUrl = fileName;
      } else {
        const videoId = extractYouTubeId(youtubeUrl);
        videoUrl = `https://www.youtube.com/embed/${videoId}`;
        
        // Use YouTube thumbnail if no custom thumbnail uploaded
        if (!thumbnailFile) {
          thumbnailUrl = getYouTubeThumbnail(videoId!);
        }
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop();
        // Use UUID for secure, non-predictable file names
        const thumbName = `thumb_${crypto.randomUUID()}.${thumbExt}`;
        const { error: thumbError } = await supabase.storage
          .from('documentaries')
          .upload(thumbName, thumbnailFile);

        if (thumbError) throw thumbError;

        // Store the file path, not public URL (bucket is now private)
        thumbnailUrl = thumbName;
      }

      const { error: insertError } = await supabase.from('documentaries').insert({
        title: formData.title,
        description: formData.description,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        researcher_id: formData.researcher_id || null,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      // Send notification if researcher is tagged
      if (formData.researcher_id) {
        await sendResearcherTagNotification(formData.researcher_id, formData.title);
      }

      toast({ title: "Documentary uploaded successfully" });
      setDialogOpen(false);
      resetForm();
      fetchDocumentaries();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDoc || !formData.title) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let thumbnailUrl = editingDoc.thumbnail_url;

      // Upload new thumbnail if provided
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop();
        // Use UUID for secure, non-predictable file names
        const thumbName = `thumb_${crypto.randomUUID()}.${thumbExt}`;
        const { error: thumbError } = await supabase.storage
          .from('documentaries')
          .upload(thumbName, thumbnailFile);

        if (thumbError) throw thumbError;

        // Store the file path, not public URL (bucket is now private)
        thumbnailUrl = thumbName;
      }

      const wasTagged = editingDoc.researcher_id !== formData.researcher_id && formData.researcher_id;

      const { error } = await supabase
        .from('documentaries')
        .update({
          title: formData.title,
          description: formData.description,
          researcher_id: formData.researcher_id || null,
          thumbnail_url: thumbnailUrl,
        })
        .eq('id', editingDoc.id);

      if (error) throw error;

      // Send notification if a new researcher was tagged
      if (wasTagged) {
        await sendResearcherTagNotification(formData.researcher_id, formData.title);
      }

      toast({ title: "Documentary updated successfully" });
      setEditDialogOpen(false);
      setEditingDoc(null);
      resetForm();
      fetchDocumentaries();
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this documentary?")) return;

    try {
      const { error } = await supabase.from('documentaries').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Documentary deleted" });
      fetchDocumentaries();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", researcher_id: "" });
    setSelectedInstitution("");
    setResearcherSearch("");
    setVideoFile(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setVideoType("file");
    setYoutubeUrl("");
  };

  const openEditDialog = (doc: Documentary) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      description: doc.description || "",
      researcher_id: doc.researcher_id || "",
    });
    setThumbnailPreview(doc.thumbnail_url);
    setEditDialogOpen(true);
  };

  const openVideoPreview = async (doc: Documentary) => {
    setPreviewDoc(doc);
    
    // Generate signed URL for video if it's a storage path
    if (doc.video_url && !isFullUrl(doc.video_url)) {
      const signedUrl = await getSignedUrl('documentaries', doc.video_url);
      setPreviewVideoUrl(signedUrl || doc.video_url);
    } else {
      setPreviewVideoUrl(doc.video_url);
    }
    
    setVideoPreviewOpen(true);
  };
  
  // Generate signed URLs for thumbnails
  const getThumbnailUrl = async (path: string | null): Promise<string | null> => {
    if (!path) return null;
    if (isFullUrl(path)) return path; // YouTube thumbnails, etc.
    
    // Check cache first
    if (signedThumbnails[path]) return signedThumbnails[path];
    
    const signedUrl = await getSignedUrl('documentaries', path);
    if (signedUrl) {
      setSignedThumbnails(prev => ({ ...prev, [path]: signedUrl }));
    }
    return signedUrl;
  };
  
  // Load signed URLs for all thumbnails
  useEffect(() => {
    const loadThumbnails = async () => {
      for (const doc of documentaries) {
        if (doc.thumbnail_url && !isFullUrl(doc.thumbnail_url) && !signedThumbnails[doc.thumbnail_url]) {
          const signedUrl = await getSignedUrl('documentaries', doc.thumbnail_url);
          if (signedUrl) {
            setSignedThumbnails(prev => ({ ...prev, [doc.thumbnail_url!]: signedUrl }));
          }
        }
      }
    };
    
    if (documentaries.length > 0) {
      loadThumbnails();
    }
  }, [documentaries]);

  // Filter documentaries for display
  const filteredDocumentaries = documentaries.filter(doc => {
    const matchesSearch = !listSearchQuery || 
      doc.title.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
      doc.researcher?.full_name?.toLowerCase().includes(listSearchQuery.toLowerCase());
    
    // For institution filter, we'd need to join with researcher's institution
    // For now, just filter by search
    return matchesSearch;
  });

  const renderFormContent = (onSubmit: () => void, buttonText: string, showFileInput: boolean) => (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="form-title">Title *</Label>
        <Input
          id="form-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Documentary title"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-description">Description</Label>
        <Textarea
          id="form-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description..."
          className="rounded-xl"
        />
      </div>

      {/* Thumbnail Upload */}
      <div className="space-y-2">
        <Label>Thumbnail Image</Label>
        <div className="flex items-start gap-4">
          {thumbnailPreview ? (
            <div className="relative">
              <img 
                src={thumbnailPreview} 
                alt="Thumbnail" 
                className="w-32 h-20 object-cover rounded-xl border border-border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                onClick={removeThumbnail}
                type="button"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="w-32 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
              <Image className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => thumbnailInputRef.current?.click()}
              className="rounded-xl"
              type="button"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Thumbnail
            </Button>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Video Source Selection */}
      {showFileInput && (
        <div className="space-y-3">
          <Label>Video Source *</Label>
          <RadioGroup value={videoType} onValueChange={(v: "file" | "youtube") => setVideoType(v)} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="file" id="video-file" />
              <Label htmlFor="video-file" className="cursor-pointer">Upload MP4</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="youtube" id="video-youtube" />
              <Label htmlFor="video-youtube" className="cursor-pointer">YouTube Link</Label>
            </div>
          </RadioGroup>

          {videoType === "file" ? (
            <div className="space-y-2">
              <Input
                type="file"
                accept="video/mp4,video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="rounded-xl"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="youtube-url-input"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="rounded-xl pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Paste any YouTube video URL</p>
            </div>
          )}
        </div>
      )}

      {/* Filter by Institution for Researcher */}
      <div className="space-y-2">
        <Label>Filter Researchers by Institution</Label>
        <Select value={selectedInstitution || "all"} onValueChange={(val) => setSelectedInstitution(val === "all" ? "" : val)}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="All institutions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All institutions</SelectItem>
            {institutions.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Researcher Search and Select */}
      <div className="space-y-2">
        <Label htmlFor="researcher-search">Tag Researcher</Label>
        <Input
          id="researcher-search"
          placeholder="Search researchers..."
          value={researcherSearch}
          onChange={(e) => setResearcherSearch(e.target.value)}
          className="rounded-xl mb-2"
        />
        <Select
          value={formData.researcher_id || "none"}
          onValueChange={(value) => setFormData(prev => ({ ...prev, researcher_id: value === "none" ? "" : value }))}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select a researcher" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="none">No researcher</SelectItem>
            {filteredResearchers.map((r) => (
              <SelectItem key={r.user_id} value={r.user_id}>
                {r.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Only researchers are shown</p>
      </div>

      <Button
        onClick={onSubmit}
        disabled={uploading}
        className="w-full rounded-xl"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {showFileInput ? "Uploading..." : "Updating..."}
          </>
        ) : buttonText}
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentary Management</h1>
            <p className="text-muted-foreground">Upload and manage research documentaries</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-red-500 hover:bg-red-600">
                <Plus className="w-4 h-4 mr-2" />
                Upload Documentary
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Documentary</DialogTitle>
              </DialogHeader>
              {renderFormContent(handleUpload, "Upload Documentary", true)}
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingDoc(null); resetForm(); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Documentary</DialogTitle>
            </DialogHeader>
            {renderFormContent(handleUpdate, "Update Documentary", false)}
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-muted-foreground">Total Documentaries</span>
                <Video className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{documentaries.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-muted-foreground">Total Views</span>
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {documentaries.reduce((sum, d) => sum + (d.views_count || 0), 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-muted-foreground">Tagged Researchers</span>
                <User className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {documentaries.filter(d => d.researcher_id).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documentaries by title, description, or researcher..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="rounded-xl pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentaries List */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>All Documentaries ({filteredDocumentaries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredDocumentaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4">
                  <Video className="w-10 h-10 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Documentaries Found</h3>
                <p className="text-muted-foreground mb-4">
                  {listSearchQuery ? "Try adjusting your search criteria." : "Upload your first documentary to get started."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocumentaries.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                    {/* Thumbnail with play button */}
                    <div 
                      className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative group cursor-pointer"
                      onClick={() => openVideoPreview(doc)}
                    >
                      {doc.thumbnail_url ? (
                        <img 
                          src={signedThumbnails[doc.thumbnail_url] || (isFullUrl(doc.thumbnail_url) ? doc.thumbnail_url : '')} 
                          alt={doc.title}
                          className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center group-hover:bg-muted/80 transition-all">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{doc.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{doc.views_count} views</span>
                        {doc.researcher && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.researcher.full_name}
                          </span>
                        )}
                        <span>{formatLagos(doc.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openVideoPreview(doc)}
                        className="rounded-xl"
                        title="Preview video"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(doc)}
                        className="rounded-xl"
                        title="Edit documentary"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete documentary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Preview Modal */}
        {previewDoc && (
          <VideoPreviewModal
            isOpen={videoPreviewOpen}
            onClose={() => {
              setVideoPreviewOpen(false);
              setPreviewDoc(null);
              setPreviewVideoUrl("");
            }}
            videoUrl={previewVideoUrl || previewDoc.video_url}
            title={previewDoc.title}
          />
        )}
      </div>
    </AdminLayout>
  );
}
