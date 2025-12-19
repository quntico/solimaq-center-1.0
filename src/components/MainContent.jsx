import React from 'react';
import { motion } from 'framer-motion';

const MainContent = ({
  activeSection,
  setActiveSection,
  quotationData,
  aiQuery,
  setAiQuery,
  sections,
  allSections,
  isEditorMode,
  setIsEditorMode,
  activeTheme,
  onSectionContentUpdate,
  onVideoUrlUpdate,
  activeTabMap // Receive activeTabMap
}) => {

  const handleContentChange = (sectionId, newContent) => {
    const newSections = sections.map(sec =>
      sec.id === sectionId
        ? { ...sec, content: { ...sec.content, ...newContent } }
        : sec
    );
    onSectionContentUpdate(newSections);
  };

  const handleSectionContentChange = (sectionId, newContent) => {
    const newSections = sections.map(sec =>
      sec.id === sectionId ? { ...sec, content: newContent } : sec
    );
    onSectionContentUpdate(newSections);
  };

  const handleSectionDataChange = (sectionId, newSectionData) => {
    const newSections = sections.map(sec =>
      sec.id === sectionId ? newSectionData : sec
    );
    onSectionContentUpdate(newSections);
  };

  return (
    <main className="relative px-4"> {/* Moved px-4 here */}
      {sections.map(section => {
        if (!section.isVisible) return null;

        const Component = section.Component;
        if (!Component) return null;

        const sectionDataWithContent = {
          ...quotationData.sections_config.find(s => s.id === section.id),
          ...section,
        };

        const props = {
          sectionData: sectionDataWithContent,
          quotationData,
          isEditorMode,
          setIsEditorMode,
          activeTheme,
          onContentChange: (newContent) => handleSectionContentChange(section.id, newContent),
          onDataChange: (newData) => handleSectionDataChange(section.id, newData),
          activeTab: activeTabMap ? activeTabMap[section.id] : undefined, // Pass activeTab
          ...(section.id === 'propuesta' && { sections: allSections }),
          ...(section.id === 'video' && { onVideoUrlUpdate }),
        };

        return (
          <section id={section.id} key={section.id}>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <Component {...props} />
            </motion.div>
          </section>
        );
      })}
    </main>
  );
};

export default MainContent;