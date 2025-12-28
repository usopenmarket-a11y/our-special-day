import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppConfig {
  guestSheetId: string;
  uploadFolderId: string;
  galleryFolderId: string;
}

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
});

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch config from Supabase Edge Function
        const { data, error: fetchError } = await supabase.functions.invoke('get-config');

        if (fetchError) {
          console.error('Error fetching config:', fetchError);
          const errorMsg = fetchError.message || String(fetchError);
          
          // Provide more specific error messages
          let userMessage = 'Failed to load configuration. Some features may not work.';
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            userMessage = 'Configuration function not found. Please deploy the get-config Edge Function in Supabase.';
          } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
            userMessage = 'Configuration access denied. Please check your Supabase credentials.';
          }
          
          setError(userMessage);
          // Set empty config so app can still render (components should handle missing IDs gracefully)
          setConfig({
            guestSheetId: '',
            uploadFolderId: '',
            galleryFolderId: '',
          });
          return;
        }

        if (data) {
          setConfig({
            guestSheetId: data.guestSheetId || '',
            uploadFolderId: data.uploadFolderId || '',
            galleryFolderId: data.galleryFolderId || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
        setError('Failed to load configuration. Some features may not work.');
        setConfig({
          guestSheetId: '',
          uploadFolderId: '',
          galleryFolderId: '',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within a ConfigProvider');
  }
  return context;
};

