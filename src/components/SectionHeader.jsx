import React from 'react';
import { motion } from 'framer-motion';
import { iconMap } from '@/lib/iconMap';
import EditableField from '@/components/EditableField';
import IconPicker from '@/components/IconPicker';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const SectionHeader = ({ sectionData = {}, isEditorMode, onContentChange }) => {
  const { t } = useLanguage();
  
  const iconKey = sectionData.content?.icon || sectionData.icon || 'FileText';
  const Icon = iconMap[iconKey] || iconMap.FileText;
  
  const title = sectionData.content?.title || sectionData.label || t(`sections.${sectionData.id}`);
  const subtitle = sectionData.content?.subtitle || '';

  const handleTitleChange = (newTitle) => {
    if (onContentChange) {
      // If it's content title, update content.title
      // If sectionData has label but not content.title, we might want to update content.title anyway to override default
      onContentChange({ title: newTitle });
    }
  };

  const handleSubtitleChange = (newSubtitle) => {
    if (onContentChange) {
      onContentChange({ subtitle: newSubtitle });
    }
  };

  const handleIconChange = (newIcon) => {
    if (onContentChange) {
      onContentChange({ icon: newIcon });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-12 relative max-w-6xl mx-auto px-4"
    >
      <div className="flex items-center gap-4 mb-6">
        <IconPicker 
          value={iconKey} 
          onChange={handleIconChange} 
          isEditorMode={isEditorMode}
          trigger={
            <div className={cn(
              "p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400",
              isEditorMode && "cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/50 transition-all"
            )}>
              <Icon className="w-8 h-8" />
            </div>
          }
        />
        
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white">
            <EditableField
              value={title}
              onSave={handleTitleChange}
              isEditorMode={isEditorMode}
              placeholder="Título de la sección"
            />
          </h2>
          
          {(subtitle || isEditorMode) && (
            <div className="text-gray-400 mt-1 text-lg">
               <EditableField
                value={subtitle}
                onSave={handleSubtitleChange}
                isEditorMode={isEditorMode}
                placeholder="Añadir subtítulo..."
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="h-px w-full bg-gradient-to-r from-blue-900/50 via-blue-500/20 to-transparent" />
    </motion.div>
  );
};

export default SectionHeader;