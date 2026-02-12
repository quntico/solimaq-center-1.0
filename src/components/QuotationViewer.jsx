import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainContent from '@/components/MainContent';
import AdminModal from '@/components/AdminModal';
import { Toaster } from '@/components/ui/toaster';
import { CommandDialogDemo } from '@/components/CommandDialog';
import { supabase } from '@/lib/customSupabaseClient';
import PasswordPrompt from '@/components/PasswordPrompt';
import BottomNavBar from '@/components/BottomNavBar';
import CloneModal from '@/components/CloneModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { BRANDS, DEFAULT_BRAND } from '@/lib/brands';
import ExportManager from '@/components/ExportManager';

import PortadaSection from '@/components/sections/PortadaSection';
import DescripcionSection from '@/components/sections/DescripcionSection';
import GeneralesSection from '@/components/sections/GeneralesSection';
import FichaTecnicaSection from '@/components/sections/FichaTecnicaSection';
import FichaDinamicaSection from '@/components/sections/FichaDinamicaSection';
import CronogramaSection from '@/components/sections/CronogramaSection';
import ServiciosSection from '@/components/sections/ServiciosSection';
import LayoutSection from '@/components/sections/LayoutSection';
import VideoSection from '@/components/sections/VideoSection';
import ProcesoSection from '@/components/sections/ProcesoSection';
import PDFSection from '@/components/sections/PDFSection';
import GenericSection from '@/components/sections/GenericSection';
import IASection from '@/components/sections/IASection';
import CondicionesPagoSection from '@/components/sections/CondicionesPagoSection';
import NormatividadSection from '@/components/sections/NormatividadSection';
import CapacidadesSection from '@/components/sections/CapacidadesSection';
import SCR700Page from '@/components/sections/SCR700Page';
import ClientesSection from '@/components/sections/ClientesSection';
import VentajasSection from '@/components/sections/VentajasSection';
import PropuestaEconomicaSection from '@/components/sections/PropuestaEconomicaSection';
import ExclusionesSection from '@/components/sections/ExclusionesSection';
import CotizadorPage from '@/components/CotizadorPage';
import CotizadorSMQ from '@/components/CotizadorSMQ';
import CalculadoraProduccion from '@/components/CalculadoraProduccion';
import MasterPlan from '@/pages/MasterPlan';

const componentMap = {
  ventajas: VentajasSection,
  portada: PortadaSection,
  descripcion: DescripcionSection,
  generales: GeneralesSection,
  ficha: FichaTecnicaSection,
  ficha_dinamica: FichaDinamicaSection,
  propuesta: PropuestaEconomicaSection,
  cronograma: CronogramaSection,
  servicios: ServiciosSection,
  condiciones: CondicionesPagoSection,
  layout: LayoutSection,
  video: VideoSection,
  proceso: ProcesoSection,
  pdf: PDFSection,
  generic: GenericSection,
  ia: IASection,
  cotizador_page: CotizadorPage,
  cotizador_smq: CotizadorSMQ,
  calculadora_prod: CalculadoraProduccion,
  exclusiones: ExclusionesSection,
  capacidades: CapacidadesSection,
  scr700_page: SCR700Page,
  clientes: ClientesSection,
  normatividad: ServiciosSection, // Consolidado en ServiciosSection
  master_plan: MasterPlan,
  admin: GenericSection,
  servicios_adicionales: GenericSection,
};

const defaultSections = [
  { id: 'descripcion', label: 'Descripción', icon: 'FileText', isVisible: true, component: 'descripcion' },
  { id: 'normatividad', label: 'Normatividad', icon: 'ShieldCheck', isVisible: true, component: 'normatividad' },
  { id: 'master_plan', label: 'Master Plan', icon: 'Target', isVisible: true, component: 'master_plan' },
  { id: 'ficha', label: 'Ficha Técnica', icon: 'ListChecks', isVisible: true, component: 'ficha' },
  { id: 'cronograma', label: 'Cronograma', icon: 'Calendar', isVisible: true, component: 'cronograma' },
  { id: 'servicios', label: 'Servicios Incluidos', icon: 'Package', isVisible: true, component: 'servicios' },
  { id: 'layout', label: 'Lay Out', icon: 'LayoutGrid', isVisible: true, isLocked: false, component: 'layout' },
  { id: 'video', label: 'Video', icon: 'Video', isVisible: true, isLocked: false, component: 'video' },
  { id: 'proceso', label: 'Proceso', icon: 'TrendingUp', isVisible: true, component: 'proceso' },
  { id: 'calculadora_prod', label: 'Calculadora', icon: 'Calculator', isVisible: false, isLocked: false, component: 'calculadora_prod' },
  { id: 'pdf', label: 'Cotizaciones PDF', icon: 'FileDown', isVisible: true, component: 'pdf' },
  { id: 'analiticas', label: 'Analíticas', icon: 'BarChart', isVisible: true, component: 'admin', adminOnly: true },
  { id: 'ajustes', label: 'Ajustes', icon: 'Settings', isVisible: true, component: 'admin', adminOnly: true },
  { id: 'propuesta', label: 'Propuesta Económica', icon: 'DollarSign', isVisible: true, component: 'propuesta' },

  // Hidden/Auxiliary
  { id: 'ventajas', label: 'VENTAJAS', icon: 'Star', isVisible: false, component: 'ventajas' },
  { id: 'portada', label: 'Home', icon: 'Home', isVisible: false, component: 'portada' },
  { id: 'generales', label: 'Generales', icon: 'ClipboardList', isVisible: false, component: 'generales' },
  { id: 'exclusiones', label: 'Exclusiones', icon: 'XCircle', isVisible: false, component: 'exclusiones' },
  { id: 'ia', label: 'Asistente IA', icon: 'BrainCircuit', isVisible: false, isLocked: false, component: 'ia' },
  { id: 'extra_resources', label: 'Recursos', icon: 'FileText', isVisible: false, component: 'generic', adminOnly: true },
  { id: 'export_resources', label: 'Centro de Exportación', icon: 'Download', isVisible: false, component: 'generic', adminOnly: true },
];

const clientVisibleSections = new Set(defaultSections.filter(s => !s.adminOnly).map(s => s.id));

const mergeWithDefaults = (config) => {
  if (!config || !Array.isArray(config)) return defaultSections;

  const defaultConfigMap = new Map(defaultSections.map(s => [s.id, s]));

  // 1. Process items from DB (config)
  const mergedConfig = config
    .filter(s => s && s.id && s.id !== 'propuesta_dinamica')
    .map(s => {
      const defaultSection = defaultConfigMap.get(s.id);
      // ... (rest of the map logic is fine, but safety above helps)

      if (!defaultSection) {
        // Dynamic / Clone sections -> Base them on default components
        const safeId = String(s.id);
        const baseComponentId = s.component || safeId.split('_copy')[0];
        const baseConfig = defaultConfigMap.get(baseComponentId) || {};
        return {
          ...baseConfig,
          ...s,
          component: baseComponentId,
          content: s.content || baseConfig.content || {}
        };
      }

      const merged = {
        ...defaultSection,
        ...s,
        content: s.content || defaultSection.content || {}
      };

      const isNormatividad = String(merged.id || '').toLowerCase().includes('normatividad') ||
        (merged.label && String(merged.label).toLowerCase().includes('normatividad'));

      if (isNormatividad) {
        merged.component = 'normatividad';
      }

      if (['ia', 'layout', 'video', 'calculadora_prod'].includes(merged.id)) {
        merged.isLocked = false;
      }
      return merged;
    });

  // 2. Add missing default sections
  const existingIds = new Set(mergedConfig.map(s => s.id));
  defaultSections.forEach(ds => {
    if (!existingIds.has(ds.id)) {
      mergedConfig.push(ds);
    }
  });

  return mergedConfig;
};

const QuotationViewer = ({
  initialQuotationData,
  allThemes = {},
  isAdminView = false,
  activeThemeProp,
  onThemeChange
}) => {
  const [isEditorMode, setIsEditorMode] = useState(false);

  // Internal state for the active theme, defaults to prop or initial data
  const [localActiveTheme, setLocalActiveTheme] = useState(initialQuotationData?.theme_key || 'solimaq');
  const activeTheme = activeThemeProp || localActiveTheme;

  const [themes, setThemes] = useState(isAdminView ? allThemes : { [activeTheme]: initialQuotationData });

  const [previewData, setPreviewData] = useState(null);

  // DRIVED DATA - DECLARE EARLY
  const quotationData = themes[activeTheme];
  const displayData = useMemo(() => {
    return previewData ? { ...quotationData, ...previewData } : quotationData;
  }, [quotationData, previewData]);

  // Sync state with props when parent (AdminLayout) changes them
  // Sync state with props when parent (AdminLayout or ClientLayout) changes them
  useEffect(() => {
    if (isAdminView) {
      setThemes(allThemes);
    } else if (initialQuotationData?.theme_key) {
      setThemes({ [initialQuotationData.theme_key]: initialQuotationData });
      // CRITICAL FIX: Update active theme when data arrives (for ClientLayout)
      setLocalActiveTheme(initialQuotationData.theme_key);
    }
  }, [allThemes, initialQuotationData, isAdminView]);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [activeSection, setActiveSection] = useState('descripcion');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [isFullDataLoading, setIsFullDataLoading] = useState(false);


  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const idleTimerRef = useRef(null);
  const initialDisplayTimerRef = useRef(null);
  const hasInteracted = useRef(false);

  const { t } = useLanguage();
  const { toast } = useToast();

  const setActiveTheme = (newThemeKey) => {
    setLocalActiveTheme(newThemeKey);
    onThemeChange?.(newThemeKey);
  };

  // LAZY LOADING THEME SWITCHER
  const handleThemeSwitch = async (newThemeKey) => {
    try {
      const url = new URL(window.location);
      url.searchParams.set('p', newThemeKey);
      window.history.pushState({}, '', url);
    } catch (e) {
      console.warn("Could not update URL:", e);
    }

    const targetTheme = themes[newThemeKey];
    if (targetTheme && targetTheme.sections_config) {
      setActiveTheme(newThemeKey);
      return;
    }

    setIsFullDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('theme_key', newThemeKey)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Proyecto no encontrado en la base de datos.");

      setThemes(prev => ({
        ...prev,
        [newThemeKey]: {
          ...data,
          sections_config: mergeWithDefaults(data.sections_config)
        }
      }));

      setActiveTheme(newThemeKey);
      toast({ title: "Cargado", description: `Proyecto ${data.project} listo.` });

    } catch (err) {
      console.error("Error lazy loading theme:", err);
      toast({
        title: "Error al cargar",
        description: `No se pudo abrir el proyecto: ${err.message || 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setIsFullDataLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setIsEditorMode(false);
    localStorage.removeItem('isAdminAuthenticated');
  };


  const handleHomeClick = useCallback(() => {
    setActiveSection('descripcion');
    const homeEl = document.getElementById('main-content-scroll-area');
    if (homeEl) homeEl.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!displayData) return;
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      clearTimeout(initialDisplayTimerRef.current);
    }
    setIsBannerVisible(false);
    clearTimeout(idleTimerRef.current);
    const timeoutDuration = (displayData.idle_timeout || 4) * 1000;
    idleTimerRef.current = setTimeout(() => {
      setIsBannerVisible(true);
    }, timeoutDuration);
  }, [displayData]);

  useEffect(() => {
    if (!displayData) return;
    const initialTime = (displayData.initial_display_time || 2) * 1000;
    const idleTime = (displayData.idle_timeout || 4) * 1000;

    // Initial Timer: Hide banner after initial time, BUT only if we aren't already "idle enough" to keep it shown
    // or if we want to enforce a "blink" effect (Show -> Hide -> Show).
    // Given the user wants it to "run", a blink (Show Intro -> Hide -> Show Screensaver) is a good feedback loop.
    initialDisplayTimerRef.current = setTimeout(() => {
      if (!hasInteracted.current) {
        // If initial time is less than idle time, we hide it temporarily so it can "come back" at idle time.
        // If initial time is longer than idle time, we should just keep it visible.
        if (initialTime < idleTime) {
          setIsBannerVisible(false);
        }
      }
    }, initialTime);

    // Start Idle Timer on mount to ensure it shows up if user does nothing from start
    idleTimerRef.current = setTimeout(() => {
      if (!hasInteracted.current) {
        setIsBannerVisible(true);
      }
    }, idleTime);

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));
    return () => {
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      clearTimeout(idleTimerRef.current);
      clearTimeout(initialDisplayTimerRef.current);
    };
  }, [resetIdleTimer, displayData]);

  useEffect(() => {
    if (displayData) {
      if (isAdminView) localStorage.setItem('activeTheme', activeTheme);
      document.body.className = 'theme-nova';

      // Dynamic Brand Theming
      const root = document.documentElement;

      const brandId = displayData.brand_color || DEFAULT_BRAND;
      const brandConfig = BRANDS[brandId] || BRANDS[DEFAULT_BRAND];

      const primaryColor = brandConfig.colors.primary;
      root.style.setProperty('--primary', primaryColor);

      // Convert Hex to RGB for LED effects
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
      };

      const primaryRgb = hexToRgb(primaryColor);
      if (primaryRgb) {
        root.style.setProperty('--primary-rgb', primaryRgb);
      }
      root.style.setProperty('--secondary', brandConfig.colors.secondary);
      root.style.setProperty('--primary-foreground', brandConfig.colors.primaryForeground);
      root.style.setProperty('--ring', brandConfig.colors.primary);

      // Legacy support
      root.style.setProperty('--color-led-blue', brandConfig.colors.primary);
    }
  }, [activeTheme, displayData, isAdminView]);

  const handleSectionSelect = useCallback((sectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else {
      const mainContent = document.getElementById('main-content-scroll-area');
      if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const setSectionsConfig = async (newConfig) => {
    try {
      const sanitizedConfig = newConfig.map(({ Component, subItems, ...rest }) => rest);
      const processedConfig = mergeWithDefaults(sanitizedConfig);

      setThemes(prevThemes => ({
        ...prevThemes,
        [activeTheme]: { ...prevThemes[activeTheme], sections_config: processedConfig },
      }));

      const { error } = await supabase
        .from('quotations')
        .update({
          sections_config: sanitizedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('theme_key', activeTheme);

      if (error) throw error;
      toast({ title: "Sincronizado", description: "Configuración global actualizada.", variant: "default" });
    } catch (err) {
      console.error("Error saving sections config:", err);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };

  const handleAtomicUpdate = async (sectionId, newSectionContent) => {
    try {
      // 1. Get current config
      const currentConfig = themes[activeTheme]?.sections_config || defaultSections;
      const configClone = JSON.parse(JSON.stringify(currentConfig));

      // 2. Find and update the specific section
      const sectionIndex = configClone.findIndex(s => s.id === sectionId);

      if (sectionIndex >= 0) {
        // CRITICAL FIX: Merge content, don't replace
        const existingContent = configClone[sectionIndex].content || {};
        configClone[sectionIndex] = {
          ...configClone[sectionIndex],
          content: {
            ...existingContent,
            ...newSectionContent
          }
        };
      } else {
        // Create if not exists (rare for atomic updates but safe)
        configClone.push({
          id: sectionId,
          isVisible: true,
          component: 'generic',
          content: newSectionContent
        });
      }

      // 3. Update State & DB (Re-use existing atomic logic if possible, or just call setSectionsConfig)
      await setSectionsConfig(configClone);

    } catch (e) {
      console.error("Atomic Update Failed:", e);
      toast({ title: "Error de Guardado", description: "No se pudo actualizar la sección.", variant: "destructive" });
    }
  };

  const [activeTabMap, setActiveTabMap] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);

  const handleSubItemSelect = (sectionId, index) => {
    setActiveSection(sectionId);
    setActiveTabMap(prev => ({ ...prev, [sectionId]: index }));
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };



  if (!displayData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white p-10">
        <div className="max-w-2xl bg-gray-900 border border-red-500 p-6 rounded-lg shadow-2xl">
          <h2 className="text-xl font-bold text-red-500 mb-4">Debug: No hay datos para mostrar</h2>
          <div className="space-y-2 font-mono text-xs">
            <p><strong>Active Theme:</strong> {JSON.stringify(activeTheme)}</p>
            <p><strong>Keys in Themes:</strong> {JSON.stringify(Object.keys(themes))}</p>
            <p><strong>Initial Data ID:</strong> {initialQuotationData?.id}</p>
            <p><strong>Initial Data Key:</strong> {initialQuotationData?.theme_key}</p>
            <p><strong>Is Admin View:</strong> {String(isAdminView)}</p>
          </div>
          <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold">
            Recargar Página
          </button>
        </div>
      </div>
    );
  }



  // Robustly handle sections_config: Array (standard), Object with sections array (MasterPlan), or Default
  const rawConfig = displayData.sections_config;
  let configToMap = [];

  if (Array.isArray(rawConfig)) {
    configToMap = rawConfig;
  } else if (rawConfig && typeof rawConfig === 'object' && Array.isArray(rawConfig.sections)) {
    // Handle Master Plan structure or nested config
    configToMap = rawConfig.sections;
  } else {
    configToMap = defaultSections;
  }
  let menuItems = configToMap.filter(section => section).map(section => {
    const cleanCompKey = (section.component || section.id || '').split('_copy')[0];
    // Fix for 'ventajas' label potentially being saved as the translation key
    let displayLabel = section.label;
    if (section.id === 'ventajas' && (displayLabel === 'sections.ventajas' || !displayLabel)) {
      displayLabel = t('sections.ventajas');
    }

    // Generate subItems for Ficha
    let subItems = [];
    if (section.id === 'ficha' && section.content && Array.isArray(section.content)) {
      subItems = section.content.map((item, index) => ({
        id: index,
        label: item.tabTitle || `Ficha ${index + 1}`,
        icon: item.icon || 'FileText'
      }));
    }

    return {
      ...section,
      Component: componentMap[cleanCompKey] || componentMap[section.id] || GenericSection,
      label: displayLabel || t(`sections.${section.id}`),
      subItems // Add subItems
    };
  });

  // Extra safety filter to ensure removed components don't crash
  menuItems = menuItems.filter(section => section.id !== 'propuesta_dinamica');

  if (!isAdminView) {
    // Filter hidden items and admin items for normal view
    // ALSO explicitly hide Calculator and IA Assistant for clients as requested
    menuItems = menuItems.filter(item =>
      item.isVisible &&
      clientVisibleSections.has(item.id.split('_copy')[0]) &&
      !item.adminOnly &&
      !['calculadora_prod', 'ia'].includes(item.id)
    );
  } else if (!isAdminAuthenticated) {
    // Filter admin items for non-authenticated admin view AND respect visibility
    menuItems = menuItems.filter(item => item.isVisible && !item.adminOnly);
  }

  const handleVideoUrlUpdate = async (newUrl) => {
    const updatedData = { ...displayData, video_url: newUrl };
    setThemes(prev => ({
      ...prev,
      [activeTheme]: updatedData
    }));

    const { error } = await supabase
      .from('quotations')
      .update({ video_url: newUrl })
      .eq('theme_key', activeTheme);

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar la URL del video.", variant: "destructive" });
    }
  };

  const renderActiveComponent = () => {
    if (activeSection === 'cotizador_page') {
      return (
        <CotizadorPage
          quotationData={displayData}
          activeTheme={activeTheme}
          setThemes={setThemes}
        />
      );
    }

    const activeSectionObj = menuItems.find(s => s.id === activeSection);
    const ActiveComponent = activeSectionObj?.Component || componentMap[activeSection] || GenericSection;

    return (
      <MainContent
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        quotationData={displayData}
        aiQuery={aiQuery}
        setAiQuery={setAiQuery}
        sections={menuItems}
        allSectionsData={displayData.sections_config}
        isEditorMode={isEditorMode && isAdminView}
        setIsEditorMode={setIsEditorMode}
        activeTheme={activeTheme}
        isAdminAuthenticated={isAdminAuthenticated && isAdminView}
        onSectionContentUpdate={setSectionsConfig}
        onAtomicContentUpdate={handleAtomicUpdate} // New Atomic Prop
        onVideoUrlUpdate={handleVideoUrlUpdate}
        activeTabMap={activeTabMap}
      />
    );
  };

  return (
    <>
      <Helmet>
        <title>{displayData?.company || 'Solimaq'} - {displayData?.project || 'Proyecto'}</title>
        <link rel="icon" href={displayData?.favicon || "/favicon.png"} />

      </Helmet>
      {isAdminView && showPasswordPrompt && (
        <PasswordPrompt
          onCorrectPassword={(autoEditor) => {
            setIsAdminAuthenticated(true);
            localStorage.setItem('isAdminAuthenticated', 'true');
            if (autoEditor) setIsEditorMode(true);
            setShowPasswordPrompt(false);
          }}
          onCancel={() => setShowPasswordPrompt(false)}
        />

      )}
      {isAdminView && (
        <AdminModal
          isOpen={showAdminModal}
          onClose={() => { setShowAdminModal(false); setPreviewData(null); }}
          themes={themes}
          setThemes={setThemes}
          activeTheme={activeTheme}
          setActiveTheme={handleThemeSwitch}
          onCloneClick={() => { setShowAdminModal(false); setShowCloneModal(true); }}
          onPreviewUpdate={setPreviewData}
        />
      )}
      {isAdminView && (
        <CloneModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          themes={themes}
          setThemes={setThemes}
          activeTheme={activeTheme}
          onCloneSuccess={(newThemeKey) => {
            handleThemeSwitch(newThemeKey);
            setShowCloneModal(false);
            toast({ title: "¡Clonado exitoso! 🚀", description: "La cotización ha sido duplicada correctamente." });
          }}
        />
      )}

      <ExportManager
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={(type) => {
          window.dispatchEvent(new CustomEvent('EXPORT_QUOTATION', { detail: { type } }));
        }}
        isEditorMode={isEditorMode && isAdminView}
        quotationData={displayData}
        onUpdate={setSectionsConfig}
        onAtomicUpdate={handleAtomicUpdate}
        activeTheme={activeTheme}
      />
      <div className="flex h-screen overflow-hidden bg-black relative">
        <div className="absolute left-0 top-0 bottom-0 z-[500] flex-shrink-0">
          <Sidebar
            activeSection={activeSection}
            onSectionSelect={handleSectionSelect}
            onHomeClick={handleHomeClick}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            onAdminClick={() => isAdminView && setShowAdminModal(true)}
            isEditorMode={isEditorMode && isAdminView}
            setIsEditorMode={setIsEditorMode}
            sections={menuItems}
            setSections={setSectionsConfig}
            isAdminAuthenticated={isAdminAuthenticated && isAdminView}
            onAdminLogin={() => isAdminView && setShowPasswordPrompt(true)}
            onAdminLogout={handleAdminLogout}
            isAdminView={isAdminView}
            onCotizadorClick={() => handleSectionSelect('cotizador_page')}
            onSubItemSelect={handleSubItemSelect}
            activeTabMap={activeTabMap}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden pl-20">
          <Header
            quotationData={displayData}
            onLogoClick={handleHomeClick}
            onSearchClick={() => isAdminView && setShowCommandDialog(true)}
            isBannerVisible={isBannerVisible}
            isEditorMode={isEditorMode}
            isAdminView={isAdminView}
            isLoadingData={isFullDataLoading}
            onExportClick={() => setShowExportModal(true)}
            // Mobile Menu Props
            sections={menuItems}
            activeSection={activeSection}
            onSectionSelect={handleSectionSelect}
            onHomeClick={handleHomeClick}
            isAdminAuthenticated={isAdminAuthenticated && isAdminView}
            onAdminLogin={() => isAdminView && setShowPasswordPrompt(true)}
            onAdminLogout={handleAdminLogout}
            onCotizadorClick={() => handleSectionSelect('cotizador_page')}
            onSubItemSelect={handleSubItemSelect}
            activeTabMap={activeTabMap}
            setIsEditorMode={setIsEditorMode}
            onAdminClick={() => isAdminView && setShowAdminModal(true)}
          />
          <div id="main-content-scroll-area" className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
            {renderActiveComponent()}
          </div>
        </div>
        <BottomNavBar
          sections={menuItems}
          activeSection={activeSection}
          onSectionSelect={handleSectionSelect}
          onHomeClick={handleHomeClick}
          isEditorMode={isEditorMode && isAdminView}
          isAdminAuthenticated={isAdminAuthenticated && isAdminView}
          onAdminClick={() => isAdminView && setShowAdminModal(true)}
          setIsEditorMode={setIsEditorMode}
          onAdminLogin={() => isAdminView && setShowPasswordPrompt(true)}
          onAdminLogout={handleAdminLogout}
          activeTheme={activeTheme}
          isAdminView={isAdminView}
        />
        <Toaster />
      </div>
    </>
  );
};

export default QuotationViewer;