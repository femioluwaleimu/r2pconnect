import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformSettingsContext {
  platformName: string;
  platformLogo: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const PlatformSettingsContext = createContext<PlatformSettingsContext>({
  platformName: "R2P CONNECT",
  platformLogo: null,
  loading: true,
  refetch: async () => {},
});

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [platformName, setPlatformName] = useState("R2P CONNECT");
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['platform_name', 'platform_logo']);

      if (error) throw error;

      if (data) {
        data.forEach((item) => {
          if (item.key === 'platform_name' && item.value) {
            setPlatformName(item.value);
          }
          if (item.key === 'platform_logo' && item.value) {
            setPlatformLogo(item.value);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <PlatformSettingsContext.Provider value={{ platformName, platformLogo, loading, refetch: fetchSettings }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  return useContext(PlatformSettingsContext);
}
