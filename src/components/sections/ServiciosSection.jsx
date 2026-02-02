import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { iconMap } from '@/lib/iconMap';
import { Save, X, Edit, Loader2, AlignLeft, AlignCenter, AlignJustify, CheckCircle2 } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import EditableField from '@/components/EditableField';
import { cn } from '@/lib/utils';


const ServiciosSection = ({ sectionData, isEditorMode, onContentChange, activeTheme }) => {
  const { toast } = useToast();
  const [savingIndex, setSavingIndex] = useState(null);

  const defaultServices = [
    { id: 1, icon: 'Settings', title: 'Ingeniería y Desarrollo', description: 'Nuestro equipo de ingeniería diseña y optimiza cada componente de la línea de extrusión para maximizar la eficiencia y compatibilidad entre los equipos.', align: 'center' },
    { id: 2, icon: 'Building2', title: 'Fabricación a la Medida', description: 'Fabricamos la maquinaria según las especificaciones acordadas, utilizando acero de alta calidad y componentes de alta calidad para una operación confiable.', align: 'center' },
    { id: 3, icon: 'Package', title: 'Embalaje y Logística', description: 'Coordinamos el embalaje seguro de todos los equipos y gestionamos la logística internacional para que llegue en perfectas condiciones hasta sus instalaciones.', align: 'center' },
    { id: 4, icon: 'Wrench', title: 'Instalación y Puesta en Marcha', description: 'Nuestros técnicos especializados supervisan la instalación completa en la línea de producción y la puesta en marcha para garantizar el funcionamiento óptimo.', align: 'center' },
    { id: 5, icon: 'Users', title: 'Capacitación del Personal', description: 'Ofrecemos capacitación exhaustiva para su equipo operativo y de mantenimiento, cubriendo todos los aspectos del funcionamiento y cuidado de la maquinaria.', align: 'center' },
    { id: 6, icon: 'Shield', title: 'Soporte y Garantía', description: 'Proporcionamos un año completo de garantía con soporte técnico 24/7 para resolver cualquier duda o incidencia que pueda surgir.', align: 'center' },
  ];

  const defaultContent = {
    subtitle: 'Una solución integral que va más allá de la maquinaria, garantizando el éxito de principio a fin.',
    services: defaultServices,
  };

  const content = sectionData.content || defaultContent;
  const services = content.services || defaultServices;

  const handleSave = async (index, field, value) => {
    console.log(`[ServiciosSection] handleSave: index=${index}, field=${field}, value=${value}`);
    const updatedServices = services.map((service, i) =>
      i === index ? { ...service, [field]: value } : service
    );
    const newContent = { ...content, services: updatedServices };
    await onContentChange(newContent);
  };

  const handleManualSave = async (index) => {
    console.log(`[ServiciosSection] handleManualSave: index=${index}`);
    setSavingIndex(index);
    try {
      // Explicitly trigger save for the whole array to ensure DB sync
      // We await to give the user real feedback
      await onContentChange({ ...content, services: services });

      setTimeout(() => {
        setSavingIndex(null);
        toast({
          title: "¡Guardado con éxito! ✅",
          description: "Los cambios de este módulo han sido sincronizados en la nube.",
          variant: "default",
        });
      }, 300);
    } catch (err) {
      console.error("[ServiciosSection] Manual Save Error:", err);
      setSavingIndex(null);
      toast({
        title: "Fallo al guardar",
        description: "No se pudo sincronizar el módulo. Reintenta.",
        variant: "destructive",
      });
    }
  };

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

  const isNormatividad = sectionData.id?.toLowerCase().includes('normatividad') ||
    (sectionData.label && sectionData.label.toLowerCase().includes('normatividad')) ||
    (sectionData.content?.title && sectionData.content.title.toLowerCase().includes('normatividad'));

  // Industrial Colors
  const YELLOW_PRIMARY = "#eab308";
  const YELLOW_BORDER = "rgba(234, 179, 8, 0.3)";

  return (
    <div className="py-16 sm:py-24 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader sectionData={sectionData} isEditorMode={isEditorMode} onContentChange={onContentChange} />

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon] || iconMap['Settings'];
            const currentAlign = service.align || 'center';

            return (
              <motion.div
                key={service.id || index}
                className={cn(
                  "bg-gray-900/50 p-8 rounded-2xl border transition-all duration-300 flex flex-col relative group/card",
                  isNormatividad
                    ? "border-yellow-500/30 hover:border-yellow-500 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                    : "border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:border-primary",
                  currentAlign === 'center' ? "items-center" : "items-start"
                )}
                style={{
                  borderColor: isNormatividad ? YELLOW_BORDER : undefined,
                  textAlign: currentAlign === 'justify' ? 'justify' : currentAlign,
                  textJustify: currentAlign === 'justify' ? 'inter-word' : undefined
                }}
                variants={itemVariants}
              >
                {/* TOOLBAR ALINEACION Y GUARDADO DIRECTO */}
                {isEditorMode && (
                  <div className={cn(
                    "absolute top-4 right-4 flex gap-1 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border opacity-0 group-hover/card:opacity-100 transition-all duration-300 z-10 shadow-2xl",
                    isNormatividad ? "border-yellow-500/50" : "border-white/20"
                  )}>
                    <button
                      onClick={() => handleSave(index, 'align', 'left')}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        currentAlign === 'left'
                          ? (isNormatividad ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "text-white bg-primary shadow-lg shadow-primary/20")
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      )}
                      title="Izquierda"
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button
                      onClick={() => handleSave(index, 'align', 'center')}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        currentAlign === 'center'
                          ? (isNormatividad ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "text-white bg-primary shadow-lg shadow-primary/20")
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      )}
                      title="Centro"
                    >
                      <AlignCenter size={16} />
                    </button>
                    <button
                      onClick={() => handleSave(index, 'align', 'justify')}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        currentAlign === 'justify'
                          ? (isNormatividad ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "text-white bg-primary shadow-lg shadow-primary/20")
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      )}
                      title="Justificado"
                    >
                      <AlignJustify size={16} />
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1 self-center" />

                    <button
                      onClick={() => handleManualSave(index)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        savingIndex === index
                          ? "bg-green-500 text-white"
                          : "bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white"
                      )}
                      title="Guardar Módulo"
                    >
                      {savingIndex === index ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                    </button>
                  </div>
                )}

                <div className={cn(
                  "mb-6 p-5 rounded-full border relative group transition-colors",
                  isNormatividad ? "bg-yellow-500/10 border-yellow-500/20" : "bg-primary/10 border-primary/20"
                )}>
                  <IconPicker
                    value={service.icon}
                    onChange={(val) => handleSave(index, 'icon', val)}
                    isEditorMode={isEditorMode}
                    trigger={
                      <div className="cursor-pointer">
                        <IconComponent className={cn("w-12 h-12 transition-colors", isNormatividad ? "text-yellow-500" : "text-primary")} />
                        {isEditorMode && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>
                <h3
                  className="text-xl font-bold text-white mb-3 w-full"
                  style={{ textAlign: currentAlign === 'justify' ? 'justify' : currentAlign }}
                >
                  <EditableField
                    value={service.title}
                    onSave={(v) => handleSave(index, 'title', v)}
                    isEditorMode={isEditorMode}
                    textAlign={currentAlign}
                    className={cn(
                      "w-full",
                      currentAlign === 'center' ? "justify-center" : "justify-start"
                    )}
                    inputClassName={cn(
                      currentAlign === 'center' ? "text-center" : currentAlign === 'justify' ? "text-justify" : "text-left",
                      isNormatividad && "text-yellow-500 font-bold"
                    )}
                    style={{ color: isNormatividad ? YELLOW_PRIMARY : undefined, textAlign: currentAlign === 'justify' ? 'justify' : currentAlign }}
                  />
                </h3>
                <div
                  className={cn(
                    "text-gray-400 text-sm leading-relaxed w-full",
                    currentAlign === 'center' ? "text-center" :
                      currentAlign === 'left' ? "text-left" : "text-justify"
                  )}
                  style={{
                    textAlign: currentAlign === 'justify' ? 'justify' : currentAlign,
                    textJustify: currentAlign === 'justify' ? 'inter-word' : undefined
                  }}
                >
                  <EditableField
                    value={service.description}
                    onSave={(v) => handleSave(index, 'description', v)}
                    isEditorMode={isEditorMode}
                    textAlign={currentAlign}
                    tag="p"
                    multiline={true}
                    className={cn(
                      "w-full",
                      currentAlign === 'center' ? "justify-center text-center" : "justify-start"
                    )}
                    inputClassName={cn(
                      currentAlign === 'center' ? "text-center" : currentAlign === 'justify' ? "text-justify" : "text-left"
                    )}
                    style={{
                      textAlign: currentAlign === 'justify' ? 'justify' : currentAlign,
                      textJustify: currentAlign === 'justify' ? 'inter-word' : undefined
                    }}
                  />
                </div>

                {/* Indicador de Guardado Temporal */}
                <AnimatePresence>
                  {savingIndex === index && (
                    <motion.div
                      key="sync-indicator"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20 pointer-events-none"
                    >
                      <CheckCircle2 className="w-12 h-12 text-green-500 mb-2 animate-bounce" />
                      <span className="text-white font-bold tracking-widest text-xs">SINCRONIZADO</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default ServiciosSection;