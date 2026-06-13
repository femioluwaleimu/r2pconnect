import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, Building2, DollarSign, Globe, Save, Upload, Image, Shield, AlertTriangle, Info, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const currencies = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "EUR", name: "Euro", symbol: "€" },
];

interface InstitutionData {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  plagiarism_threshold: number | null;
  ai_content_threshold: string | null;
  download_credit_cost: number | null;
}

export default function InstitutionSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");
  const [institutionName, setInstitutionName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(30);
  const [aiContentThreshold, setAiContentThreshold] = useState("medium");
  const [downloadCreditCost, setDownloadCreditCost] = useState(0);
  const [creditRateNgn, setCreditRateNgn] = useState("100");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchInstitution(user.id);
    });
  }, [navigate]);

  const fetchInstitution = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, description, website, logo_url, plagiarism_threshold, ai_content_threshold, download_credit_cost')
        .eq('admin_user_id', userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching institution:", error);
        toast({ title: "Error loading institution data", variant: "destructive" });
      }

      if (data) {
        setInstitution(data as InstitutionData);
        setInstitutionName(data.name);
        setDescription(data.description || "");
        setWebsite(data.website || "");
        setLogoUrl(data.logo_url);
        setPlagiarismThreshold(data.plagiarism_threshold ?? 30);
        setAiContentThreshold(data.ai_content_threshold ?? "medium");
        setDownloadCreditCost(data.download_credit_cost ?? 0);
        
        // Fetch admin credit rate
        const { data: rateData } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'download_credit_rate_ngn')
          .maybeSingle();
        if (rateData?.value) setCreditRateNgn(rateData.value);

        const savedCurrency = localStorage.getItem(`institution_currency_${data.id}`);
        if (savedCurrency) {
          setSelectedCurrency(savedCurrency);
        }
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File size must be less than 2MB", variant: "destructive" });
      return;
    }

    // If no institution exists yet, show error
    if (!institution) {
      toast({ title: "Institution not found", description: "Please ensure your institution is properly set up.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `institutions/${institution.id}/logo-${timestamp}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('platform-assets')
        .getPublicUrl(fileName);

      // Update institution with new logo URL
      const { error: updateError } = await supabase
        .from('institutions')
        .update({ logo_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', institution.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      setLogoUrl(publicUrl.publicUrl);
      setInstitution(prev => prev ? { ...prev, logo_url: publicUrl.publicUrl } : null);
      toast({ title: "Logo uploaded successfully" });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({ 
        title: "Error uploading logo", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!institution) {
      toast({ title: "No institution found", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      // Update description and integrity settings in database
      const { error } = await supabase
        .from('institutions')
        .update({
          description: description || null,
          plagiarism_threshold: plagiarismThreshold,
          ai_content_threshold: aiContentThreshold,
          download_credit_cost: downloadCreditCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', institution.id);

      if (error) {
        console.error("Save error:", error);
        throw error;
      }

      // Save currency preference to localStorage
      localStorage.setItem(`institution_currency_${institution.id}`, selectedCurrency);
      
      // Update local state to reflect saved changes
      setInstitution(prev => prev ? { 
        ...prev, 
        description: description || null,
        plagiarism_threshold: plagiarismThreshold,
        ai_content_threshold: aiContentThreshold
      } : null);
      
      toast({ title: "Settings saved successfully" });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({ 
        title: "Error saving settings", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <InstitutionLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </InstitutionLayout>
    );
  }

  if (!institution) {
    return (
      <InstitutionLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Institution Found</h2>
          <p className="text-muted-foreground">Your account is not linked to an institution.</p>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Institution Settings</h1>
          <p className="text-muted-foreground">Configure your institution preferences</p>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <h4 className="font-bold text-lg mb-1">Manage Settings</h4>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• Update your institution information</li>
                  <li>• Set your preferred currency for all financial displays</li>
                  <li>• Settings will apply across all pages</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Institution Logo */}
        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-500" />
              Institution Logo
            </CardTitle>
            <CardDescription>Upload your institution logo (max 2MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Institution logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Building2 className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-xl"
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {logoUrl ? "Change Logo" : "Upload Logo"}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Recommended: 200x200px, PNG or JPG</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Institution Info */}
        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              Institution Information
            </CardTitle>
            <CardDescription>Your institution details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Institution Name</Label>
              <Input 
                value={institutionName} 
                disabled
                className="rounded-xl h-12 bg-muted cursor-not-allowed" 
              />
              <p className="text-xs text-muted-foreground">Name was set during registration and cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <Input 
                value={website} 
                disabled
                className="rounded-xl h-12 bg-muted cursor-not-allowed" 
              />
              <p className="text-xs text-muted-foreground">Website was set during registration and cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-24" 
                placeholder="Brief description of your institution"
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Currency Preferences
            </CardTitle>
            <CardDescription>
              Choose your preferred currency for displaying amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Display Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{currency.symbol}</span>
                        <span>{currency.name}</span>
                        <span className="text-muted-foreground">({currency.code})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This currency will be used to display all financial values in your dashboard
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Research Integrity Settings */}
        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-500" />
              Research Integrity Thresholds
            </CardTitle>
            <CardDescription>
              Set acceptable thresholds for student research integrity checks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <Info className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                These thresholds guide supervisors during reviews. Research exceeding these limits will be flagged for closer examination.
              </AlertDescription>
            </Alert>

            {/* Plagiarism Threshold */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Plagiarism Threshold</Label>
                <span className={`text-2xl font-bold ${
                  plagiarismThreshold <= 20 ? 'text-emerald-600' :
                  plagiarismThreshold <= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {plagiarismThreshold}%
                </span>
              </div>
              <Slider
                value={[plagiarismThreshold]}
                onValueChange={(value) => setPlagiarismThreshold(value[0])}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (Very Strict)</span>
                <span>50%</span>
                <span>100% (Permissive)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Research with plagiarism scores above {plagiarismThreshold}% will be flagged to supervisors
              </p>
            </div>

            {/* AI Content Threshold */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">AI Content Risk Threshold</Label>
              <Select value={aiContentThreshold} onValueChange={setAiContentThreshold}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Low - Flag only high AI content risk</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>Medium - Flag medium and high AI content risk</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>High - Flag all AI content indicators</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Supervisors will see warnings when AI content risk meets or exceeds this threshold
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Download Credit Cost */}
        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-500" />
              Download Credit Cost
            </CardTitle>
            <CardDescription>
              Set the number of credits required to download student research papers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Credits per Download</Label>
                <span className="text-2xl font-bold text-foreground">{downloadCreditCost}</span>
              </div>
              <Slider
                value={[downloadCreditCost]}
                onValueChange={(value) => setDownloadCreditCost(value[0])}
                max={20}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (Free)</span>
                <span>10</span>
                <span>20 (Maximum)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Each credit = ₦{creditRateNgn} (set by admin). Students under your institution will have this cost applied when download is enabled.
              </p>
              {downloadCreditCost > 0 && (
                <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                    Downloaders will pay <strong>{downloadCreditCost} credits (₦{(downloadCreditCost * Number(creditRateNgn)).toLocaleString()})</strong> per download. Proceeds are shared between institution, supervisor, student, and the platform.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </InstitutionLayout>
  );
}
