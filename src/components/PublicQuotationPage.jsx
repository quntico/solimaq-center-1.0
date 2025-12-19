import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingScreen from '@/components/LoadingScreen';
import QuotationViewer from '@/components/QuotationViewer';
import { Button } from '@/components/ui/button';

const PublicQuotationPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [quotationData, setQuotationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!slug) {
        setError("No se proporcionó un slug.");
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
          throw fetchError;
        }

        if (data) {
          setQuotationData(data);
        } else {
          setError('No se encontró la cotización.');
        }
      } catch (err) {
        console.error('Error fetching quotation by slug:', err);
        setError(err.message || 'Ocurrió un error al cargar la cotización.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [slug]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-lg mb-8">{error}</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }

  if (!quotationData) {
    return (
       <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <h1 className="text-2xl font-bold text-yellow-500 mb-4">No encontrado</h1>
        <p className="text-lg mb-8">La cotización que buscas no existe o fue eliminada.</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }

  return <QuotationViewer initialQuotationData={quotationData} isAdminView={false} />;
};

export default PublicQuotationPage;