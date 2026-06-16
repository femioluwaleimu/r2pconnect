import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  platform_name: string;
  platform_logo: string | null;
  support_email: string;
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
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultSettings: Omit<AppSettings, 'loading' | 'refetch'> = {
  platform_name: "R2P CONNECT",
  platform_logo: null,
  support_email: "",
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

const AppSettingsContext = createContext<AppSettings>({
  ...defaultSettings,
  loading: true,
  refetch: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Omit<AppSettings, 'loading' | 'refetch'>>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');

      if (error) throw error;

      if (data) {
        const settingsObj: Omit<AppSettings, 'loading' | 'refetch'> = { ...defaultSettings };
        data.forEach((item) => {
          const key = item.key as keyof typeof settingsObj;
          if (key === 'platform_name' || key === 'support_email' || key === 'platform_logo' || key === 'openai_model' || key === 'deepseek_model') {
            (settingsObj as any)[key] = item.value || '';
          } else if (key === 'ai_primary_provider' || key === 'ai_fallback_provider') {
            if (item.value === 'openai' || item.value === 'deepseek') {
              (settingsObj as any)[key] = item.value;
            }
          } else if (
            key === 'app_notifications' ||
            key === 'email_notifications' || 
            key === 'new_user_alerts' || 
            key === 'system_alerts' || 
            key === 'require_email_verification' || 
            key === 'two_factor_auth'
          ) {
            (settingsObj as any)[key] = item.value === 'true';
          }
        });
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ ...settings, loading, refetch: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

// Helper hook for checking specific feature flags
export function useNotificationsEnabled() {
  const { email_notifications } = useAppSettings();
  return email_notifications;
}

export function useAppNotificationsEnabled() {
  const { app_notifications } = useAppSettings();
  return app_notifications;
}

export function useNewUserAlertsEnabled() {
  const { new_user_alerts } = useAppSettings();
  return new_user_alerts;
}

export function useSystemAlertsEnabled() {
  const { system_alerts } = useAppSettings();
  return system_alerts;
}

export function useEmailVerificationRequired() {
  const { require_email_verification } = useAppSettings();
  return require_email_verification;
}

export function useTwoFactorAuthRequired() {
  const { two_factor_auth } = useAppSettings();
  return two_factor_auth;
}
