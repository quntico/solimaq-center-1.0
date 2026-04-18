import React, { Component } from 'react';
import { Edit, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PropuestaEconomicaSection from '@/components/sections/PropuestaEconomicaSection';
import SimuladorSection from '@/components/sections/SimuladorSection';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 border border-red-500 text-red-500 m-10 rounded">
          <h2>Crash Error in Simulador</h2>
          <pre>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const GenericSection = ({ sectionData = {}, isEditorMode, onContentChange, ...props }) => {
  const type = sectionData.type?.toLowerCase() || '';
  const id = sectionData.id?.toLowerCase() || '';
  const title = sectionData.title?.toLowerCase() || '';
  const label = sectionData.label?.toLowerCase() || '';
  const titulo = sectionData.titulo?.toLowerCase() || '';

  const isPropuestaEconomica = 
    type === 'propuesta_economica' || 
    type === 'propuesta-economica' || 
    id.includes('propuesta') ||
    title.includes('propuesta económica') ||
    titulo.includes('propuesta');

  const isSimulador = 
    id.includes('simulador') || 
    title.includes('simulador') || 
    label.includes('simulador') ||
    titulo.includes('simulador') ||
    label.includes('masas') ||
    id.includes('masas') ||
    titulo.includes('masas');

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

  if (isSimulador) {
    return (
      <ErrorBoundary>
        <SimuladorSection
          sectionData={sectionData}
          isEditorMode={isEditorMode}
          onContentChange={onContentChange}
          {...props}
        />
      </ErrorBoundary>
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