import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingScreen from '@/components/LoadingScreen';
import QuotationViewer from '@/components/QuotationViewer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';

const AdminLayout = () => {
  const [appIsLoading, setAppIsLoading] = useState(true);
  const [initialQuotationData, setInitialQuotationData] = useState(null);
  const [activeTheme, setActiveTheme] = useState(null);
  const [allThemes, setAllThemes] = useState({});
  const [error, setError] = useState(null);
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleThemeSwitch = async (newThemeKey) => {
    console.log("[AdminLayout] Switching theme to:", newThemeKey);
    setActiveTheme(newThemeKey);

    // Update URL to persist project selection on reload
    const url = new URL(window.location);
    url.searchParams.set('p', newThemeKey);
    window.history.pushState({}, '', url);

    // If we don't have the full data for this theme yet, fetch it
    if (!allThemes[newThemeKey]?.sections_config || allThemes[newThemeKey]?.isStub) {
      console.log("[AdminLayout] Lazy loading full data for:", newThemeKey);
      try {
        const { data, error: fetchError } = await supabase
          .from('quotations')
          .select('*')
          .eq('theme_key', newThemeKey)
          .single();

        if (fetchError) throw fetchError;

        setAllThemes(prev => ({
          ...prev,
          [newThemeKey]: data
        }));
        setInitialQuotationData(data);
      } catch (err) {
        console.error("Error lazy loading theme:", err);
        toast({ title: "Error", description: "No se pudo cargar el proyecto.", variant: "destructive" });
      }
    } else {
      setInitialQuotationData(allThemes[newThemeKey]);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setAppIsLoading(true);
      setError(null);

      try {
        // Fetch all quotations first (METADATA ONLY)
        const { data: allData, error: allError } = await supabase
          .from('quotations')
          .select('id, theme_key, project, client, company, is_home, is_template, updated_at, slug');

        if (allError) {
          throw new Error(`${t('adminLayout.loadError')} ${allError.message}`);
        }

        const themesObject = {};
        allData.filter(item => !item.theme_key.startsWith('deleted_')).forEach(item => {
          themesObject[item.theme_key] = { ...item, isStub: true };
        });

        // Identify which project to load first
        const params = new URLSearchParams(window.location.search);
        const urlThemeKey = params.get('p');
        let targetThemeKey = urlThemeKey && themesObject[urlThemeKey] ? urlThemeKey : null;

        if (!targetThemeKey) {
          const homeStub = allData.find(item => item.is_home);
          targetThemeKey = homeStub ? homeStub.theme_key : (allData[0]?.theme_key || null);
        }

        if (targetThemeKey) {
          setActiveTheme(targetThemeKey);
          // FETCH FULL DATA FOR THE INITIAL PROJECT
          const { data: fullData, error: fullError } = await supabase
            .from('quotations')
            .select('*')
            .eq('theme_key', targetThemeKey)
            .single();

          if (!fullError && fullData) {
            setInitialQuotationData(fullData);
            themesObject[targetThemeKey] = fullData;
          } else {
            setInitialQuotationData(themesObject[targetThemeKey]);
          }
        }

        setAllThemes(themesObject);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setAppIsLoading(false);
      }
    };

    fetchAllData();
  }, [t]);

  if (appIsLoading) return <LoadingScreen message={t('adminLayout.loadingConfig')} />;
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
      <h1 className="text-3xl font-bold text-red-500 mb-4">{t('adminLayout.loadErrorTitle')}</h1>
      <p className="text-lg mb-8 max-w-md">{error}</p>
    </div>
  );

  return (
    <QuotationViewer
      initialQuotationData={initialQuotationData}
      allThemes={allThemes}
      isAdminView={true}
      activeThemeProp={activeTheme}
      onThemeChange={handleThemeSwitch}
    />
  );
};


export default AdminLayout;