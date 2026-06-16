import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building2,
  GraduationCap,
  ArrowRight,
  Users,
  Calendar,
  CheckCircle,
  FileText,
  Mail,
  Phone,
  User,
  Loader2,
  Info,
  Upload
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { formatLagos } from "@/lib/dateUtils";
import { formatAmount, formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

interface JobPosting {
  id: string;
  title: string;
  description: string;
  job_type: string;
  company_name?: string | null;
  company_location?: string | null;
  company_city?: string | null;
  company_region?: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  duration: string | null;
  deadline: string | null;
  slots_available: number | null;
  slots_filled: number | null;
  department: string | null;
  required_level: string[] | null;
  requirements: string[] | null;
  responsibilities: string[] | null;
  industry_id: string;
  created_at: string;
  is_paid?: boolean;
  application_fee_ngn?: number;
  requires_cv?: boolean;
  work_mode?: string | null;
  source?: "direct" | "ipn";
  real_id?: string; // actual UUID without ipn_ prefix
}

interface Profile {
  full_name: string;
  company_address: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface UserProfile {
  full_name: string;
  email: string;
  phone_number: string | null;
  level: string | null;
  institution_id: string | null;
  avatar_url: string | null;
  institution_name?: string | null;
}

const jobTypeLabels: Record<string, string> = {
  part_time: "Part-time",
  siwes: "SIWES",
  industrial_training: "Industrial Training",
  internship: "Internship",
};

const jobTypeColors: Record<string, string> = {
  part_time: "bg-blue-500/10 text-blue-600 border-blue-200",
  siwes: "border-green-200 bg-primary text-primary-foreground",
  industrial_training: "bg-purple-500/10 text-purple-600 border-purple-200",
  internship: "bg-amber-500/10 text-amber-600 border-amber-200",
};

export default function JobDetailsPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const { toast } = useToast();

  useSEO({
    title: job ? `${job.title} | ${jobTypeLabels[job.job_type] || "Job"}` : "Job Details",
    description: job
      ? job.description.substring(0, 155) + (job.description.length > 155 ? "…" : "")
      : "Find student jobs, internships, and SIWES placements on R2PConnect.",
    url: job ? `/jobs/${job.id}` : "/jobs",
  });

  useEffect(() => {
    checkAuth();
    if (id) fetchJob();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, level, institution_id, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof) {
        let instName: string | null = null;
        if (prof.institution_id) {
          const { data: inst } = await supabase.from("institutions").select("name").eq("id", prof.institution_id).maybeSingle();
          instName = inst?.name || null;
        }
        setUserProfile({ ...prof, institution_name: instName });
      }
      // Check if already applied
      if (id) {
        const isIpnJob = id.startsWith("ipn_");
        if (isIpnJob) {
          const realId = id.replace("ipn_", "");
          const { data: apps } = await supabase
            .from("ipn_applications")
            .select("id")
            .eq("applicant_id", user.id)
            .eq("opportunity_id", realId)
            .limit(1);
          if (apps && apps.length > 0) setAlreadyApplied(true);
        } else {
          const { data: apps } = await supabase
            .from("job_applications")
            .select("id")
            .eq("student_id", user.id)
            .eq("job_id", id)
            .limit(1);
          if (apps && apps.length > 0) setAlreadyApplied(true);
        }
      }
    }
  };

  const fetchJob = async () => {
    setLoading(true);
    const isIpn = id?.startsWith('ipn_');
    
    if (isIpn) {
      const realId = id?.replace('ipn_', '');
      const { data: oppData, error } = await supabase
        .from('ipn_opportunities')
        .select('*, ipn_companies(name, location, state)')
        .eq('id', realId)
        .eq('is_published', true)
        .single();

      if (error || !oppData) { setLoading(false); return; }

      setJob({
        id: id!,
        title: oppData.title,
        description: oppData.description,
        job_type: oppData.job_type,
        company_name: oppData.ipn_companies?.name || null,
        company_location: oppData.location || oppData.ipn_companies?.location || null,
        company_city: null, company_region: null,
        payment_amount: null, payment_currency: null,
        duration: oppData.duration,
        deadline: oppData.deadline,
        slots_available: oppData.slots_available,
        slots_filled: oppData.slots_filled || 0,
        department: null, required_level: null,
        requirements: oppData.requirements,
        responsibilities: oppData.responsibilities,
        industry_id: oppData.ipn_user_id,
        created_at: oppData.created_at,
        is_paid: oppData.is_paid,
        application_fee_ngn: toNumber(oppData.application_fee_ngn),
        requires_cv: oppData.requires_cv || false,
        work_mode: (oppData as any).work_mode || null,
        source: "ipn",
        real_id: realId!,
      });
      setLoading(false);
      return;
    }

    const { data: jobData, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !jobData) { setLoading(false); return; }
    setJob({
      ...jobData,
      application_fee_ngn: toNumber((jobData as any).application_fee_ngn),
      payment_amount: jobData.payment_amount == null ? null : toNumber(jobData.payment_amount),
      source: "direct" as const,
      real_id: jobData.id,
    });

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, company_address, bio, avatar_url, is_verified')
      .eq('user_id', jobData.industry_id)
      .single();
    if (profileData) setProfile(profileData);
    setLoading(false);
  };

  const uploadCv = async (userId: string): Promise<string | null> => {
    if (!cvFile) return null;
    const ext = cvFile.name.split('.').pop();
    const path = `${userId}/${Date.now()}-cv.${ext}`;
    const { error } = await supabase.storage.from('job-cvs').upload(path, cvFile);
    if (error) throw new Error('CV upload failed: ' + error.message);
    return path;
  };

  const handleApply = async () => {
    if (!job || !currentUser || !userProfile) return;

    // Validate CV if required
    if (job.requires_cv && !cvFile) {
      toast({ title: "CV Required", description: "Please upload your CV before applying.", variant: "destructive" });
      return;
    }
    
    // If paid, redirect to Paystack
    if (job.is_paid && (job.application_fee_ngn || 0) > 0) {
      setApplying(true);
      try {
        // Upload CV first if provided
        let cvUrl: string | null = null;
        if (cvFile) {
          setUploadingCv(true);
          cvUrl = await uploadCv(currentUser.id);
          setUploadingCv(false);
        }

        const realJobId = job.source === "ipn" ? job.real_id! : job.id;
        const { data, error } = await supabase.functions.invoke('paystack', {
          body: {
            action: 'initialize_job_application',
            job_id: realJobId,
            amount: job.application_fee_ngn,
            callback_url: `${window.location.origin}/dashboard/job-board?payment_ref=pending&job_id=${job.id}&source=${job.source || 'direct'}`,
          },
        });
        if (error) throw error;
        if (data?.authorization_url) {
          localStorage.setItem('pending_job_application', JSON.stringify({
            job_id: job.id,
            real_id: job.real_id || job.id,
            source: job.source || 'direct',
            cover_letter: coverLetter,
            cv_url: cvUrl,
            selected_level: selectedLevel,
          }));
          window.location.href = data.authorization_url;
          return;
        }
        throw new Error('Failed to initialize payment');
      } catch (err: any) {
        toast({ title: "Payment Error", description: err.message, variant: "destructive" });
      } finally {
        setApplying(false);
        setUploadingCv(false);
      }
      return;
    }

    // Free application
    setApplying(true);
    try {
      let cvUrl: string | null = null;
      if (cvFile) {
        setUploadingCv(true);
        cvUrl = await uploadCv(currentUser.id);
        setUploadingCv(false);
      }

      if (job.source === "ipn") {
        // Insert into ipn_applications
        const { data: inserted, error } = await supabase
          .from('ipn_applications')
          .insert({
            opportunity_id: job.real_id!,
            applicant_id: currentUser.id,
            applicant_name: userProfile.full_name || null,
            applicant_email: userProfile.email || null,
            cover_letter: coverLetter || null,
            cv_url: cvUrl,
          })
          .select('id')
          .single();
        if (error) throw error;
        // TODO: send IPN application notification if needed
      } else {
        // Insert into job_applications
        const { data: inserted, error } = await supabase
          .from('job_applications')
          .insert({
            job_id: job.real_id || job.id,
            student_id: currentUser.id,
            cover_letter: coverLetter || null,
            cv_url: cvUrl,
            student_name: userProfile.full_name || null,
            student_level: selectedLevel || userProfile.level || null,
            student_institution_id: userProfile.institution_id || null,
            student_institution_name: userProfile.institution_name || null,
            student_avatar_url: userProfile.avatar_url || null,
          })
          .select('id')
          .single();
        if (error) throw error;

        await supabase.functions.invoke('send-job-application-notification', {
          body: { applicationId: inserted.id },
        });
      }

      toast({ title: "Application submitted!", description: "Track your application in Dashboard → Job Board" });
      setAlreadyApplied(true);
      setShowSummary(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
      setUploadingCv(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="max-w-4xl mx-auto px-4 py-20">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-6">This job posting may not exist or is no longer active.</p>
          <Link to="/jobs"><Button className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" />Back to Jobs</Button></Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Application Summary View
  if (showSummary && currentUser && userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <section className="pt-16 md:pt-24 pb-8 md:pb-12 gradient-hero">
          <div className="max-w-3xl mx-auto px-4">
            <button onClick={() => setShowSummary(false)} className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Job Details
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Application Summary</h1>
            <p className="text-white/80 mt-1">Review your details before submitting</p>
          </div>
        </section>

        <section className="py-6 md:py-12">
          <div className="max-w-3xl mx-auto px-4 space-y-6">
            {/* Job Info */}
            <Card className="rounded-2xl border-none shadow-tick">
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" />Applying For</CardTitle></CardHeader>
              <CardContent>
                <h3 className="font-semibold text-lg text-foreground">{job.title}</h3>
                <p className="text-muted-foreground">{job.company_name || "Company"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={jobTypeColors[job.job_type] || ""}>{jobTypeLabels[job.job_type] || job.job_type}</Badge>
                  {job.is_paid && (job.application_fee_ngn || 0) > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Application Fee: {formatCurrencyAmount(job.application_fee_ngn)}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Your Details */}
            <Card className="rounded-2xl border-none shadow-tick">
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />Your Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Full Name</p><p className="font-medium text-foreground">{userProfile.full_name || "—"}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-foreground">{userProfile.email || "—"}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-foreground">{userProfile.phone_number || "—"}</p></div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Level</p>
                    </div>
                    {job.required_level && job.required_level.length > 0 ? (
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select your level" />
                        </SelectTrigger>
                        <SelectContent>
                          {job.required_level.map((lvl) => (
                            <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        placeholder="Enter your level"
                        className="rounded-xl"
                      />
                    )}
                  </div>
                  {userProfile.institution_name && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 sm:col-span-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Institution</p><p className="font-medium text-foreground">{userProfile.institution_name}</p></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cover Letter */}
            <Card className="rounded-2xl border-none shadow-tick">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Cover Letter (Optional)</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the employer why you're a good fit..."
                  className="rounded-xl min-h-[120px]"
                />
              </CardContent>
            </Card>

            {/* CV Upload */}
            {job.requires_cv && (
              <Card className="rounded-2xl border-none shadow-tick">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Curriculum Vitae (CV) <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Upload your CV in PDF format (max 10MB)</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 10 * 1024 * 1024) {
                          toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
                          return;
                        }
                        setCvFile(file || null);
                      }}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  </div>
                  {cvFile && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 text-sm">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="truncate flex-1">{cvFile.name}</span>
                      <button onClick={() => setCvFile(null)} className="text-destructive text-xs hover:underline">Remove</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Registration Notice */}
            <Alert className="rounded-2xl border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <Info className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                You must be registered as a <strong>Student Research / Jobs</strong> role to apply for jobs. If you registered under a different role, please create a new account with the correct role.
              </AlertDescription>
            </Alert>

            {/* Info */}
            <Card className="rounded-2xl border-none shadow-tick bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Where to find your application</p>
                  <p>After submitting, you can track your application status in <strong>Dashboard → Job Board</strong>. You'll also receive notifications when the employer reviews your application.</p>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button onClick={handleApply} disabled={applying} className="w-full rounded-xl gradient-hero text-white h-12 text-lg">
              {applying ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
              {job.is_paid && (job.application_fee_ngn || 0) > 0 ? `Pay ${formatCurrencyAmount(job.application_fee_ngn)} & Submit` : "Submit Application"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>
        <PublicFooter />
      </div>
    );
  }

  const slotsRemaining = (job.slots_available || 0) - (job.slots_filled || 0);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="pt-16 md:pt-24 pb-8 md:pb-12 gradient-hero">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/jobs" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 md:mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className={`rounded-full ${jobTypeColors[job.job_type] || 'bg-white/10 text-white'}`}>
              {jobTypeLabels[job.job_type] || job.job_type}
            </Badge>
            {job.work_mode && (
              <Badge className="rounded-full bg-white/20 text-white border-white/30">{job.work_mode}</Badge>
            )}
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4">{job.title}</h1>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-white/80 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-medium">{job.company_name || 'Company'}</span>
            </div>
            {(job.company_city || job.company_location) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                <span>{job.company_city || job.company_location}</span>
              </div>
            )}
            {job.duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                <span>{job.duration}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-6 md:py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-2xl border-none shadow-tick">
                <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p></CardContent>
              </Card>

              {job.requirements && job.requirements.length > 0 && (
                <Card className="rounded-2xl border-none shadow-tick">
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Requirements</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {job.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /><span className="text-muted-foreground">{req}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {job.responsibilities && job.responsibilities.length > 0 && (
                <Card className="rounded-2xl border-none shadow-tick">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" />Responsibilities</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {job.responsibilities.map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" /><span className="text-muted-foreground">{resp}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6 order-first lg:order-none">
              {/* Apply Card */}
              <Card className="rounded-2xl border-none shadow-tick lg:sticky lg:top-24">
                <CardContent className="p-6 space-y-6">
                  {job.payment_amount && (
                    <div className="text-center pb-4 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-1">Compensation</p>
                       <p className="text-2xl md:text-3xl font-bold text-gradient">
                        {job.payment_currency || '₦'}{formatAmount(job.payment_amount)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" /><span>Slots Available</span></div>
                      <span className="font-semibold text-foreground">{slotsRemaining}</span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /><span>Deadline</span></div>
                        <span className="font-semibold text-foreground">{formatLagos(job.deadline)}</span>
                      </div>
                    )}
                    {job.department && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" /><span>Department</span></div>
                        <span className="font-semibold text-foreground">{job.department}</span>
                      </div>
                    )}
                  </div>

                  {job.required_level && job.required_level.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2"><GraduationCap className="w-4 h-4" />Required Level</p>
                      <div className="flex flex-wrap gap-2">
                        {job.required_level.map((level, idx) => (
                          <Badge key={idx} variant="secondary" className="rounded-full">{level}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.is_paid && (job.application_fee_ngn || 0) > 0 && (
                    <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Application Fee: {formatCurrencyAmount(job.application_fee_ngn)}</p>
                    </div>
                  )}

                  {alreadyApplied ? (
                    <div className="text-center space-y-2">
                      <Badge className="bg-green-500/10 text-green-600 border-green-200 text-sm px-4 py-2">
                        <CheckCircle className="w-4 h-4 mr-1" /> Already Applied
                      </Badge>
                      <p className="text-xs text-muted-foreground">Track your application in Dashboard → Job Board</p>
                    </div>
                  ) : currentUser ? (
                    <Button onClick={() => setShowSummary(true)} className="w-full rounded-xl gradient-hero text-white h-12 text-lg">
                      Apply Now
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  ) : (
                    <Link to={`/auth?mode=signup&redirect=/jobs/${id}`} className="block">
                      <Button className="w-full rounded-xl gradient-hero text-white h-12 text-lg">
                        Sign Up to Apply
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  )}

                  {!currentUser && (
                    <p className="text-xs text-muted-foreground text-center">Create an account to apply for this position</p>
                  )}
                </CardContent>
              </Card>

              {/* Company Info */}
              {(job.company_name || profile) && (
                <Card className="rounded-2xl border-none shadow-tick">
                  <CardHeader><CardTitle>About the Company</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={job.company_name || 'Company'} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground truncate">{job.company_name || 'Company'}</p>
                          {profile?.is_verified && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </div>
                        {job.company_location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.company_location}</p>
                        )}
                      </div>
                    </div>
                    {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
