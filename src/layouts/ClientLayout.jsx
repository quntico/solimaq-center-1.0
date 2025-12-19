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

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('quotations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // PostgREST error for "exact one row" not found
             setError(t('clientLayout.notFound'));
          } else {
            throw fetchError;
          }
        } else if (data) {
          setQuotationData(data);
        } else {
           setError(t('clientLayout.notFound'));
        }
      } catch (err) {
        console.error('Error fetching quotation by slug:', err);
        setError(err.message || t('clientLayout.loadError'));
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