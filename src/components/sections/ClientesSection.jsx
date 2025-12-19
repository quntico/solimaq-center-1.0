import React from 'react';
import GenericSection from '@/components/sections/GenericSection';
import { useLanguage } from '@/contexts/LanguageContext';

const ClientesSection = (props) => {
  const { t } = useLanguage();
  return <GenericSection title={t('sections.clientes')} description={t('generic.notImplemented')} {...props} />;
};

export default ClientesSection;