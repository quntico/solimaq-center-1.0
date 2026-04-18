import React, { Component } from 'react';
import { motion } from 'framer-motion';
import GenericSection from './sections/GenericSection';
import MasterPlan from '../pages/MasterPlan';

class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 border border-red-500 text-red-500 m-10 rounded bg-red-950/20">
          <h2 className="text-xl font-bold">Error rendering section "{this.props.sectionId}"</h2>
          <pre className="text-xs whitespace-pre-wrap mt-4">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        if (section.isVisible === false) return null;

        // Map section ID to component
        let Comp = section.Component || GenericSection;
        if (section.id === 'master_plan' || section.id === 'balance_masas') {
          Comp = MasterPlan;
        }

        const sectionProps = {
          sectionData: section,
          setActiveSection,
          quotationData,
          isEditorMode,
          isAdminAuthenticated,
          setIsEditorMode,
          activeTheme,
          onContentChange: (newContent) => handleSectionContentChange(section.id, newContent),
          onDataChange: (newData) => handleSectionDataChange(section.id, newData),
          activeTab: section.id === 'balance_masas' ? 'balance_masas' : (activeTabMap ? activeTabMap[section.id] : undefined),
          ...(section.id === 'propuesta' && { sections: allSectionsData }),
          ...(section.id === 'video' && { onVideoUrlUpdate }),
          allSectionsData,
          onAtomicContentUpdate: props.onAtomicContentUpdate || handleSectionContentChange,
          isStandalone: section.id !== 'master_plan' && section.id !== 'balance_masas',
          parentSlug: quotationData?.slug,
          slug: quotationData?.slug
        };

        return (
          <section id={section.id} key={section.id}>
            <SectionErrorBoundary sectionId={section.id}>
              <Comp {...sectionProps} />
            </SectionErrorBoundary>
          </section>
        );
      })}
    </main>
  );
};

export default MainContent;