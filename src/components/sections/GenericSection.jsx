import React from 'react';
import { Edit, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PropuestaEconomicaSection from '@/components/sections/PropuestaEconomicaSection';

const GenericSection = ({ sectionData = {}, isEditorMode, onContentChange, ...props }) => {
  const type = sectionData.type?.toLowerCase() || '';
  const id = sectionData.id?.toLowerCase() || '';
  const title = sectionData.title?.toLowerCase() || '';

  const isPropuestaEconomica = 
    type === 'propuesta_economica' || 
    type === 'propuesta-economica' || 
    id.includes('propuesta') ||
    title.includes('propuesta económica');

  if (isPropuestaEconomica) {
    return (
      <PropuestaEconomicaSection
        sectionData={sectionData}
        isEditorMode={isEditorMode}
        onContentChange={onContentChange}
        {...props}
      />
    );
  }

  return (
    <section className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-black text-center px-4 py-20 border-t border-gray-900">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-lg"
      >
        <div className="mb-8 relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-gray-900/80 p-6 rounded-2xl border-2 border-dashed border-gray-800 group-hover:border-gray-700 transition-colors">
             <Edit className="w-12 h-12 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Sección en Construcción</h2>
        <p className="text-gray-500 text-lg leading-relaxed mb-8">
          Este es un espacio reservado para tu nuevo contenido. Puedes empezar a editar esta sección en el "Modo Editor".
        </p>
      </motion.div>
    </section>
  );
};

export default GenericSection;