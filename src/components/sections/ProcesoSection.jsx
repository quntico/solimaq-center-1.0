import React, { useState, useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Layers, Edit, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { iconMap } from '@/lib/iconMap';
import ProcessEditorModal from '@/components/ProcessEditorModal';
import { Button } from '@/components/ui/button';

const defaultContent = {
  steps: [
    {
      id: 'extrusion',
      title: '01 - Extrusión de Alta Precisión',
      icon: 'Layers',
      details: [
        '- Extrusora SJ120/38 con tornillo único',
        '- Capacidad de fusión hasta 600kg/h',
        '- Control de temperatura avanzado',
        '- Homogeneización perfecta del material',
      ],
    },
    {
      id: 'formado',
      title: '02 - Sistema de Formado',
      icon: 'LayoutTemplate',
      details: [
        '- Molde T de acero 5CrNiMo',
        '- Ancho efectivo 1300mm',
        '- Calibración automática',
        '- Enfriamiento controlado por agua',
      ],
    },
    {
      id: 'corte',
      title: '03 - Corte y Acabado',
      icon: 'Scissors',
      details: [
        '- Cortadora de precisión automática',
        '- Dimensiones exactas 900mm x 6mm',
        '- Sistema neumático de ajuste',
        '- Control de velocidad variable',
      ],
    },
    {
      id: 'apilado',
      title: '04 - Apilado Automático',
      icon: 'Package',
      details: [
        '- Sistema de apilado de 3 metros',
        '- Organización automática',
        '- Capacidad 200-300 piezas por hora',
        '- Listo para empaque inmediato',
      ],
    },
  ],
};

const ProcesoSection = ({ sectionData, isEditorMode, onContentChange }) => {

  const content = { ...defaultContent, ...sectionData.content };
  const steps = content.steps || defaultContent.steps;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const timelineRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start end", "end start"]
  });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const handleModalSave = (newSteps) => {
    onContentChange({ ...content, steps: newSteps });
    toast({ title: 'Flujo actualizado', description: 'Los cambios se han guardado correctamente.' });
  };

  return (
    <div className="py-16 sm:py-24 bg-black text-white relative">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative">
          <SectionHeader sectionData={sectionData} />

          {isEditorMode && (
            <div className="absolute top-0 right-0 z-20">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-600/90 text-white gap-2 shadow-lg shadow-blue-900/20"
              >
                <Settings className="w-4 h-4" />
                Editar Flujo
              </Button>
            </div>
          )}
        </div>

        <div ref={timelineRef} className="relative mt-16 max-w-5xl mx-auto">
          {/* Animated Vertical line */}
          <motion.div
            className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-0.5 bg-blue-600 origin-top"
            style={{ scaleY, transformOrigin: 'top', translateX: '-50%' }}
          />

          <div className="space-y-16">
            {steps.map((step, index) => {
              const IconComponent = iconMap[step.icon] || Layers;
              const isLeft = index % 2 === 0;

              return (
                <div key={step.id} className="grid grid-cols-[auto_1fr] sm:grid-cols-[1fr_auto_1fr] items-start gap-x-6 sm:gap-x-8">
                  {/* Left Card (Desktop only) */}
                  {isLeft && (
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.6 }}
                      className="hidden sm:block bg-gray-900/50 p-6 rounded-xl border border-blue-600/40 backdrop-blur-sm text-right shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:border-blue-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                    >
                      <TimelineCardContent step={step} />
                    </motion.div>
                  )}
                  {!isLeft && <div className="hidden sm:block"></div>}

                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="row-start-1 sm:col-start-2 sm:row-start-auto z-10 p-3 sm:p-4 bg-gray-900 rounded-full border-2 border-primary shadow-[0_0_15px_rgba(37,99,235,0.4)] relative group cursor-pointer"
                    onClick={() => isEditorMode && setIsModalOpen(true)}
                  >
                    <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-[#2563eb]" />
                    {isEditorMode && (
                      <div className="absolute inset-0 bg-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.div>

                  {/* Right Card (or Mobile Card) */}
                  <motion.div
                    initial={{ x: isLeft ? 0 : 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6 }}
                    className={`bg-gray-900/50 p-6 rounded-xl border border-blue-600/40 backdrop-blur-sm ${!isLeft ? 'sm:block' : 'sm:hidden'} shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:border-blue-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)]`}
                  >
                    <TimelineCardContent step={step} />
                  </motion.div>
                  {!isLeft && <div className="hidden sm:block"></div>}

                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ProcessEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSteps={steps}
        onSave={handleModalSave}
      />
    </div>
  );
};

const TimelineCardContent = ({ step }) => (
  <>
    <h3 className="text-base font-bold text-white mb-2 sm:text-lg">
      {step.title}
    </h3>
    <ul className="space-y-1.5 text-gray-400 text-sm flex flex-col">
      {step.details.map((detail, detailIndex) => (
        <li key={detailIndex} className="flex items-center gap-2 justify-end sm:justify-inherit">
          {/* Simple rendering, details handled in modal */}
          <span>{detail}</span>
        </li>
      ))}
    </ul>
  </>
);

export default ProcesoSection;