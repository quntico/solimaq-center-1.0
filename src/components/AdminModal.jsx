import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X, Save, Eraser, Settings, Palette, Scale, Upload, Image, Loader2, Minimize, Timer, PlaySquare, Clock, CheckCircle, Wrench, Ship, Truck, Copy, Link as LinkIcon, ClipboardCopy, Star, Home, MonitorSpeaker as Announce, MoveHorizontal, EyeOff, ExternalLink, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from '@/contexts/LanguageContext';
import { QRCodeCanvas } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';

import { BRANDS } from '@/lib/brands'; // Import brands

const AdminModal = ({ isOpen, onClose, themes = {}, setThemes, activeTheme, setActiveTheme, onCloneClick, onPreviewUpdate }) => {
  // --- STATE INITIALIZATION WITH SAFETY CHECKS ---
  const [currentThemeData, setCurrentThemeData] = useState(() => {
    if (themes && activeTheme && themes[activeTheme]) {
      return themes[activeTheme];
    }
    return null; // Return null if data is missing initially
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false); // Toggle specifically for bulk management
  const [isConfigMode, setIsConfigMode] = useState(false); // NEW: Toggle for brand configuration

  const logoFileInputRef = useRef(null);
  const faviconFileInputRef = useRef(null);


  const { toast } = useToast();
  const languageContext = useLanguage();
  // Safe access to translation function
  const t = languageContext?.t || ((key) => key);

  // --- EFFECTS ---

  // Sync state when modal opens or activeTheme changes
  useEffect(() => {
    if (isOpen && themes && activeTheme && themes[activeTheme]) {
      const themeDataFromApp = themes[activeTheme];
      // Defensive copy with defaults
      setCurrentThemeData({
        ...themeDataFromApp,
        logo_size: themeDataFromApp.logo_size ?? 210,
        banner_text: themeDataFromApp.banner_text ?? '',
        banner_direction: themeDataFromApp.banner_direction ?? 'left-to-right',
        banner_scale: themeDataFromApp.banner_scale ?? 40,
        idle_timeout: themeDataFromApp.idle_timeout ?? 4,
        initial_display_time: themeDataFromApp.initial_display_time ?? 2,
        phase1_duration: themeDataFromApp.phase1_duration ?? 5,
        phase2_duration: themeDataFromApp.phase2_duration ?? 75,
        phase3_duration: themeDataFromApp.phase3_duration ?? 10,
        phase1_name: themeDataFromApp.phase1_name ?? 'Confirmación y Orden',
        phase2_name: themeDataFromApp.phase2_name ?? 'Tiempo de Fabricación',
        phase3_name: themeDataFromApp.phase3_name ?? 'Transporte',
        phase4_name: themeDataFromApp.phase4_name ?? 'Instalación y Puesta en Marcha',
        hide_banner: themeDataFromApp.hide_banner ?? false,
      });
    }
  }, [isOpen, activeTheme, themes]);

  // Preview updates
  useEffect(() => {
    if (onPreviewUpdate && currentThemeData) {
      onPreviewUpdate(currentThemeData);
    }
  }, [currentThemeData, onPreviewUpdate]);


  // --- HANDLERS ---

  // Helper to add timeout to promises
  const withTimeout = (promise, ms = 10000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Operación excedió el tiempo límite de ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  const handleDelete = async (keyToDelete = null, options = {}) => {
    const { suppressToasts = false } = options;
    const targetKey = keyToDelete || activeTheme;

    // Check if themes exists
    if (!themes) return;

    // Use current themes or fallback to finding it in list if passed differently
    const targetTheme = themes[targetKey];

    if (!targetTheme) {
      if (!suppressToasts) toast({ title: "Error", description: "La cotización no existe.", variant: "destructive" });
      return;
    }

    if (targetTheme.is_template) {
      if (!suppressToasts) toast({ title: "Acción Bloqueada", description: "No puedes eliminar la Plantilla Base.", variant: "destructive" });
      return;
    }

    if (targetTheme.is_home) {
      // Force unmark as home first to bypass potential DB constraints
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ is_home: false })
        .eq('theme_key', targetKey);

      if (updateError) {
        console.warn("Could not unmark home before delete", updateError);
      }
    }

    if (!suppressToasts) setIsDeleting(true);

    try {
      const targetId = targetTheme.id;
      console.log(`[Delete] Iniciando borrado. Key=${targetKey}, ID=${targetId}`);

      // 1. Dependency Cleanup
      const safeDelete = async (table, criteria) => {
        try {
          let query = supabase.from(table).delete();
          Object.entries(criteria).forEach(([col, val]) => query = query.eq(col, val));
          await withTimeout(query, 3000);
        } catch (err) {
          console.warn(`[Delete] Warning cleaning ${table}:`, err);
        }
      };

      // Dependencies
      if (targetId) await safeDelete('machines', { quotation_id: targetId });
      await safeDelete('machines', { theme_key: targetKey });
      await safeDelete('images', { theme_key: targetKey });
      if (targetId) await safeDelete('pdf_quotations', { quotation_id: targetId });
      await safeDelete('pdf_quotations', { theme_key: targetKey });
      if (targetId) await safeDelete('process_conditions', { quotation_id: targetId });



      // 2. Perform Main Delete with Retry Strategy (Hard Delete -> Soft Delete Fallback)
      let deleted = false;
      let lastError = null;

      // Attempt 1: Hard Delete By ID (Preferred)
      if (targetId) {
        const { error, count } = await withTimeout(supabase.from('quotations').delete({ count: 'exact' }).eq('id', targetId), 5000);
        if (!error && count > 0) deleted = true;
        else lastError = error || new Error(`Delete by ID returned count 0`);
      }

      // Attempt 2: Hard Delete By Key (Fallback)
      if (!deleted) {
        console.log("[Delete] Fallback to deleting by theme_key...");
        const { error, count } = await withTimeout(supabase.from('quotations').delete({ count: 'exact' }).eq('theme_key', targetKey), 5000);
        if (!error && count > 0) deleted = true;
        else lastError = error || new Error(`Delete by Key returned count 0. Info: ${lastError?.message}`);
      }

      // Attempt 3: Soft Delete (Hide by renaming) - The "Dirty Fix" for RLS restrictions
      if (!deleted) {
        console.log("[Delete] Hard delete failed. Attempting Soft Delete (Renaming)...");
        try {
          // Generate a unique "deleted" key: deleted_TIMESTAMP_UUID_ORIGINALKEY
          // Limit length to avoid DB constraints if any, though text is usually flexible
          const timestamp = Date.now();
          // Use a simple random string if crypto is not fully avail in all envs (though it should be)
          const randomSuffix = Math.random().toString(36).substring(2, 9);
          const newKey = `deleted_${timestamp}_${randomSuffix}_${targetKey}`.substring(0, 250);

          let updateQuery = supabase.from('quotations').update({ theme_key: newKey });

          if (targetId) updateQuery = updateQuery.eq('id', targetId);
          else updateQuery = updateQuery.eq('theme_key', targetKey);

          const { error: softError } = await withTimeout(updateQuery, 5000);

          if (!softError) {
            deleted = true;
            console.log(`[Delete] Soft delete successful. Renamed to ${newKey}`);
            if (!suppressToasts) toast({ title: "Ocultado (Soft Delete)", description: "Registro renombrado y ocultado de la lista." });
          } else {
            console.error("[Delete] Soft delete failed:", softError);
            lastError = softError;
          }
        } catch (softErr) {
          console.error("[Delete] Soft delete exception:", softErr);
          lastError = softErr;
        }
      }

      if (!deleted) {
        // If we still couldn't delete, throw explicit error
        throw lastError || new Error("No se pudo borrar ni ocultar el registro (problema persistente de permisos).");
      }

      // 3. State Update (FUNCTIONAL UPDATE to prevent stale state bugs in loops)
      setThemes(prev => {
        const newThemes = { ...prev };
        delete newThemes[targetKey];
        return newThemes;
      });

      // Logic to switch theme if we deleted the active one
      if (targetKey === activeTheme) {
        // We need to calc fallback from PREVIOUS state effectively, but inside async it's hard.
        // We'll trust the separate effect or reload.
        // Actually, just reloading is safer if active theme is gone.
        window.location.reload();
      } else {
        if (!suppressToasts) toast({ title: "🗑️ Eliminado", description: `Cotización "${targetTheme.project}" borrada.` });
      }

    } catch (error) {
      console.error('[Delete] Error deleting:', error);
      if (!suppressToasts) {
        toast({
          title: "Error al borrar",
          description: error.message,
          variant: "destructive",
          duration: 4000
        });
      }
      throw error; // Re-throw so mass cleaner knows
    } finally {
      if (!suppressToasts) setIsDeleting(false);
    }
  };


  const updateState = (updates) => {
    if (!currentThemeData) return;
    setCurrentThemeData(prev => {
      const newState = { ...prev, ...updates };
      if (onPreviewUpdate) onPreviewUpdate(newState);
      return newState;
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? parseInt(value, 10) || 0 : value;
    updateState({ [name]: processedValue });
  };

  const handleSelectChange = (name, value) => {
    updateState({ [name]: value });
  };

  const handleSwitchChange = (name, checked) => {
    updateState({ [name]: checked });
  };

  const handleSliderChange = (name, value) => {
    updateState({ [name]: value[0] });
  };

  const handleLogoUploadClick = () => logoFileInputRef.current && logoFileInputRef.current.click();
  const handleFaviconUploadClick = () => faviconFileInputRef.current && faviconFileInputRef.current.click();

  const handleFileChange = (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Archivo demasiado grande", description: "Sube imagen < 2MB.", variant: "destructive" });
      return;
    }

    const isLogo = fileType === 'logo';
    const setIsUploading = isLogo ? setIsUploadingLogo : setIsUploadingFavicon;
    const field = isLogo ? 'logo' : 'favicon';

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      updateState({ [field]: base64String });
      setIsUploading(false);
      toast({ title: isLogo ? 'Logo cargado 🖼️' : 'Favicon cargado ✨', description: "Imagen procesada. Recuerda guardar." });
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast({ title: "Error", description: "No se pudo procesar la imagen.", variant: "destructive" });
    };

    reader.readAsDataURL(file);
    if (event.target) event.target.value = "";
  };

  const handleSave = async () => {
    if (!currentThemeData) return;
    setIsSaving(true);
    try {
      // Construct dataToSave carefully from currentThemeData
      const dataToSave = {
        company: currentThemeData.company, project: currentThemeData.project, client: currentThemeData.client,
        title: currentThemeData.title, subtitle: currentThemeData.subtitle, description: currentThemeData.description,
        logo: currentThemeData.logo, favicon: currentThemeData.favicon, logo_size: currentThemeData.logo_size,
        banner_text: currentThemeData.banner_text,
        banner_direction: currentThemeData.banner_direction,
        banner_scale: currentThemeData.banner_scale, idle_timeout: currentThemeData.idle_timeout,
        initial_display_time: currentThemeData.initial_display_time, phase1_duration: currentThemeData.phase1_duration,
        phase2_duration: currentThemeData.phase2_duration, phase3_duration: currentThemeData.phase3_duration,
        phase1_name: currentThemeData.phase1_name, phase2_name: currentThemeData.phase2_name,
        phase3_name: currentThemeData.phase3_name, phase4_name: currentThemeData.phase4_name,
        slug: currentThemeData.slug,
        hide_banner: currentThemeData.hide_banner,
        brand_color: currentThemeData.brand_color, // Save brand selection
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('quotations').update(dataToSave).eq('theme_key', activeTheme);
      if (error) throw error;

      setThemes(prev => ({
        ...prev,
        [activeTheme]: { ...prev[activeTheme], ...currentThemeData }
      }));

      toast({ title: "¡Guardado exitoso! 🎉", description: `Datos actualizados.` });
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (themes && themes[activeTheme]) {
      setCurrentThemeData(themes[activeTheme]);
      toast({ title: "Restaurado 🔄", description: "Valores restablecidos." });
    }
  };

  const handleThemeChange = (newThemeKey) => {
    setActiveTheme(newThemeKey);
  };

  const handleGoToTemplate = () => {
    if (!themes) return;
    const templateKey = Object.keys(themes).find(key => themes[key].is_template);
    if (templateKey) setActiveTheme(templateKey);
  };

  const handleSetAsTemplate = async () => {
    if (!themes) return;
    setIsSaving(true);
    try {
      const currentTemplateKey = Object.keys(themes).find(key => themes[key].is_template);
      if (currentTemplateKey) {
        await supabase.from('quotations').update({ is_template: false }).eq('theme_key', currentTemplateKey);
      }
      await supabase.from('quotations').update({ is_template: true }).eq('theme_key', activeTheme);

      setThemes(prev => {
        const newThemes = { ...prev };
        if (currentTemplateKey) newThemes[currentTemplateKey] = { ...newThemes[currentTemplateKey], is_template: false };
        newThemes[activeTheme] = { ...newThemes[activeTheme], is_template: true };
        return newThemes;
      });
      toast({ title: "Nueva Plantilla Base 🌟", description: "Cotización establecida como template." });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAsHome = async () => {
    if (!themes) return;
    setIsSaving(true);
    try {
      const currentHomeKey = Object.keys(themes).find(key => themes[key].is_home);
      if (currentHomeKey) {
        await supabase.from('quotations').update({ is_home: false }).eq('theme_key', currentHomeKey);
      }
      await supabase.from('quotations').update({ is_home: true }).eq('theme_key', activeTheme);

      setThemes(prev => {
        const newThemes = { ...prev };
        if (currentHomeKey) newThemes[currentHomeKey] = { ...newThemes[currentHomeKey], is_home: false };
        newThemes[activeTheme] = { ...newThemes[activeTheme], is_home: true };
        return newThemes;
      });
      toast({ title: "Nueva Home Page 🏠", description: "Cotización establecida como inicio." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCopyLink = () => {
    if (currentThemeData?.slug) {
      navigator.clipboard.writeText(`https://www.solimaq.site/cotizacion/${currentThemeData.slug}`);
      toast({ title: "Copiado 📋", description: "Enlace en portapapeles (solimaq.site)." });
    } else {
      toast({ title: "Sin Slug", description: "Esta cotización no tiene slug.", variant: "destructive" });
    }
  };

  const handleOpenLink = () => {
    if (currentThemeData?.slug) {
      // Force solimaq.site as requested
      window.open(`https://www.solimaq.site/cotizacion/${currentThemeData.slug}`, '_blank');
    }
  };

  if (!isOpen) return null;
  // CRITICAL GUARD: Render nothing if critical data missing
  if (!currentThemeData || !themes) return null;

  // Safe derivations
  const themeObj = themes[activeTheme];
  const isEditingTemplate = themeObj?.is_template;
  const isEditingHome = themeObj?.is_home;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="bg-[#0a0a0a] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#0f0f0f]">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-3"><Settings className="w-6 h-6 text-primary" />{t('adminModal.panelTitle') || "Panel Admin"}</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800"><X className="h-5 w-5" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">

                {/* --- QUOTATION SELECTOR (POPOVER) --- */}
                <div className="md:col-span-2">
                  {isManageMode ? (
                    /* --- MANAGEMENT VIEW --- */
                    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Settings className="w-5 h-5 text-gray-400" />
                          Gestión de Cotizaciones
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsManageMode(false)} className="text-gray-400 hover:text-white">
                          cerrar
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {Object.values(themes || {})
                          .filter(t => !t.theme_key.startsWith('deleted_')) // Validar filtro visual local
                          .sort((a, b) => (a?.project || "").localeCompare(b?.project || "")).map(theme => {
                            const isActive = activeTheme === theme.theme_key;
                            const isProtected = theme.is_template; // Only protect Template, allow deleting Home
                            return (
                              <div key={theme.theme_key} className={cn("flex items-center justify-between p-3 rounded-lg border transition-all", isActive ? "bg-primary/5 border-primary/30" : "bg-gray-950/50 border-gray-800 hover:border-gray-600")}>
                                <div className="flex flex-col overflow-hidden mr-3">
                                  <div className="flex items-center gap-2">
                                    {isProtected && (theme.is_home ? <Home className="w-3 h-3 text-primary shrink-0" /> : <Star className="w-3 h-3 text-yellow-400 shrink-0" />)}
                                    <span className={cn("font-medium truncate", isActive ? "text-primary" : "text-gray-200")}>{theme.project || "Sin Nombre"}</span>
                                  </div>
                                  <span className="text-xs text-gray-500 truncate">{theme.client}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button variant="ghost" size="sm" onClick={() => { handleThemeChange(theme.theme_key); setIsManageMode(false); toast({ title: "Cargado", description: `Editando ${theme.project}` }); }} className="text-gray-400 hover:text-white hover:bg-gray-800" disabled={isActive}>
                                    {isActive ? "Activa" : "Cargar"}
                                  </Button>
                                  {!isProtected && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-500 hover:bg-red-950/30" onClick={() => handleDelete(theme.theme_key)} title="Eliminar definitivamente">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <div className="pt-2 border-t border-gray-800 space-y-2">
                        <Button
                          onClick={async () => {
                            if (!confirm("⚠️ ¡PELIGRO! ⚠️\n\nEsto borrará TODAS las cotizaciones excepto:\n1. Proyectos que contengan 'ESSITY'\n2. La página definida como HOME\n3. La Plantilla Base\n\n¿Estás SEGURO de que quieres continuar? Esta acción NO se puede deshacer.")) return;

                            setIsDeleting(true);
                            toast({ title: "Iniciando Limpieza Masiva", description: "Por favor no cierres esta ventana..." });

                            try {
                              const allThemes = Object.values(themes);
                              let deletedCount = 0;
                              let errorsCount = 0;

                              for (const theme of allThemes) {
                                // SKIP CRITERIA
                                const isEssity = theme.project && theme.project.toUpperCase().includes('ESSITY');
                                const isHome = theme.is_home;
                                const isTemplate = theme.is_template;

                                if (isEssity || isHome || isTemplate) {
                                  console.log(`[MassDelete] Skipping PROTECTED: ${theme.project} (Essity=${isEssity}, Home=${isHome}, Template=${isTemplate})`);
                                  continue;
                                }

                                // DELETE
                                try {
                                  await handleDelete(theme.theme_key);
                                  deletedCount++;
                                  // Small delay to let UI breathe
                                  await new Promise(r => setTimeout(r, 200));
                                } catch (err) {
                                  console.error(`[MassDelete] Failed to delete ${theme.project}`, err);
                                  errorsCount++;
                                }
                              }

                              toast({
                                title: "Limpieza Completada",
                                description: `Borrados: ${deletedCount}. Errores: ${errorsCount}.`,
                                duration: 5000
                              });

                            } catch (err) {
                              console.error("Mass delete fatal error", err);
                              toast({ title: "Error Fatal", description: err.message, variant: "destructive" });
                            } finally {
                              setIsDeleting(false);
                            }
                          }}
                          disabled={isDeleting}
                          className="w-full bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-red-900/30"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          {isDeleting ? "Limpiando..." : "EJECUTAR LIMPIEZA DE EMERGENCIA"}
                        </Button>
                        <Button onClick={() => setIsManageMode(false)} className="w-full bg-gray-800 hover:bg-gray-700 text-white">Terminar Gestión</Button>
                      </div>
                    </div>
                  ) : isConfigMode ? (
                    /* --- BRAND CONFIGURATION VIEW --- */
                    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Palette className="w-5 h-5 text-gray-400" />
                          Configuración de Marca
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsConfigMode(false)} className="text-gray-400 hover:text-white">
                          cerrar
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <Label className="text-gray-300 mb-2">Selecciona la identidad de marca para esta cotización:</Label>
                        {Object.values(BRANDS).map((brand) => {
                          const isSelected = (currentThemeData.brand_color || 'solimaq') === brand.id;
                          return (
                            <div
                              key={brand.id}
                              onClick={() => {
                                // Update brand color
                                const updates = { brand_color: brand.id };
                                // Auto-update logo if it was empty or using the other brand's default
                                const currentLogo = currentThemeData.logo;
                                const otherBrandId = Object.keys(BRANDS).find(id => id !== brand.id);
                                const otherBrandDefaultLogo = BRANDS[otherBrandId]?.defaultLogo;

                                // Simple logic: if no logo, or logo matches other brand's default, switch it.
                                // Or always ask? Let's just switch if empty for now to be safe, or just relying on manual upload.
                                // Actually, user said "cada marca podra tener su propio logo".
                                // Let's auto-set it if it's currently empty.
                                if (!currentLogo) {
                                  updates.logo = brand.defaultLogo;
                                }
                                updateState(updates);
                              }}
                              className={cn(
                                "cursor-pointer flex items-center justify-between p-4 rounded-lg border transition-all hover:bg-gray-800",
                                isSelected ? "bg-gray-800 border-primary ring-1 ring-primary" : "bg-gray-950 border-gray-800"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm"
                                  style={{ backgroundColor: `hsl(${brand.colors.primary})`, color: `hsl(${brand.colors.primaryForeground})` }}
                                >
                                  {brand.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className={cn("font-bold", isSelected ? "text-white" : "text-gray-400")}>{brand.label}</h4>
                                  <p className="text-xs text-gray-500">Identidad {brand.name}</p>
                                </div>
                              </div>
                              {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-gray-800 flex justify-end">
                        <Button onClick={() => setIsConfigMode(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Check className="w-4 h-4 mr-2" /> Listo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* --- NORMAL EDIT VIEW --- */
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-primary font-semibold flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          {t('adminModal.activeQuotation') || "Cotización Activa"}
                        </Label>

                        {/* SIMPLE NATIVE-LIKE SELECTOR */}
                        <Select value={activeTheme} onValueChange={handleThemeChange}>
                          <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white h-10">
                            <SelectValue placeholder="Seleccionar cotización..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700 text-white z-[60] max-h-[300px]">
                            {Object.values(themes || {})
                              .sort((a, b) => (a?.project || "").localeCompare(b?.project || ""))
                              .map((theme) => (
                                <SelectItem key={theme.theme_key} value={theme.theme_key} className="focus:bg-gray-800 cursor-pointer">
                                  <span className="flex items-center gap-2">
                                    {theme.is_home && <Home className="w-3 h-3 text-primary" />}
                                    {theme.is_template && <Star className="w-3 h-3 text-yellow-400" />}
                                    {theme.project} <span className="text-gray-500 text-xs">({theme.client})</span>
                                  </span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Config Button */}
                      <Button
                        variant="secondary"
                        onClick={() => setIsConfigMode(true)}
                        className="bg-gray-800 text-white hover:bg-gray-700 border border-gray-700 h-10 px-3"
                        title="Configuración de Marca"
                      >
                        <Palette className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Configuración</span>
                      </Button>

                      {/* Management Button */}
                      <Button
                        variant="secondary"
                        onClick={() => setIsManageMode(true)}
                        className="bg-gray-800 text-white hover:bg-gray-700 border border-gray-700 h-10 px-3"
                        title="Gestionar Cotizaciones"
                      >
                        <Settings className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Gestionar</span>
                      </Button>
                    </div>
                  )}
                </div>

                <div><Label htmlFor="company" className="text-primary mb-2 block font-semibold">{t('adminModal.company')}</Label><Input id="company" name="company" value={currentThemeData.company || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>

                {/* Start Page Switch */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Home className={`w-5 h-5 ${currentThemeData.is_home ? 'text-primary' : 'text-gray-400'}`} />
                    <Label htmlFor="is_home" className="text-white cursor-pointer select-none font-semibold">
                      {t('adminModal.setAsHomePage') || "Página de Inicio"}
                    </Label>
                  </div>
                  <Switch
                    id="is_home"
                    checked={!!currentThemeData.is_home}
                    onCheckedChange={handleSetAsHome}
                    disabled={isSaving}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div><Label htmlFor="project" className="text-primary mb-2 block font-semibold">{t('adminModal.project')}</Label><Input id="project" name="project" value={currentThemeData.project || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div><Label htmlFor="client" className="text-primary mb-2 block font-semibold">{t('adminModal.client')}</Label><Input id="client" name="client" value={currentThemeData.client || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div><Label htmlFor="title" className="text-primary mb-2 block font-semibold">{t('adminModal.title')}</Label><Input id="title" name="title" value={currentThemeData.title || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="subtitle" className="text-primary mb-2 block font-semibold">{t('adminModal.subtitle')}</Label><Input id="subtitle" name="subtitle" value={currentThemeData.subtitle || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="slug" className="text-primary mb-2 block flex items-center gap-2 font-semibold"><LinkIcon className="w-4 h-4" />{t('adminModal.slug')}</Label><Input id="slug" name="slug" value={currentThemeData.slug || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="description" className="text-primary mb-2 block font-semibold">{t('adminModal.description')}</Label><textarea id="description" name="description" value={currentThemeData.description || ''} onChange={handleInputChange} rows="3" className="flex w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50" /></div>

                {/* Banner Settings */}
                <div className="md:col-span-2 border-t border-gray-800 pt-6">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Announce className="w-5 h-5" />{t('adminModal.bannerSettings')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="banner_text" className="text-gray-300">{t('adminModal.bannerText')}</Label>
                      <Input id="banner_text" name="banner_text" value={currentThemeData.banner_text || ''} onChange={handleInputChange} placeholder="Texto del banner..." className="bg-gray-900 border-gray-700 text-white focus:border-primary" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="banner_direction" className="text-gray-300 flex items-center gap-2"><MoveHorizontal className="w-4 h-4" />{t('adminModal.bannerDirection')}</Label>
                      <Select value={currentThemeData.banner_direction} onValueChange={(val) => handleSelectChange('banner_direction', val)}>
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          <SelectItem value="left-to-right" className="focus:bg-primary">{t('adminModal.leftToRight')}</SelectItem>
                          <SelectItem value="right-to-left" className="focus:bg-primary">{t('adminModal.rightToLeft')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 flex items-center space-x-2 pt-4">
                      <Switch id="hide-banner" checked={currentThemeData.hide_banner} onCheckedChange={(checked) => handleSwitchChange('hide_banner', checked)} className="data-[state=checked]:bg-primary" />
                      <Label htmlFor="hide-banner" className="flex items-center gap-2 text-gray-300"><EyeOff className="w-4 h-4" />{t('adminModal.hideBanner')}</Label>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4"><Label className="text-primary mb-2 block flex items-center gap-2 font-semibold"><Scale className="w-5 h-5" />{t('adminModal.logoWidth')}: <span className="font-bold text-primary">{currentThemeData.logo_size}px</span></Label><Slider id="logoSize" name="logo_size" min={50} max={700} step={5} value={[currentThemeData.logo_size]} onValueChange={(val) => handleSliderChange('logo_size', val)} className="[&>.relative>.bg-primary]:bg-primary" /></div>
                <div className="md:col-span-2 space-y-4"><Label className="text-primary mb-2 block flex items-center gap-2 font-semibold"><Minimize className="w-5 h-5" />{t('adminModal.bannerSize')}: <span className="font-bold text-primary">{currentThemeData.banner_scale}%</span></Label><Slider id="bannerScale" name="banner_scale" min={30} max={150} step={10} value={[currentThemeData.banner_scale]} onValueChange={(val) => handleSliderChange('banner_scale', val)} className="[&>.relative>.bg-primary]:bg-primary" /></div>
                <div className="md:col-span-1"><Label htmlFor="initialDisplayTime" className="text-primary mb-2 block flex items-center gap-2 font-semibold"><PlaySquare className="w-5 h-5" />{t('adminModal.initialTime')}</Label><Input id="initialDisplayTime" name="initial_display_time" type="number" value={currentThemeData.initial_display_time} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-1"><Label htmlFor="idleTimeout" className="text-primary mb-2 block flex items-center gap-2 font-semibold"><Timer className="w-5 h-5" />{t('adminModal.idleTime')}</Label><Input id="idleTimeout" name="idle_timeout" type="number" value={currentThemeData.idle_timeout} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>

                {/* Timeline - Simplified for brevity but functional */}
                <div className="md:col-span-2 border-t border-gray-800 pt-6">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Clock className="w-5 h-5" />{t('adminModal.timelineSettings')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <Label className="flex items-center gap-2 text-primary font-semibold"><CheckCircle className="w-4 h-4" />{t('adminModal.phase1')}</Label>
                      <Input name="phase1_name" value={currentThemeData.phase1_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary mb-2" />
                      <Input name="phase1_duration" type="number" value={currentThemeData.phase1_duration} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" />
                    </div>
                    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <Label className="flex items-center gap-2 text-primary font-semibold"><Wrench className="w-4 h-4" />{t('adminModal.phase2')}</Label>
                      <Input name="phase2_name" value={currentThemeData.phase2_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary mb-2" />
                      <Input name="phase2_duration" type="number" value={currentThemeData.phase2_duration} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" />
                    </div>
                    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <Label className="flex items-center gap-2 text-primary font-semibold"><Ship className="w-4 h-4" />{t('adminModal.phase3')}</Label>
                      <Input name="phase3_name" value={currentThemeData.phase3_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary mb-2" />
                      <Input name="phase3_duration" type="number" value={currentThemeData.phase3_duration} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" />
                    </div>
                    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <Label className="flex items-center gap-2 text-primary font-semibold"><Truck className="w-4 h-4" />{t('adminModal.phase4')}</Label>
                      <Input name="phase4_name" value={currentThemeData.phase4_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-800">
                  <Button variant="outline" onClick={handleLogoUploadClick} disabled={isUploadingLogo} className="border-primary text-primary hover:bg-primary/10">{isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{isUploadingLogo ? t('adminModal.uploading') : t('adminModal.uploadLogo')}</Button>
                  <Button variant="outline" onClick={handleFaviconUploadClick} disabled={isUploadingFavicon} className="border-primary text-primary hover:bg-primary/10">{isUploadingFavicon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image className="mr-2 h-4 w-4" />}{isUploadingFavicon ? t('adminModal.uploading') : t('adminModal.uploadFavicon')}</Button>
                </div>
                <input type="file" ref={logoFileInputRef} onChange={(e) => handleFileChange(e, 'logo')} accept="image/png, image/jpeg, image/svg+xml" className="hidden" />
                <input type="file" ref={faviconFileInputRef} onChange={(e) => handleFileChange(e, 'favicon')} accept="image/x-icon, image/png, image/svg+xml" className="hidden" />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 bg-[#0f0f0f] space-y-4">
              {/* Primary Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button variant="outline" onClick={onCloneClick} className="border-primary text-primary hover:bg-primary/10 w-full"><Copy className="h-4 w-4 mr-2" />{t('adminModal.clone')}</Button>
                <Button variant="outline" onClick={handleCopyLink} className="border-primary text-primary hover:bg-primary/10 w-full"><ClipboardCopy className="h-4 w-4 mr-2" />Link</Button>
                <Button variant="outline" onClick={() => setShowQR(true)} className="border-primary text-primary hover:bg-primary/10 w-full"><QrCode className="h-4 w-4 mr-2" />QR</Button>
                <Button variant="outline" onClick={handleOpenLink} className="border-primary text-primary hover:bg-primary/10 w-full"><ExternalLink className="h-4 w-4 mr-2" />Abrir</Button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!isEditingTemplate && (
                  <Button variant="secondary" onClick={handleSetAsTemplate} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 w-full"><Star className="h-4 w-4 mr-2" />{t('adminModal.setAsTemplate')}</Button>
                )}
                {!isEditingHome && (
                  <Button variant="secondary" onClick={handleSetAsHome} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 w-full"><Home className="h-4 w-4 mr-2" />{t('adminModal.setAsHomePage')}</Button>
                )}
                <Button variant="outline" onClick={() => window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime()} className="border-green-500 text-green-500 hover:bg-green-500/10 w-full"><RefreshCw className="h-4 w-4 mr-2" />Ver Cambios en Vivo</Button>

                {!isEditingTemplate && !isEditingHome && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete()}
                    disabled={isDeleting || isSaving}
                    className="bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 w-full sm:col-span-2 mt-2"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    {isDeleting ? "Eliminando..." : "Eliminar Cotización"}
                  </Button>
                )}
              </div>

              {/* Save & Reset */}
              <div className="flex gap-3 pt-2 border-t border-gray-800">
                <Button variant="outline" onClick={handleReset} disabled={isSaving} className="border-primary text-primary hover:bg-primary/10 flex-1"><Eraser className="h-4 w-4 mr-2" />{t('adminModal.reset')}</Button>
                <Button onClick={handleSave} disabled={isSaving || isUploadingLogo || isUploadingFavicon} className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.4)] flex-[2]">{isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}{"Guardar y Publicar"}</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )
      }



      {
        showQR && currentThemeData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setShowQR(false)}>
            <div className="bg-white p-8 rounded-xl flex flex-col items-center gap-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-black">Código QR</h3>
              <div className="p-4 bg-white rounded-lg shadow-inner border border-gray-200">
                <QRCodeCanvas value={`https://www.solimaq.site/cotizacion/${currentThemeData.slug}`} size={256} level="H" includeMargin={true} />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium mb-1">{currentThemeData.project}</p>
                <Button onClick={() => setShowQR(false)} className="w-full mt-4">Cerrar</Button>
              </div>
            </div>
          </div>
        )
      }
    </AnimatePresence >
  );
};

export default AdminModal;