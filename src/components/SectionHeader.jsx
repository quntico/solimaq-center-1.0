import React from 'react';
import { motion } from 'framer-motion';
import { iconMap } from '@/lib/iconMap';
import EditableField from '@/components/EditableField';
import IconPicker from '@/components/IconPicker';
import { cn } from '@/lib/utils';
import { AlignLeft, AlignCenter, AlignJustify } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const SectionHeader = ({ sectionData = {}, isEditorMode, onContentChange }) => {
  const { t } = useLanguage();

  const iconKey = sectionData.content?.icon || sectionData.icon || 'FileText';
  const Icon = iconMap[iconKey] || iconMap.FileText;

  const title = sectionData.content?.title || sectionData.label || t(`sections.${sectionData.id}`);
  const subtitle = sectionData.content?.subtitle || '';
  const titleAlign = sectionData.content?.title_align || 'left';
  const subtitleAlign = sectionData.content?.subtitle_align || 'left';

  const handleTitleChange = (newTitle) => {
    if (onContentChange) {
      onContentChange({ title: newTitle });
    }
  };

  const handleSubtitleChange = (newSubtitle) => {
    if (onContentChange) {
      onContentChange({ subtitle: newSubtitle });
    }
  };

  const handleAlignChange = (field, align) => {
    if (onContentChange) {
      onContentChange({ [field]: align });
    }
  };

  const handleIconChange = (newIcon) => {
    if (onContentChange) {
      onContentChange({ icon: newIcon });
    }
  };

  const isNormatividad = sectionData.id?.toLowerCase().includes('normatividad') ||
    (sectionData.label && sectionData.label.toLowerCase().includes('normatividad')) ||
    (sectionData.content?.title && sectionData.content.title.toLowerCase().includes('normatividad'));

  // Industrial Colors
  const YELLOW_PRIMARY = "#eab308";
  const YELLOW_BORDER = "rgba(234, 179, 8, 0.3)";

  const AlignmentToolbar = ({ current, onSelect }) => (
    <div className={cn(
      "flex gap-1 bg-black/90 backdrop-blur-md p-1 rounded-full border shadow-2xl scale-90 transition-all",
      isNormatividad ? "border-yellow-500/40" : "border-white/10"
    )}>
      <button
        onClick={() => onSelect('left')}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          current === 'left'
            ? (isNormatividad ? "bg-yellow-500/20 text-yellow-500" : "text-primary bg-primary/20")
            : "text-gray-500 hover:text-gray-300"
        )}
        title="Izquierda"
      >
        <AlignLeft size={14} />
      </button>
      <button
        onClick={() => onSelect('center')}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          current === 'center'
            ? (isNormatividad ? "bg-yellow-500/20 text-yellow-500" : "text-primary bg-primary/20")
            : "text-gray-500 hover:text-gray-300"
        )}
        title="Centrar"
      >
        <AlignCenter size={14} />
      </button>
      <button
        onClick={() => onSelect('justify')}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          current === 'justify'
            ? (isNormatividad ? "bg-yellow-500/20 text-yellow-500" : "text-primary bg-primary/20")
            : "text-gray-500 hover:text-gray-300"
        )}
        title="Justificar"
      >
        <AlignJustify size={14} />
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-12 relative max-w-6xl mx-auto px-4 group/header"
    >
      <div className="flex items-start gap-6 mb-6">
        <IconPicker
          value={iconKey}
          onChange={handleIconChange}
          isEditorMode={isEditorMode}
          trigger={
            <div
              className={cn(
                "p-4 rounded-2xl border transition-all shadow-lg",
                isEditorMode && "cursor-pointer hover:scale-105 transition-transform"
              )}
              style={{
                backgroundColor: isNormatividad ? "rgba(234, 179, 8, 0.05)" : "rgba(var(--primary-rgb), 0.05)",
                borderColor: isNormatividad ? YELLOW_BORDER : "rgba(var(--primary-rgb), 0.3)",
                color: isNormatividad ? YELLOW_PRIMARY : "hsl(var(--primary))"
              }}
            >
              <Icon className="w-10 h-10" />
            </div>
          }
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 group/title-container">
            <h2
              className={cn(
                "text-4xl font-bold text-white flex-1 tracking-tight block w-full",
                titleAlign === 'center' ? "text-center" : titleAlign === 'justify' ? "text-justify" : "text-left"
              )}
              style={{ textAlign: titleAlign }}
            >
              <EditableField
                value={title}
                onSave={handleTitleChange}
                isEditorMode={isEditorMode}
                textAlign={titleAlign}
                placeholder="Título de la sección"
                className={cn(
                  "w-full",
                  titleAlign === 'center' ? "justify-center" : "justify-start"
                )}
                inputClassName={cn(
                  "text-white font-bold",
                  titleAlign === 'center' ? "text-center" : titleAlign === 'justify' ? "text-justify" : "text-left"
                )}
              />
            </h2>
            {isEditorMode && (
              <div className="opacity-0 group-hover/title-container:opacity-100 transition-opacity">
                <AlignmentToolbar current={titleAlign} onSelect={(a) => handleAlignChange('title_align', a)} />
              </div>
            )}
          </div>

          {(subtitle || isEditorMode) && (
            <div className="flex items-center gap-4 mt-2 group/subtitle-container">
              <div
                className={cn(
                  "text-gray-400 text-lg flex-1 leading-relaxed block w-full",
                  subtitleAlign === 'center' ? "text-center" : subtitleAlign === 'justify' ? "text-justify" : "text-left"
                )}
                style={{ textAlign: subtitleAlign, textJustify: subtitleAlign === 'justify' ? 'inter-word' : undefined }}
              >
                <EditableField
                  value={subtitle}
                  onSave={handleSubtitleChange}
                  isEditorMode={isEditorMode}
                  textAlign={subtitleAlign}
                  tag="p"
                  placeholder="Añadir subtítulo informativo..."
                  className={cn(
                    "w-full",
                    subtitleAlign === 'center' ? "justify-center" : "justify-start"
                  )}
                  inputClassName={cn(
                    subtitleAlign === 'center' ? "text-center" :
                      subtitleAlign === 'justify' ? "text-justify" : "text-left"
                  )}
                />
              </div>
              {isEditorMode && (
                <div className="opacity-0 group-hover/subtitle-container:opacity-100 transition-opacity">
                  <AlignmentToolbar current={subtitleAlign} onSelect={(a) => handleAlignChange('subtitle_align', a)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="h-px w-full"
        style={{
          backgroundImage: isNormatividad
            ? `linear-gradient(to right, ${YELLOW_PRIMARY}, ${YELLOW_BORDER}, transparent)`
            : `linear-gradient(to right, hsl(var(--primary)), rgba(var(--primary-rgb), 0.3), transparent)`
        }}
      />
    </motion.div>
  );
};

export default SectionHeader;