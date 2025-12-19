import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { iconMap } from '@/lib/iconMap';
import { supabase } from '@/lib/customSupabaseClient';
import { Save, X, Edit, Loader2 } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import EditableField from '@/components/EditableField';


const ServiciosSection = ({ sectionData, isEditorMode, onContentChange, activeTheme }) => {
  const { toast } = useToast();

  const defaultServices = [
    { id: 1, icon: 'Settings', title: 'Ingeniería y Desarrollo', description: 'Nuestro equipo de ingeniería diseña y optimiza cada componente de la línea de extrusión para maximizar la eficiencia y compatibilidad entre los equipos.' },
    { id: 2, icon: 'Building2', title: 'Fabricación a la Medida', description: 'Fabricamos la maquinaria según las especificaciones acordadas, utilizando acero de alta calidad y componentes de alta calidad para una operación confiable.' },
    { id: 3, icon: 'Package', title: 'Embalaje y Logística', description: 'Coordinamos el embalaje seguro de todos los equipos y gestionamos la logística internacional para que llegue en perfectas condiciones hasta sus instalaciones.' },
    { id: 4, icon: 'Wrench', title: 'Instalación y Puesta en Marcha', description: 'Nuestros técnicos especializados supervisan la instalación completa en la línea de producción y la puesta en marcha para garantizar el funcionamiento óptimo.' },
    { id: 5, icon: 'Users', title: 'Capacitación del Personal', description: 'Ofrecemos capacitación exhaustiva para su equipo operativo y de mantenimiento, cubriendo todos los aspectos del funcionamiento y cuidado de la maquinaria.' },
    { id: 6, icon: 'Shield', title: 'Soporte y Garantía', description: 'Proporcionamos un año completo de garantía con soporte técnico 24/7 para resolver cualquier duda o incidencia que pueda surgir.' },
  ];

  const defaultContent = {
    subtitle: 'Una solución integral que va más allá de la maquinaria, garantizando el éxito de principio a fin.',
    services: defaultServices,
  };

  const content = sectionData.content || defaultContent;
  const services = content.services || defaultServices;

  const handleSave = async (index, field, value) => {
    const updatedServices = services.map((service, i) =>
      i === index ? { ...service, [field]: value } : service
    );
    const newContent = { ...content, services: updatedServices };

    await onContentChange(newContent);
    toast({ title: 'Servicio actualizado', description: 'El cambio se ha guardado en la nube. ☁️' });
  };

  const handleSubtitleSave = async (value) => {
    const newContent = { ...content, subtitle: value };
    await onContentChange(newContent);
    toast({ title: 'Subtítulo actualizado', description: 'El cambio se ha guardado en la nube. ☁️' });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <div className="py-16 sm:py-24 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader sectionData={sectionData} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center max-w-3xl mx-auto -mt-4 mb-12 sm:mb-16 text-gray-400"
        >
          <EditableField
            value={content.subtitle}
            onSave={handleSubtitleSave}
            isEditorMode={isEditorMode}
            className="text-lg"
          />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon] || iconMap['Settings'];
            return (
              <motion.div
                key={service.id}
                className="bg-gray-900/50 p-8 rounded-2xl border border-blue-600/40 shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:border-blue-500 transition-all duration-300 flex flex-col items-center text-center"
                variants={itemVariants}
              >
                <div className="mb-6 bg-blue-600/10 p-5 rounded-full border border-blue-600/20 relative group">
                  <IconPicker
                    value={service.icon}
                    onChange={(val) => handleSave(index, 'icon', val)}
                    isEditorMode={isEditorMode}
                    trigger={
                      <div className="cursor-pointer">
                        <IconComponent className="w-12 h-12 text-blue-600" />
                        {isEditorMode && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 w-full">
                  <EditableField
                    value={service.title}
                    onSave={(v) => handleSave(index, 'title', v)}
                    isEditorMode={isEditorMode}
                    className="text-center justify-center"
                    inputClassName="text-center"
                  />
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed w-full">
                  <EditableField
                    value={service.description}
                    onSave={(v) => handleSave(index, 'description', v)}
                    isEditorMode={isEditorMode}
                    tag="p"
                    className="text-center"
                    inputClassName="text-center"
                  />
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default ServiciosSection;