
import React from 'react';
import { iconMap } from '@/lib/iconMap';
import EditableField from '@/components/EditableField';
import IconPicker from '@/components/IconPicker';

const defaultCards = [
  {
    id: 1,
    icon: 'Factory',
    title: 'Alta Productividad',
    description: 'Proceso continuo estable de 500-600 kg/h gracias al diseño integrado de trituración, compactación y extrusión, reduciendo paros y maximizando la producción real.'
  },
  {
    id: 2,
    icon: 'Settings',
    title: 'Control Inteligente',
    description: 'Equipo eléctrico Siemens/Schneider y variadores ABB mantienen operación segura, precisa y fácil de ajustar, garantizando calidad constante en cada lote.'
  },
  {
    id: 3,
    icon: 'Recycle',
    title: 'Extrusión Estable',
    description: 'El aglomerador y extrusora desgasificada procesan LDPE reciclado con eficiencia, manteniendo estructura homogénea y reduciendo costos de materia prima.'
  }
];

const VentajasSection = ({ sectionData, onContentChange, isEditorMode }) => {
  const content = sectionData?.content || {};
  const title = content.title || 'Ventajas Competitivas del Sistema';
  const cards = content.cards || defaultCards;

  const handleUpdate = (key, value) => {
    onContentChange({ ...content, [key]: value });
  };

  const handleCardUpdate = (cardId, field, value) => {
    const newCards = cards.map(card =>
      card.id === cardId ? { ...card, [field]: value } : card
    );
    handleUpdate('cards', newCards);
  };

  return (
    <section className="w-full py-20 px-4 bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <EditableField
            value={title}
            onSave={(val) => handleUpdate('title', val)}
            isEditorMode={isEditorMode}
            className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider text-center"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card) => {
            const Icon = iconMap[card.icon] || iconMap['HelpCircle'];

            return (
              <div
                key={card.id}
                className="bg-gray-950 border border-blue-900/30 rounded-xl p-8 hover:border-blue-500/50 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] flex flex-col"
              >
                <div className="mb-6 self-start">
                  <IconPicker
                    value={card.icon}
                    onChange={(newIcon) => handleCardUpdate(card.id, 'icon', newIcon)}
                    isEditorMode={isEditorMode}
                    trigger={
                      <div className={isEditorMode ? "cursor-pointer hover:opacity-80" : ""}>
                        <Icon className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                      </div>
                    }
                  />
                </div>

                <div className="mb-4">
                  <EditableField
                    value={card.title}
                    onSave={(val) => handleCardUpdate(card.id, 'title', val)}
                    isEditorMode={isEditorMode}
                    className="text-xl font-bold text-blue-500 group-hover:text-blue-400 transition-colors block"
                  />
                </div>

                <div className="flex-grow">
                  <EditableField
                    value={card.description}
                    onSave={(val) => handleCardUpdate(card.id, 'description', val)}
                    isEditorMode={isEditorMode}
                    className="text-gray-400 leading-relaxed block"
                    tag="p"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VentajasSection;