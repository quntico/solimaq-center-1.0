import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { Edit, Save, X, Loader2, Zap, ArrowRight, ChevronsRight, Atom, Gauge, Box, AlignLeft, AlignCenter, AlignJustify } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import { iconMap } from '@/lib/iconMap';

const EditableText = ({ value, alignment = 'left', onSave, isEditorMode, className = '', tag: Tag = 'p' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const [currentAlign, setCurrentAlign] = useState(alignment);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setText(value);
    setCurrentAlign(alignment);
  }, [value, alignment]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(text, currentAlign);
    setIsSaving(false);
    setIsEditing(false);
  };

  const getAlignmentClass = (align) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'justify': return 'text-justify';
      default: return 'text-left';
    }
  };

  if (!isEditorMode) {
    return <Tag className={`${className} ${getAlignmentClass(alignment)}`}>{value}</Tag>;
  }

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2 bg-gray-800 p-1 rounded-md w-fit">
            <button
              onClick={() => setCurrentAlign('left')}
              className={`p-1 rounded ${currentAlign === 'left' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentAlign('center')}
              className={`p-1 rounded ${currentAlign === 'center' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => setCurrentAlign('justify')}
              className={`p-1 rounded ${currentAlign === 'justify' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <AlignJustify size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full bg-gray-900 border border-primary rounded-md p-2 text-white focus:outline-none min-h-[60px] ${getAlignmentClass(currentAlign)}`}
            />
            <div className="flex flex-col gap-2">
              <button onClick={handleSave} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-500" disabled={isSaving}>
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
              <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Tag
          onClick={() => setIsEditing(true)}
          className={`${className} ${getAlignmentClass(alignment)} cursor-pointer p-1 border border-transparent group-hover:border-primary/30 rounded-md transition-all relative whitespace-pre-wrap`}
        >
          <Edit className="absolute top-1 right-1 w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <ChevronsRight className="w-4 h-4 text-primary mr-2 mt-1 flex-shrink-0" />
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
          <Edit className="absolute top-2 right-2 w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start">
                <ChevronsRight className="w-4 h-4 text-primary mr-2 mt-1 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


const SpecCard = ({ iconName, title, titleAlignment, value, alignment, onSave, onIconChange, isEditorMode }) => {
  const Icon = iconMap[iconName] || iconMap['Zap'];
  const isCentered = titleAlignment === 'center';

  return (
    <motion.div
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      className="bg-gray-900/50 p-6 rounded-xl border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300 h-full flex flex-col"
    >
      <div className={`flex ${isCentered ? 'flex-col items-center text-center' : 'items-center gap-3'} mb-4`}>
        <div className="relative">
          {isEditorMode ? (
            <IconPicker value={iconName} onChange={onIconChange} isEditorMode={isEditorMode}>
              <div className="cursor-pointer p-2 rounded-full hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/50">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </IconPicker>
          ) : (
            <Icon className="w-6 h-6 text-primary" />
          )}
        </div>
        <EditableText
          tag="h3"
          className={`text-lg font-bold text-primary ${isCentered ? 'mt-2' : ''}`}
          value={title}
          alignment={titleAlignment}
          onSave={(v, a) => onSave('title', v, a)}
          isEditorMode={isEditorMode}
        />
      </div>
      <div className="text-gray-400 mt-auto">
        <EditableText
          value={value}
          alignment={alignment}
          onSave={(v, a) => onSave('value', v, a)}
          isEditorMode={isEditorMode}
        />
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

  const handleSaveWithAlign = (key, value, alignment) => {
    const newContent = {
      ...content,
      [key]: value,
      [`${key}_align`]: alignment
    };
    onContentChange(newContent);
    toast({ title: 'Contenido guardado ☁️' });
  };

  const handleSaveNested = (parentKey, field, value, alignment) => {
    const newContent = {
      ...content,
      [parentKey]: {
        ...content[parentKey],
        [field]: value,
        [`${field}_align`]: alignment
      }
    };
    onContentChange(newContent);
    toast({ title: 'Contenido guardado ☁️' });
  };

  const handleSpecCardSave = (index, field, value, alignment) => {
    const newSpecs = [...content.specs];
    newSpecs[index][field] = value;
    if (alignment) {
      newSpecs[index][`${field}_align`] = alignment;
    }
    handleSave('specs', newSpecs);
  };

  const handleFeatureSave = (index, field, value, alignment) => {
    const newFeatures = [...content.features];
    newFeatures[index][field] = value;
    if (alignment) {
      newFeatures[index][`${field}_align`] = alignment;
    }
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
            <EditableText
              value={content.specsTitle}
              alignment={content.specsTitle_align}
              onSave={(v, a) => handleSaveWithAlign('specsTitle', v, a)}
              isEditorMode={isEditorMode}
              tag="span"
            />
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
                titleAlignment={spec.title_align}
                value={spec.value}
                alignment={spec.value_align}
                isEditorMode={isEditorMode}
                onSave={(field, value, alignment) => handleSpecCardSave(index, field, value, alignment)}
                onIconChange={(newIcon) => handleSpecCardSave(index, 'icon', newIcon)}
              />
            ))}
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-400">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300">
              <EditableText
                tag="h4"
                className="font-bold text-primary mb-2"
                value={content.materiaPrima.title}
                alignment={content.materiaPrima.title_align}
                onSave={(v, a) => handleSaveNested('materiaPrima', 'title', v, a)}
                isEditorMode={isEditorMode}
              />
              <p>
                <EditableText
                  value={content.materiaPrima.value}
                  alignment={content.materiaPrima.value_align}
                  onSave={(v, a) => handleSaveNested('materiaPrima', 'value', v, a)}
                  isEditorMode={isEditorMode}
                />
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300">
              <EditableText
                tag="h4"
                className="font-bold text-primary mb-2"
                value={content.specProducto.title}
                alignment={content.specProducto.title_align}
                onSave={(v, a) => handleSaveNested('specProducto', 'title', v, a)}
                isEditorMode={isEditorMode}
              />
              <p>
                <EditableText
                  value={content.specProducto.value}
                  alignment={content.specProducto.value_align}
                  onSave={(v, a) => handleSaveNested('specProducto', 'value', v, a)}
                  isEditorMode={isEditorMode}
                />
              </p>
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
              <EditableText
                value={content.featuresTitle}
                alignment={content.featuresTitle_align}
                onSave={(v, a) => handleSaveWithAlign('featuresTitle', v, a)}
                isEditorMode={isEditorMode}
                tag="span"
              />
            </h2>
            <div className="max-w-2xl mx-auto text-gray-400">
              <EditableText
                value={content.featuresSubtitle}
                alignment={content.featuresSubtitle_align}
                onSave={(v, a) => handleSaveWithAlign('featuresSubtitle', v, a)}
                isEditorMode={isEditorMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {content.features.map((feature, index) => (
              <motion.div
                key={feature.id}
                className="bg-gray-900/50 p-8 rounded-2xl border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-2xl font-bold text-primary mb-4">
                  <span className="text-primary">0{feature.id} - </span>
                  <EditableText
                    value={feature.title}
                    alignment={feature.title_align}
                    onSave={(v, a) => handleFeatureSave(index, 'title', v, a)}
                    isEditorMode={isEditorMode}
                    tag="span"
                  />
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