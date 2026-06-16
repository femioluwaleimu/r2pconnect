import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, Users, Calendar, Building2, GraduationCap, Trash2, Edit, Eye, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

interface Institution {
  id: string;
  name: string;
}

interface JobPosting {
  id: string;
  title: string;
  description: string;
  job_type: string;
  company_name?: string | null;
  company_location?: string | null;
  institution_id: string | null;
  department: string | null;
  required_level: string[] | null;
  duration: string | null;
  payment_amount: number | null;
  payment_currency: string;
  is_active: boolean;
  slots_available: number;
  slots_filled: number;
  deadline: string | null;
  created_at: string;
  institutions?: { name: string } | null;
}

const JOB_TYPES = [
  { value: 'part_time', label: 'Part-time' },
  { value: 'siwes', label: 'SIWES' },
  { value: 'industrial_training', label: 'IT' },
  { value: 'internship', label: 'Internship' },
];

const STUDENT_LEVELS = ['ND1', 'ND2', 'HND1', 'HND2', '100L', '200L', '300L', '400L', '500L', 'Graduate HND', 'Graduate BSc', 'Masters', 'PhD'];

export default function IndustryJobPostings() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [employerDefaults, setEmployerDefaults] = useState({
    company_name: '',
    company_location: '',
    company_address: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    job_type: 'internship',
    company_name: '',
    company_location: '', // City/Region (for display)
    company_address: '', // Full address (saved to company_location column)
    institution_id: '',
    department: '',
    required_level: [] as string[],
    duration: '',
    payment_amount: '',
    payment_currency: 'NGN',
    slots_available: '1',
    deadline: '',
    is_paid: false,
    application_fee_ngn: '',
    requires_cv: false,
    work_mode: '',
  });

  const parseCityRegion = (location: string) => {
    const city = (location || '').split(',')[0]?.trim() || '';
    const region = (location || '').split(',')[1]?.trim() || '';
    return { city: city || null, region: region || null };
  };

  useEffect(() => {
    fetchJobPostings();
    fetchInstitutions();
    // Prefill company name/location from profile when available
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_address')
        .eq('user_id', user.id)
        .maybeSingle();

      const defaults = {
        company_name: user.user_metadata?.company_name || '',
        company_location: user.user_metadata?.location || '',
        company_address: profile?.company_address || '',
      };
      setEmployerDefaults(defaults);

      setFormData(prev => ({
        ...prev,
        company_name: prev.company_name || defaults.company_name,
        company_location: prev.company_location || defaults.company_location,
        company_address: prev.company_address || defaults.company_address,
      }));
    })();
  }, []);

  const fetchJobPostings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('job_postings')
        .select('*, institutions(name)')
        .eq('industry_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobPostings((data || []).map((job) => ({
        ...job,
        payment_amount: job.payment_amount == null ? null : toNumber(job.payment_amount),
      })));
    } catch (error: any) {
      toast({ title: "Error fetching jobs", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    const { data } = await supabase.from('institutions').select('id, name').eq('is_verified', true).order('name');
    if (data) setInstitutions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const jobData = {
        industry_id: user.id,
        title: formData.title,
        description: formData.description,
        job_type: formData.job_type as 'part_time' | 'siwes' | 'industrial_training' | 'internship',
        company_name: formData.company_name?.trim() || null,
        // Save full address into DB (company_location column)
        company_location: formData.company_address?.trim() || null,
        institution_id: formData.institution_id || null,
        department: formData.department || null,
        required_level: formData.required_level.length > 0 ? formData.required_level : null,
        duration: formData.duration || null,
        payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : null,
        payment_currency: formData.payment_currency,
        slots_available: parseInt(formData.slots_available) || 1,
        deadline: formData.deadline || null,
        is_paid: formData.is_paid,
        application_fee_ngn: formData.is_paid && formData.application_fee_ngn ? parseFloat(formData.application_fee_ngn) : 0,
        requires_cv: formData.requires_cv,
        work_mode: formData.work_mode || null,
      };

      // Best-effort: set parsed city/region columns (if present in DB)
      const { city, region } = parseCityRegion(formData.company_location);
      (jobData as any).company_city = city;
      (jobData as any).company_region = region;

      if (editingJob) {
        const { error } = await supabase.from('job_postings').update(jobData).eq('id', editingJob.id);
        if (error) throw error;
        toast({ title: "Job updated successfully" });
      } else {
        const { error } = await supabase.from('job_postings').insert([jobData]);
        if (error) throw error;
        toast({ title: "Job posted successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchJobPostings();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      job_type: 'internship',
      company_name: employerDefaults.company_name,
      company_location: employerDefaults.company_location,
      company_address: employerDefaults.company_address,
      institution_id: '',
      department: '',
      required_level: [], duration: '', payment_amount: '', payment_currency: 'NGN', slots_available: '1', deadline: '',
      is_paid: false,
      application_fee_ngn: '',
      requires_cv: false,
      work_mode: '',
    });
    setEditingJob(null);
  };

  const handleEdit = (job: JobPosting) => {
    setEditingJob(job);

    const city = (job as any).company_city as string | null | undefined;
    const region = (job as any).company_region as string | null | undefined;
    const locationDisplay = [city, region].filter(Boolean).join(', ');

    setFormData({
      title: job.title, description: job.description, job_type: job.job_type,
      company_name: job.company_name || '',
      company_location: locationDisplay || '',
      company_address: job.company_location || '',
      institution_id: job.institution_id || '', department: job.department || '',
      required_level: job.required_level || [], duration: job.duration || '',
      payment_amount: job.payment_amount?.toString() || '', payment_currency: job.payment_currency,
      slots_available: job.slots_available.toString(), deadline: job.deadline?.split('T')[0] || '',
      is_paid: (job as any).is_paid || false,
      application_fee_ngn: (job as any).application_fee_ngn?.toString() || '',
      requires_cv: (job as any).requires_cv || false,
      work_mode: (job as any).work_mode || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job posting?')) return;
    try {
      const { error } = await supabase.from('job_postings').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Job deleted" });
      fetchJobPostings();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleJobStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('job_postings').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      toast({ title: isActive ? "Job deactivated" : "Job activated" });
      fetchJobPostings();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      required_level: prev.required_level.includes(level)
        ? prev.required_level.filter(l => l !== level)
        : [...prev.required_level, level]
    }));
  };

  const getJobTypeLabel = (type: string) => JOB_TYPES.find(t => t.value === type)?.label || type;

  return (
    <IndustryLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Job Postings</h1>
            <p className="text-sm text-muted-foreground">Post jobs and internships for students</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg gradient-hero">
                <Plus className="w-4 h-4 mr-1" />
                Post Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? 'Edit Job' : 'Post New Job'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-sm">Job Title</Label>
                    <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Job title" required className="rounded-lg mt-1 h-9 text-sm" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-sm">Job Type</Label>
                    <Select value={formData.job_type} onValueChange={(v) => setFormData(p => ({ ...p, job_type: v }))}>
                      <SelectTrigger className="rounded-lg mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{JOB_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-sm">Company Name</Label>
                    <Input
                      value={formData.company_name}
                      readOnly
                      disabled
                      placeholder="Company name"
                      className="rounded-lg mt-1 h-9 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Company name is taken from your profile.</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-sm">Location (City/Region)</Label>
                    <Input
                      value={formData.company_location}
                      readOnly
                      disabled
                      placeholder="City, Region"
                      className="rounded-lg mt-1 h-9 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Location is taken from your profile.</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Company Address</Label>
                  <Input
                    value={formData.company_address}
                    readOnly
                    disabled
                    placeholder="Company address"
                    className="rounded-lg mt-1 h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-sm">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Job description..." required className="rounded-lg mt-1 min-h-[80px] text-sm" />
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <Label className="text-sm">Institution</Label>
                    <Select value={formData.institution_id || "any"} onValueChange={(v) => setFormData(p => ({ ...p, institution_id: v === "any" ? "" : v }))}>
                      <SelectTrigger className="rounded-lg mt-1 h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        {institutions.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Department</Label>
                    <Input value={formData.department} onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="rounded-lg mt-1 h-9 text-sm" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Required Level</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {STUDENT_LEVELS.map(level => (
                      <Badge key={level} variant={formData.required_level.includes(level) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleLevel(level)}>{level}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-3">
                  <div>
                    <Label className="text-sm">Duration</Label>
                    <Input value={formData.duration} onChange={(e) => setFormData(p => ({ ...p, duration: e.target.value }))} placeholder="3 months" className="rounded-lg mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm">Stipend (₦)</Label>
                    <Input type="number" value={formData.payment_amount} onChange={(e) => setFormData(p => ({ ...p, payment_amount: e.target.value }))} placeholder="50000" className="rounded-lg mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm">Slots</Label>
                    <Input type="number" value={formData.slots_available} onChange={(e) => setFormData(p => ({ ...p, slots_available: e.target.value }))} min="1" className="rounded-lg mt-1 h-9 text-sm" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Deadline</Label>
                  <Input type="date" value={formData.deadline} onChange={(e) => setFormData(p => ({ ...p, deadline: e.target.value }))} className="rounded-lg mt-1 h-9 text-sm" />
                </div>

                {/* Paid Application Toggle */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Paid Application</Label>
                      <p className="text-[11px] text-muted-foreground">Charge applicants a fee to apply</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.is_paid}
                      onChange={(e) => setFormData(p => ({ ...p, is_paid: e.target.checked, application_fee_ngn: e.target.checked ? p.application_fee_ngn : '' }))}
                      className="w-4 h-4 rounded border-border"
                    />
                  </div>
                  {formData.is_paid && (
                    <div>
                      <Label className="text-sm">Application Fee (₦)</Label>
                      <Input
                        type="number"
                        value={formData.application_fee_ngn}
                        onChange={(e) => setFormData(p => ({ ...p, application_fee_ngn: e.target.value }))}
                        placeholder="e.g. 2000"
                        min="100"
                        required
                        className="rounded-lg mt-1 h-9 text-sm"
                      />
                    </div>
                  )}

                  {/* Require CV */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Require CV Upload</Label>
                      <p className="text-[11px] text-muted-foreground">Ask applicants to upload their CV (PDF)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.requires_cv}
                      onChange={(e) => setFormData(p => ({ ...p, requires_cv: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Work Mode</Label>
                  <Select value={formData.work_mode || "none"} onValueChange={(v) => setFormData(p => ({ ...p, work_mode: v === "none" ? "" : v }))}>
                    <SelectTrigger className="rounded-lg mt-1 h-9 text-sm"><SelectValue placeholder="Select work mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Fully Remote Work">Fully Remote Work</SelectItem>
                      <SelectItem value="Fully Office Work">Fully Office Work</SelectItem>
                      <SelectItem value="Partly Remote Work">Partly Remote Work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg h-9 text-sm">Cancel</Button>
                  <Button type="submit" disabled={saving} className="rounded-lg h-9 text-sm gradient-hero">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {editingJob ? 'Update' : 'Post Job'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{jobPostings.length}</p>
                  <p className="text-xs opacity-80">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{jobPostings.filter(j => j.is_active).length}</p>
                  <p className="text-xs opacity-80">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{jobPostings.reduce((a, j) => a + j.slots_available, 0)}</p>
                  <p className="text-xs opacity-80">Slots</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xl font-bold">{jobPostings.reduce((a, j) => a + j.slots_filled, 0)}</p>
                  <p className="text-xs opacity-80">Hired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : jobPostings.length === 0 ? (
          <Card className="shadow-sm rounded-xl">
            <CardContent className="text-center py-12">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-1">No job postings yet</h3>
              <p className="text-sm text-muted-foreground mb-3">Post your first job or internship</p>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="rounded-lg gradient-hero">
                <Plus className="w-4 h-4 mr-1" />
                Post Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {jobPostings.map(job => (
              <Card key={job.id} className="shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  {/* Title Row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">{job.title}</h3>
                    <Badge className={`flex-shrink-0 text-xs ${job.is_active ? "bg-emerald-600 text-white" : "bg-gray-500 text-white"}`}>
                      {job.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{job.description}</p>

                  {/* Info Row */}
                  <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                    <Badge variant="outline" className="text-[10px]">{getJobTypeLabel(job.job_type)}</Badge>
                    {job.institutions?.name && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="w-3 h-3" />{job.institutions.name}
                      </span>
                    )}
                    {job.payment_amount && (
                      <span className="text-emerald-600 font-medium">{formatCurrencyAmount(job.payment_amount)}</span>
                    )}
                    <span className="text-muted-foreground">{job.slots_filled}/{job.slots_available} hired</span>
                    {job.deadline && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />{formatLagos(job.deadline)}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => toggleJobStatus(job.id, job.is_active)} className="rounded-lg text-xs h-7 px-2">
                      {job.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(job)} className="rounded-lg text-xs h-7 px-2">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="rounded-lg text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </IndustryLayout>
  );
}
