import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Droplet, HardHat, Wheat, XCircle, Edit } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { useToast } from '@/components/ui/use-toast';
import { iconMap } from '@/lib/iconMap';
import IconPicker from '@/components/IconPicker';
import EditableField from '@/components/EditableField';

const ExclusionesSection = ({ sectionData, isEditorMode, onContentChange }) => {
  const { toast } = useToast();

  const defaultItems = [
    {
      id: 1,
      icon: 'Wrench',
      title: 'Maniobras de Descarga y Montaje',
      description: 'El cliente debe proveer personal y equipo (grúa, montacargas) para la descarga y montaje de la máquina.',
    },
    {
      id: 2,
      icon: 'Droplet',
      title: 'Sistema de Abastecimiento de Agua',
      description: 'La instalación de tuberías, conexiones y sistemas de recirculación de agua no están incluidos.',
    },
    {
      id: 3,
      icon: 'HardHat',
      title: 'Obra Civil y Adecuaciones',
      description: 'Cualquier modificación estructural o trabajos de construcción en el área de instalación son responsabilidad del cliente.',
    },
    {
      id: 4,
      icon: 'Wheat',
      title: 'Materias Primas Iniciales',
      description: 'Los ingredientes y materiales de empaque para las pruebas de producción y arranque no están incluidos.',
    },
  ];

  const defaultContent = {
    items: defaultItems,
  };

  const content = sectionData.content || defaultContent;
  const items = content.items || defaultItems;

  const handleSave = async (index, field, value) => {
    const updatedItems = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    const newContent = { ...content, items: updatedItems };

    await onContentChange(newContent);
    toast({ title: 'Exclusión actualizada', description: 'El cambio se ha guardado en la nube. ☁️' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
    <div id="exclusiones" className="py-12 sm:py-24 bg-black text-white">
      <div className="container mx-auto px-4">
        <SectionHeader
          sectionData={{
            ...sectionData,
            icon: 'XCircle',
            label: 'Exclusiones de la Propuesta',
          }}
          titleClassName="text-3xl md:text-5xl font-bold mb-12"
        />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {items.map((item, index) => {
            const IconComponent = iconMap[item.icon] || iconMap['XCircle'];
            return (
              <motion.div
                key={index}
                className="flex items-start space-x-6 p-6 rounded-2xl bg-gray-900/50 border border-blue-600/40 shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all duration-300 hover:bg-gray-900 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                variants={itemVariants}
              >
                <div className="flex-shrink-0 relative group">
                  <IconPicker
                    value={item.icon}
                    onChange={(val) => handleSave(index, 'icon', val)}
                    isEditorMode={isEditorMode}
                    trigger={
                      <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center border-2 border-blue-600/30 cursor-pointer">
                        <IconComponent className="w-8 h-8 text-blue-600" />
                        {isEditorMode && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-white">
                    <EditableField
                      value={item.title}
                      onSave={(v) => handleSave(index, 'title', v)}
                      isEditorMode={isEditorMode}
                    />
                  </h3>
                  <p className="text-gray-400 text-base">
                    <EditableField
                      value={item.description}
                      onSave={(v) => handleSave(index, 'description', v)}
                      isEditorMode={isEditorMode}
                      tag="span"
                    />
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default ExclusionesSection;