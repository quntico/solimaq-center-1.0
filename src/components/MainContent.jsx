import React from 'react';
import { motion } from 'framer-motion';
import GenericSection from './sections/GenericSection';

const MainContent = (props) => {
  const {
    activeSection,
    setActiveSection,
    quotationData,
    aiQuery,
    setAiQuery,
    sections,
    allSectionsData,
    isEditorMode,
    setIsEditorMode,
    activeTheme,
    isAdminAuthenticated,
    onSectionContentUpdate,
    onAtomicContentUpdate,
    onVideoUrlUpdate,
    activeTabMap
  } = props;

  const handleSectionContentChange = (sectionId, newContent) => {
    if (onAtomicContentUpdate) {
      return onAtomicContentUpdate(sectionId, newContent);
    }
    const dataSource = allSectionsData || sections;
    const newSections = dataSource.map(sec =>
      sec.id === sectionId ? { ...sec, content: { ...(sec.content || {}), ...newContent } } : sec
    );
    return onSectionContentUpdate(newSections);
  };

  const handleSectionDataChange = (sectionId, newSectionData) => {
    const dataSource = allSectionsData || sections;
    const newSections = dataSource.map(sec =>
      sec.id === sectionId ? newSectionData : sec
    );
    return onSectionContentUpdate(newSections);
  };

  return (
    <main className="relative px-4">
      {sections.map(section => {
        if (!section.isVisible) return null;

        const Component = section.Component || GenericSection;

        const sectionProps = {
          sectionData: section,
          quotationData,
          isEditorMode,
          isAdminAuthenticated,
          setIsEditorMode,
          activeTheme,
          onContentChange: (newContent) => handleSectionContentChange(section.id, newContent),
          onDataChange: (newData) => handleSectionDataChange(section.id, newData),
          activeTab: activeTabMap ? activeTabMap[section.id] : undefined,
          ...(section.id === 'propuesta' && { sections: allSectionsData }),
          ...(section.id === 'video' && { onVideoUrlUpdate }),
          isStandalone: section.id !== 'master_plan'
        };

        return (
          <section id={section.id} key={section.id}>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <Component {...sectionProps} />
            </motion.div>
          </section>
        );
      })}
    </main>
  );
};

export default MainContent;