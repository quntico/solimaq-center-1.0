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
      try {
        // 1. Try Exact Match
        let { data, error } = await supabase
          .from('quotations')
          .select('*')
          .eq('slug', slug)
          .single();

        // 2. If 'Row not found' (PGRST116), try lowercase fallback
        if (error && error.code === 'PGRST116') {
          const { data: lowerData, error: lowerError } = await supabase
            .from('quotations')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .single();

          // If fallback succeeded, use it
          if (!lowerError && lowerData) {
            data = lowerData;
            error = null;
          }
        }

        if (error) {
          if (error.code === 'PGRST116') setError(t('clientLayout.notFound'));
          else throw error;
        } else if (data) {
          setQuotationData(data);
        } else {
          setError(t('clientLayout.notFound'));
        }

      } catch (err) {
        console.error('Error fetching quotation:', err);
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