import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Building2, FolderKanban, User } from 'lucide-react';

const InfoCard = ({ icon: Icon, label, value, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
    className="bg-[#111111] p-6 rounded-2xl flex-1 min-w-[280px] sm:min-w-0"
  >
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-blue-500 font-semibold uppercase tracking-wider">{label}</span>
      <Icon className="w-6 h-6 text-blue-500" />
    </div>
    <p className="text-2xl font-bold text-white tracking-wide">{value}</p>
  </motion.div>
);

const PortadaSection = ({ quotationData }) => {
  const { t } = useLanguage();
  const cardData = [
    {
      icon: Building2,
      label: t('sections.portadaDetails.empresa'),
      value: quotationData.company,
    },
    {
      icon: FolderKanban,
      label: t('sections.portadaDetails.proyecto'),
      value: quotationData.project,
    },
    {
      icon: User,
      label: t('sections.portadaDetails.cliente'),
      value: quotationData.client,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-black px-4 py-16">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-16">
        {/* Title and Subtitle */}
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl md:text-8xl font-black text-white tracking-tighter"
          >
            {quotationData.title}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold text-blue-500 tracking-tight"
          >
            {quotationData.subtitle}
          </motion.h2>
        </div>

        {/* Info Cards */}
        <div className="w-full flex flex-col md:flex-row justify-center gap-6">
          {cardData.map((card, index) => (
            <InfoCard key={index} {...card} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortadaSection;