import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingScreen from '@/components/LoadingScreen';
import QuotationViewer from '@/components/QuotationViewer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const ClientLayout = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [quotationData, setQuotationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!slug) {
        setError(t('clientLayout.noSlug'));
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Connection/Existence Check (Lightweight)
      try {
        const { data: lightData, error: lightError } = await supabase
          .from('quotations')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        // If not found, try lowercase
        let exists = !!lightData;
        if (!exists && !lightError) {
          const { data: lowerData } = await supabase
            .from('quotations')
            .select('id')
            .eq('slug', slug.toLowerCase())
            .maybeSingle();
          exists = !!lowerData;
        }

        if (!exists) {
          setError(t('clientLayout.notFound'));
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.error("Existence check failed:", checkErr);
      }

      // 2. Full Data Load (with longer timeout)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 60000)
      );

      try {
        // Try Exact Match First (Full Data)
        const exactMatchPromise = supabase
          .from('quotations')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        let response = await Promise.race([exactMatchPromise, timeoutPromise]);

        // Fallback to lowercase if needed
        if (!response.data && !response.error) {
          const lowerCasePromise = supabase
            .from('quotations')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .maybeSingle();
          response = await Promise.race([lowerCasePromise, timeoutPromise]);
        }

        const { data, error: fetchError } = response;

        if (fetchError) {
          throw fetchError;
        } else if (data) {
          setQuotationData(data);
        } else {
          setError(t('clientLayout.notFound'));
        }
      } catch (err) {
        console.error('Error fetching quotation details:', err);

        // --- SAFE MODE FALLBACK ---
        // If main fetch failed (likely timeout/size), try fetching minimal metadata
        if (err.message === 'Timeout' || err.message.includes('JSON')) {
          try {
            console.log("Attempting Safe Mode fetch...");
            const { data: safeData, error: safeError } = await supabase
              .from('quotations')
              .select('id, slug, project, client, theme_key')
              .eq('slug', slug)
              .maybeSingle();

            if (!safeError && safeData) {
              // Load with empty config to allow access
              setQuotationData({
                ...safeData,
                sections_config: [], // Empty config
                is_safe_mode: true
              });
              // Show persistent error toast
              setTimeout(() => {
                const warning = document.createElement('div');
                warning.innerHTML = `
                   <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; z-index: 9999; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                     ⚠️ MODO SEGURO: El proyecto es demasiado pesado. Se cargó sin configuración.
                   </div>
                 `;
                document.body.appendChild(warning);
                setTimeout(() => warning.remove(), 8000);
              }, 500);
              return; // Skip final error set
            }
          } catch (safeErr) {
            console.error("Safe Mode also failed:", safeErr);
          }
        }

        if (err.message === 'Timeout') {
          setError("El proyecto excede el tiempo límite de carga (60s). Intenta recargar.");
        } else {
          setError(err.message || t('clientLayout.loadError'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [slug, t]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !quotationData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{t('clientLayout.notFoundTitle')}</h1>
        <p className="text-lg mb-8 max-w-md">{error || t('clientLayout.notFoundText')}</p>
        <Button onClick={() => navigate('/')}>{t('clientLayout.goHome')}</Button>
      </div>
    );
  }

  return <QuotationViewer initialQuotationData={quotationData} isAdminView={false} />;
};

export default ClientLayout;