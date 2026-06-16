import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Shield, Bell, Mail, Info, Globe, Key, Loader2, Upload, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface PlatformSettings {
  platform_name: string;
  support_email: string;
  platform_logo: string;
  download_credit_rate_ngn: string;
  ipn_activation_fee_ngn: string;
  ai_primary_provider: "openai" | "deepseek";
  ai_fallback_provider: "openai" | "deepseek";
  openai_model: string;
  deepseek_model: string;
  app_notifications: boolean;
  email_notifications: boolean;
  new_user_alerts: boolean;
  system_alerts: boolean;
  require_email_verification: boolean;
  two_factor_auth: boolean;
}

const defaultSettings: PlatformSettings = {
  platform_name: "EduTV Research2Practice",
  support_email: "",
  platform_logo: "",
  download_credit_rate_ngn: "100",
  ipn_activation_fee_ngn: "5000",
  ai_primary_provider: "deepseek",
  ai_fallback_provider: "openai",
  openai_model: "gpt-5.4-mini",
  deepseek_model: "deepseek-v4-flash",
  app_notifications: true,
  email_notifications: true,
  new_user_alerts: true,
  system_alerts: true,
  require_email_verification: true,
  two_factor_auth: false,
};

const openAIModels = [
  { value: "gpt-5.5", label: "GPT-5.5" },
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { value: "gpt-5.4-nano", label: "GPT-5.4 nano" },
];

const deepSeekModels = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { value: "deepseek-chat", label: "DeepSeek Chat (legacy)" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner (legacy)" },
];

const createUuid = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [settingIds, setSettingIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { refetch: refetchPlatformSettings } = usePlatformSettings();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('id, key, value');

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsObj: PlatformSettings = { ...defaultSettings };
        const ids: Record<string, string> = {};
        data.forEach((item) => {
          const key = item.key;
          if (item.id) {
            ids[key] = item.id;
          }

          if (key === 'platform_name' || key === 'support_email' || key === 'platform_logo' || key === 'download_credit_rate_ngn' || key === 'ipn_activation_fee_ngn' || key === 'openai_model' || key === 'deepseek_model') {
            settingsObj[key] = item.value || '';
          } else if (key === 'ai_primary_provider' || key === 'ai_fallback_provider') {
            if (item.value === 'openai' || item.value === 'deepseek') {
              settingsObj[key] = item.value;
            }
          } else if (key === 'app_notifications' || key === 'email_notifications' || key === 'new_user_alerts' || key === 'system_alerts' || key === 'require_email_verification' || key === 'two_factor_auth') {
            settingsObj[key] = item.value === 'true';
          }
        });
        setSettingIds(ids);
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('platform-assets')
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, platform_logo: publicUrl }));
      toast({ title: "Logo uploaded successfully" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Error uploading logo", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, platform_logo: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        id: settingIds[key] || createUuid(),
        key,
        value: String(value),
        updated_by: user.id,
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      setSettingIds(prev => ({
        ...prev,
        ...Object.fromEntries(settingsToSave.map(setting => [setting.key, setting.id])),
      }));

      await refetchPlatformSettings();
      toast({ title: "Settings saved successfully" });
    } catch (error: any) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettingsPatch = async (patch: Partial<PlatformSettings>, successTitle = "Settings saved") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsToSave = Object.entries(patch).map(([key, value]) => ({
        id: settingIds[key] || createUuid(),
        key,
        value: String(value),
        updated_by: user.id,
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      setSettingIds(prev => ({
        ...prev,
        ...Object.fromEntries(settingsToSave.map(setting => [setting.key, setting.id])),
      }));
      await refetchPlatformSettings();
      toast({ title: successTitle });
    } catch (error: any) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground">Configure platform settings</p>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Security Notice</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Changes to settings are logged for audit</li>
                  <li>• Some settings require system restart</li>
                  <li>• Critical settings need 2FA confirmation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {/* Branding Settings */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Platform Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Platform Logo</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a logo that will appear across all pages. Recommended size: 200x200px
                </p>
                
                <div className="flex items-start gap-4">
                  {settings.platform_logo ? (
                    <div className="relative">
                      <img 
                        src={settings.platform_logo} 
                        alt="Platform Logo" 
                        className="w-24 h-24 object-contain rounded-xl border border-border bg-background"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                        onClick={removeLogo}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-xl"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG or SVG. Max 2MB.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="siteName">Platform Name</Label>
                <Input
                  id="siteName"
                  value={settings.platform_name}
                  onChange={(e) => updateSetting('platform_name', e.target.value)}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => updateSetting('support_email', e.target.value)}
                  placeholder="support@example.com"
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="downloadCreditRate">Download Credit Rate (₦ per credit)</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  How much each download credit is worth in Naira. Researchers earn this amount per credit when their paper is downloaded.
                </p>
                <Input
                  id="downloadCreditRate"
                  type="number"
                  min="1"
                  value={settings.download_credit_rate_ngn}
                  onChange={(e) => updateSetting('download_credit_rate_ngn', e.target.value)}
                  placeholder="100"
                  className="rounded-xl mt-1 w-32"
                />
              </div>
              <div>
                <Label htmlFor="ipnActivationFee">IPN Activation Fee (₦)</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  One-time fee IPN users must pay to activate their account and access the platform.
                </p>
                <Input
                  id="ipnActivationFee"
                  type="number"
                  min="0"
                  value={settings.ipn_activation_fee_ngn}
                  onChange={(e) => updateSetting('ipn_activation_fee_ngn', e.target.value)}
                  placeholder="5000"
                  className="rounded-xl mt-1 w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                AI Provider Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Primary AI Provider</Label>
                <Select
                  value={settings.ai_primary_provider}
                  onValueChange={(value: "openai" | "deepseek") => {
                    const fallback = value === settings.ai_fallback_provider
                      ? value === 'openai' ? 'deepseek' : 'openai'
                      : settings.ai_fallback_provider;
                    const patch = {
                      ai_primary_provider: value,
                      ai_fallback_provider: fallback,
                    } as const;

                    setSettings(prev => ({ ...prev, ...patch }));
                    saveSettingsPatch(patch, "AI provider saved");
                  }}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Used first for AI requests.
                </p>
              </div>

              <div>
                <Label>Fallback AI Provider</Label>
                <Select
                  value={settings.ai_fallback_provider}
                  onValueChange={(value: "openai" | "deepseek") => {
                    const primary = value === settings.ai_primary_provider
                      ? value === 'openai' ? 'deepseek' : 'openai'
                      : settings.ai_primary_provider;
                    const patch = {
                      ai_primary_provider: primary,
                      ai_fallback_provider: value,
                    } as const;

                    setSettings(prev => ({ ...prev, ...patch }));
                    saveSettingsPatch(patch, "AI provider saved");
                  }}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Used automatically when the primary provider fails or has no available credit.
                </p>
              </div>

              <div>
                <Label>OpenAI Model</Label>
                <Select
                  value={settings.openai_model}
                  onValueChange={(value) => updateSetting('openai_model', value)}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {openAIModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Model used whenever OpenAI is selected or used as fallback.
                </p>
              </div>

              <div>
                <Label>DeepSeek Model</Label>
                <Select
                  value={settings.deepseek_model}
                  onValueChange={(value) => updateSetting('deepseek_model', value)}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deepSeekModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Model used whenever DeepSeek is selected or used as fallback.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">App Notifications</p>
                  <p className="text-sm text-muted-foreground">Show in-app notifications across dashboards</p>
                </div>
                <Switch
                  checked={settings.app_notifications}
                  onCheckedChange={(checked) => updateSetting('app_notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Send email notifications for important events</p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New User Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert admins when new users register</p>
                </div>
                <Switch
                  checked={settings.new_user_alerts}
                  onCheckedChange={(checked) => updateSetting('new_user_alerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">System Alerts</p>
                  <p className="text-sm text-muted-foreground">Receive alerts for system issues</p>
                </div>
                <Switch
                  checked={settings.system_alerts}
                  onCheckedChange={(checked) => updateSetting('system_alerts', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Email Verification</p>
                  <p className="text-sm text-muted-foreground">Users must verify email before accessing platform</p>
                </div>
                <Switch
                  checked={settings.require_email_verification}
                  onCheckedChange={(checked) => updateSetting('require_email_verification', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <Switch
                  checked={settings.two_factor_auth}
                  onCheckedChange={(checked) => updateSetting('two_factor_auth', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl px-8 bg-red-500 hover:bg-red-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
