import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingScreen from '@/components/LoadingScreen';
import QuotationViewer from '@/components/QuotationViewer';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminLayout = () => {
  const [appIsLoading, setAppIsLoading] = useState(true);
  const [initialQuotationData, setInitialQuotationData] = useState(null);
  const [allThemes, setAllThemes] = useState({});
  const [error, setError] = useState(null);
  const { t } = useLanguage();

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
        // Filter out soft-deleted items
        allData.filter(item => !item.theme_key.startsWith('deleted_')).forEach(item => {
          themesObject[item.theme_key] = item;
        });
        setAllThemes(themesObject);

        // Find Home project from metadata
        const homeStub = allData.find(item => item.is_home);

        if (!homeStub) {
          // If no home page is set, fallback to the first available project
          if (allData.length > 0) {
            setInitialQuotationData(allData[0]);
            console.warn(t('adminLayout.noHome'));
          } else {
            throw new Error(t('adminLayout.noHomeNoFallback'));
          }
        } else {
          setInitialQuotationData(homeStub);
        }

      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setAppIsLoading(false);
      }
    };

    fetchAllData();
  }, [t]);

  if (appIsLoading) {
    return <LoadingScreen message={t('adminLayout.loadingConfig')} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{t('adminLayout.loadErrorTitle')}</h1>
        <p className="text-lg mb-8 max-w-md">{error}</p>
      </div>
    );
  }

  if (!initialQuotationData) {
    return <LoadingScreen message={t('adminLayout.loadingConfig')} />;
  }

  return (
    <QuotationViewer
      initialQuotationData={initialQuotationData}
      allThemes={allThemes}
      isAdminView={true}
    />
  );
};

export default AdminLayout;