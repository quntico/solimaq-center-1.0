import React from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';

const CalculadoraSection = ({ sectionData }) => {
  const { toast } = useToast();

  return (
    <div className="py-4 sm:py-12">
      <SectionHeader sectionData={sectionData} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-7xl mx-auto text-center mt-8"
      >
        <button
          onClick={() => toast({
            title: "🚧 Esta funcionalidad no está implementada aún",
            description: "¡Pero no te preocupes! Puedes solicitarla en tu próximo prompt! 🚀"
          })}
          className="px-6 py-3 sm:px-8 sm:py-4 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover transition-all text-sm sm:text-base"
        >
          Calcular Presupuesto
        </button>
      </motion.div>
    </div>
  );
};

export default CalculadoraSection;