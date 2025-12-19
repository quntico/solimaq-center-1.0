import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { Edit, Save, X, Loader2, Zap, ArrowRight, ChevronsRight, Atom, Gauge, Box } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import { iconMap } from '@/lib/iconMap';

const EditableText = ({ value, onSave, isEditorMode, className = '', tag: Tag = 'p' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(text);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (!isEditorMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-gray-900 border border-primary rounded-md p-2 text-white focus:outline-none"
          />
          <button onClick={handleSave} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-500" disabled={isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          </button>
          <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700">
            <X size={14} />
          </button>
        </div>
      ) : (
        <Tag onClick={() => setIsEditing(true)} className={`${className} cursor-pointer p-1 border border-transparent group-hover:border-primary/30 rounded-md transition-all relative`}>
          <Edit className="absolute top-1 right-1 w-3 h-3 text-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity" />
          {value}
        </Tag>
      )}
    </div>
  );
};


const EditableList = ({ items, onSave, isEditorMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [listItems, setListItems] = useState(items.join('\n'));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(listItems.split('\n'));
    setIsSaving(false);
    setIsEditing(false);
  };

  if (!isEditorMode) {
    return (
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start">
            <ChevronsRight className="w-4 h-4 text-[#2563eb] mr-2 mt-1 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={listItems}
            onChange={(e) => setListItems(e.target.value)}
            className="w-full bg-gray-900 border border-primary rounded-md p-2 text-white resize-y focus:outline-none text-sm min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleSave} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-500" disabled={isSaving}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)} className="cursor-pointer p-2 border border-transparent group-hover:border-primary/30 rounded-md transition-all relative">
          <Edit className="absolute top-2 right-2 w-4 h-4 text-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity" />
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start">
                <ChevronsRight className="w-4 h-4 text-[#2563eb] mr-2 mt-1 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


const SpecCard = ({ iconName, title, value, onSave, onIconChange, isEditorMode }) => {
  const Icon = iconMap[iconName] || iconMap['Zap'];

  return (
    <motion.div
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      className="bg-gray-900/50 p-6 rounded-xl border border-[#2563eb]/50 shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          {isEditorMode ? (
            <IconPicker value={iconName} onChange={onIconChange} isEditorMode={isEditorMode}>
              <div className="cursor-pointer p-2 rounded-full hover:bg-blue-500/10 transition-colors border border-transparent hover:border-[#2563eb]/50">
                <Icon className="w-6 h-6 text-[#2563eb]" />
              </div>
            </IconPicker>
          ) : (
            <Icon className="w-6 h-6 text-[#2563eb]" />
          )}
        </div>
        <h3 className="text-lg font-bold text-[#2563eb]">
          <EditableText value={title} onSave={(v) => onSave('title', v)} isEditorMode={isEditorMode} tag="span" />
        </h3>
      </div>
      <div className="text-gray-400">
        <EditableText value={value} onSave={(v) => onSave('value', v)} isEditorMode={isEditorMode} />
      </div>
    </motion.div>
  );
};

const GeneralesSection = ({ sectionData, isEditorMode, onContentChange }) => {
  const { t } = useLanguage(); // Ensure hook is called
  const { toast } = useToast();

  const defaultContent = {
    specsTitle: t('sections.generalesDetails.specsTitle'),
    specs: [
      { id: 'capacidad', icon: 'Zap', title: 'Capacidad de Fusión', value: 'Máximo: 600kg/h (dependiendo de la proporción de CaCO₃)' },
      { id: 'velocidad', icon: 'ArrowRight', title: 'Velocidad de Arrastre', value: 'Máxima: 2-4.5 metros/min' },
      { id: 'altura', icon: 'Gauge', title: 'Altura Central', value: '1 metro de altura operativa' },
    ],
    materiaPrima: { title: t('sections.generalesDetails.materiaPrima'), value: 'Resina PE, PE reciclado, lubricante, agente estabilizador, pigmento de titanio, agente anti-ultravioleta, pigmentos, etc.' },
    specProducto: { title: t('sections.generalesDetails.specProducto'), value: 'Capas: una capa | Ancho: 900mm | Espesor: 6mm' },
    featuresTitle: t('sections.generalesDetails.featuresTitle'),
    featuresSubtitle: t('sections.generalesDetails.featuresSubtitle'),
    features: [
      { id: 1, title: 'Extrusión de Alta Precisión', items: ['Extrusora SJ120/38 con tornillo único', 'Capacidad de fusión hasta 600kg/h', 'Control de temperatura avanzado', 'Homogeneización perfecta del material'] },
      { id: 2, title: 'Sistema de Formado', items: ['Molde T de acero 5CrNiMo', 'Ancho efectivo 1300mm', 'Calibración automática', 'Enfriamiento controlado por agua'] },
      { id: 3, title: 'Corte y Acabado', items: ['Cortadora de precisión automática', 'Dimensiones exactas 900mm x 6mm', 'Sistema neumático de ajuste', 'Control de velocidad variable'] },
      { id: 4, title: 'Apilado Automático', items: ['Sistema de apilado de 3 metros', 'Organización automática', 'Capacidad 200-300 piezas por hora', 'Listo para empaque inmediato'] },
    ],
  };

  // Merge logic: prefer translation if DB content matches the Spanish default
  const spanishDefaults = {
    specsTitle: 'Especificaciones Generales del Proyecto',
    materiaPrima: 'Materia Prima',
    specProducto: 'Especificaciones del Producto',
    featuresTitle: 'Características Clave',
    featuresSubtitle: 'Descubre los componentes esenciales que hacen de nuestra línea la mejor opción para tu producción.',
  };

  const mergedContent = { ...defaultContent, ...sectionData.content };

  // Override with translation if the current value matches the known Spanish default
  if (mergedContent.specsTitle === spanishDefaults.specsTitle) mergedContent.specsTitle = t('sections.generalesDetails.specsTitle');
  if (mergedContent.materiaPrima.title === spanishDefaults.materiaPrima) mergedContent.materiaPrima.title = t('sections.generalesDetails.materiaPrima');
  if (mergedContent.specProducto.title === spanishDefaults.specProducto) mergedContent.specProducto.title = t('sections.generalesDetails.specProducto');
  if (mergedContent.featuresTitle === spanishDefaults.featuresTitle) mergedContent.featuresTitle = t('sections.generalesDetails.featuresTitle');
  if (mergedContent.featuresSubtitle === spanishDefaults.featuresSubtitle) mergedContent.featuresSubtitle = t('sections.generalesDetails.featuresSubtitle');

  const content = mergedContent;

  const handleSave = (key, value) => {
    const newContent = { ...content, [key]: value };
    onContentChange(newContent);
    toast({ title: 'Contenido guardado ☁️' });
  };

  const handleSpecCardSave = (index, field, value) => {
    const newSpecs = [...content.specs];
    newSpecs[index][field] = value;
    handleSave('specs', newSpecs);
  };

  const handleFeatureSave = (index, field, value) => {
    const newFeatures = [...content.features];
    newFeatures[index][field] = value;
    handleSave('features', newFeatures);
  };

  const iconMapping = {
    'Capacidad de Fusión': Atom,
    'Velocidad de Arrastre': ChevronsRight,
    'Altura Central': Gauge,
    'default': Zap
  };

  return (
    <div className="py-16 sm:py-24 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 space-y-24">
        {/* SectionHeader for the main title */}
        <SectionHeader sectionData={sectionData} />

        {/* Especificaciones Generales */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <EditableText value={content.specsTitle} onSave={(v) => handleSave('specsTitle', v)} isEditorMode={isEditorMode} tag="span" />
          </h2>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            {content.specs.map((spec, index) => (
              <SpecCard
                key={spec.id}
                iconName={spec.icon}
                title={spec.title}
                value={spec.value}
                isEditorMode={isEditorMode}
                onSave={(field, value) => handleSpecCardSave(index, field, value)}
                onIconChange={(newIcon) => handleSpecCardSave(index, 'icon', newIcon)}
              />
            ))}
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-400">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-[#2563eb]/50 shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300">
              <h4 className="font-bold text-[#2563eb] mb-2"><EditableText value={content.materiaPrima.title} onSave={(v) => handleSave('materiaPrima', { ...content.materiaPrima, title: v })} isEditorMode={isEditorMode} tag="span" /></h4>
              <p><EditableText value={content.materiaPrima.value} onSave={(v) => handleSave('materiaPrima', { ...content.materiaPrima, value: v })} isEditorMode={isEditorMode} /></p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-[#2563eb]/50 shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300">
              <h4 className="font-bold text-[#2563eb] mb-2"><EditableText value={content.specProducto.title} onSave={(v) => handleSave('specProducto', { ...content.specProducto, title: v })} isEditorMode={isEditorMode} tag="span" /></h4>
              <p><EditableText value={content.specProducto.value} onSave={(v) => handleSave('specProducto', { ...content.specProducto, value: v })} isEditorMode={isEditorMode} /></p>
            </div>
          </div>
        </motion.div>

        {/* Características Clave */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <EditableText value={content.featuresTitle} onSave={(v) => handleSave('featuresTitle', v)} isEditorMode={isEditorMode} tag="span" />
            </h2>
            <p className="max-w-2xl mx-auto text-gray-400">
              <EditableText value={content.featuresSubtitle} onSave={(v) => handleSave('featuresSubtitle', v)} isEditorMode={isEditorMode} />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {content.features.map((feature, index) => (
              <motion.div
                key={feature.id}
                className="bg-gray-900/50 p-8 rounded-2xl border border-[#2563eb]/50 shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-2xl font-bold text-[#2563eb] mb-4">
                  <span className="text-[#2563eb]">0{feature.id} - </span>
                  <EditableText value={feature.title} onSave={(v) => handleFeatureSave(index, 'title', v)} isEditorMode={isEditorMode} tag="span" />
                </h3>
                <div className="text-gray-300">
                  <EditableList items={feature.items} onSave={(v) => handleFeatureSave(index, 'items', v)} isEditorMode={isEditorMode} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GeneralesSection;