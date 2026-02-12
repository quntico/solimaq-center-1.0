import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, Zap, ChevronsUpDown, X, Save, Eraser, Settings, Palette, Scale, Upload, Image, Loader2, Minimize, Timer, PlaySquare, Clock, CheckCircle, Wrench, Ship, Truck, Copy, Link as LinkIcon, ClipboardCopy, Star, Home, MonitorSpeaker as Announce, MoveHorizontal, EyeOff, ExternalLink, QrCode, RefreshCw, Trash2, FileDown } from 'lucide-react';
import { cn, sanitizeFileName } from '@/lib/utils';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { getActiveBucket } from '@/lib/bucketResolver';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from '@/contexts/LanguageContext';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
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

  const handleFileChange = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "Archivo demasiado grande", description: "Sube imagen < 100MB.", variant: "destructive" });
      return;
    }

    const isLogo = fileType === 'logo';
    const setIsUploading = isLogo ? setIsUploadingLogo : setIsUploadingFavicon;
    const field = isLogo ? 'logo' : 'favicon';

    setIsUploading(true);

    try {
      const bucketName = await getActiveBucket();
      const fileName = `${field}s/${activeTheme.toLowerCase()}-${Date.now()}-${sanitizeFileName(file.name)}`;


      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      updateState({ [field]: publicUrl });
      toast({ title: isLogo ? 'Logo cargado 🖼️' : 'Favicon cargado ✨', description: "Imagen guardada en la nube. Recuerda guardar cambios." });
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      toast({ title: "Error", description: `No se pudo subir el ${fileType}: ${error.message}`, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = "";
    }
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
        brand_color: currentThemeData.brand_color,
        sections_config: currentThemeData.sections_config, // Ensure sections are saved!
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

  const [isOptimizing, setIsOptimizing] = useState(false);

  const migrateBase64ToStorage = async () => {
    if (!currentThemeData) return;
    setIsOptimizing(true);
    let migratedCount = 0;

    try {
      const bucketName = await getActiveBucket();
      const updatedData = { ...currentThemeData };

      // 1. Helper function to upload base64
      const uploadBase64 = async (base64, path) => {
        if (!base64 || !base64.startsWith('data:')) return base64;

        const response = await fetch(base64);
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'png';
        const fileName = `${path}-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, blob, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        migratedCount++;
        return publicUrl;
      };

      // 2. Migrate Logo
      if (updatedData.logo?.startsWith('data:')) {
        updatedData.logo = await uploadBase64(updatedData.logo, `logos/${activeTheme.toLowerCase()}-logo`);
      }

      // 3. Migrate Favicon
      if (updatedData.favicon?.startsWith('data:')) {
        updatedData.favicon = await uploadBase64(updatedData.favicon, `favicons/${activeTheme.toLowerCase()}-favicon`);
      }

      // 4. Migrate Sections
      if (updatedData.sections_config && Array.isArray(updatedData.sections_config)) {
        const newSections = await Promise.all(updatedData.sections_config.map(async (section) => {
          if (section.content?.image?.startsWith('data:')) {
            const newImage = await uploadBase64(section.content.image, `sections/${section.id}/${activeTheme.toLowerCase()}`);
            return { ...section, content: { ...section.content, image: newImage } };
          }
          // Handle Process Flow images if they were stored in a different structure
          if (section.id === 'proceso' && section.content && Array.isArray(section.content)) {
            const newSteps = await Promise.all(section.content.map(async (step) => {
              if (step.image?.startsWith('data:')) {
                const newImg = await uploadBase64(step.image, `proceso/${activeTheme.toLowerCase()}-step`);
                return { ...step, image: newImg };
              }
              return step;
            }));
            return { ...section, content: newSteps };
          }
          return section;
        }));
        updatedData.sections_config = newSections;
      }

      if (migratedCount > 0) {
        setCurrentThemeData(updatedData);
        if (onPreviewUpdate) onPreviewUpdate(updatedData);
        toast({
          title: "Optimización completada 🚀",
          description: `Se han migrado ${migratedCount} imágenes pesadas a la nube. ¡Recuerda GUARDAR cambios!`
        });
      } else {
        toast({ title: "Todo en orden ✨", description: "No se encontraron imágenes pesadas para optimizar." });
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast({ title: "Error en optimización", description: error.message, variant: "destructive" });
    } finally {
      setIsOptimizing(false);
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
      // 1. Desmarcar template anterior
      const currentTemplateKey = Object.keys(themes).find(key => themes[key].is_template);
      if (currentTemplateKey) {
        await supabase.from('quotations').update({ is_template: false }).eq('theme_key', currentTemplateKey);
      }

      // 2. Desmarcar home anterior (porque la nueva plantilla será la nueva home)
      const currentHomeKey = Object.keys(themes).find(key => themes[key].is_home);
      if (currentHomeKey && currentHomeKey !== activeTheme) { // Optimización: no desmarcar si ya es el mismo
        await supabase.from('quotations').update({ is_home: false }).eq('theme_key', currentHomeKey);
      }

      // 3. Marcar activo como template Y home
      await supabase.from('quotations').update({ is_template: true, is_home: true }).eq('theme_key', activeTheme);

      setThemes(prev => {
        const newThemes = { ...prev };
        // Limpiar flags anteriores
        if (currentTemplateKey) newThemes[currentTemplateKey] = { ...newThemes[currentTemplateKey], is_template: false };
        if (currentHomeKey) newThemes[currentHomeKey] = { ...newThemes[currentHomeKey], is_home: false };

        // Setear flags nuevos
        newThemes[activeTheme] = { ...newThemes[activeTheme], is_template: true, is_home: true };
        return newThemes;
      });
      toast({ title: "Plantilla y Home Actualizados 🌟", description: "Esta cotización ahora es la Plantilla y página de Inicio." });
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
      const newVal = !currentThemeData.is_home; // Toggle logic although typical use is setting to TRUE only via toggle? 
      // Actually switch handles toggle. If setting to TRUE, wipe others.
      // If setting to FALSE, just toggle off (risk: no home).

      if (newVal) {
        // Setting TO Home -> Wipe others
        await supabase.from('quotations').update({ is_home: false }).neq('theme_key', activeTheme);
        await supabase.from('quotations').update({ is_home: true }).eq('theme_key', activeTheme);
      } else {
        // Setting OFF Home -> Just update self
        await supabase.from('quotations').update({ is_home: false }).eq('theme_key', activeTheme);
      }

      setThemes(prev => {
        const newThemes = {};
        Object.keys(prev).forEach(key => {
          // If turning ON, wipe others. If turning OFF, just wipe self.
          const isTarget = key === activeTheme;
          newThemes[key] = {
            ...prev[key],
            is_home: newVal ? isTarget : (isTarget ? false : prev[key].is_home)
          };
        });
        return newThemes;
      });

      toast({ title: newVal ? "Proyecto Activo Definido 🏠" : "Desmarcado", description: newVal ? "Se limpiaron otros proyectos activos." : "Ya no es el proyecto activo." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCopyLink = () => {
    if (!currentThemeData?.slug) {
      toast({ title: "Sin Slug", description: "Esta cotización no tiene slug.", variant: "destructive" });
      return;
    }

    // Check for unsaved changes in slug
    const savedSlug = themes[activeTheme]?.slug;
    const currentSlug = currentThemeData.slug;

    if (savedSlug !== currentSlug) {
      toast({
        title: "⚠️ Cambios sin guardar",
        description: "El slug ha cambiado. Guarda los cambios para que el enlace funcione correctamente.",
        variant: "destructive",
        duration: 5000
      });
    }

    navigator.clipboard.writeText(`https://www.solimaq.site/cotizacion/${currentThemeData.slug}`);
    toast({ title: "Copiado 📋", description: "Enlace en portapapeles (solimaq.site)." });
  };

  const handleOpenLink = () => {
    if (!currentThemeData?.slug) return;

    const savedSlug = themes[activeTheme]?.slug;
    const currentSlug = currentThemeData.slug;

    if (savedSlug !== currentSlug) {
      toast({
        title: "⚠️ Cambios sin guardar",
        description: "Guarda los cambios antes de abrir el enlace.",
        variant: "destructive"
      });
      return;
    }

    // Force solimaq.site as requested
    window.open(`https://www.solimaq.site/cotizacion/${currentThemeData.slug}`, '_blank');
  };

  const handleDownloadQRPDF = () => {
    if (!currentThemeData?.slug) {
      toast({ title: "Sin Slug", description: "Esta cotización no tiene slug.", variant: "destructive" });
      return;
    }

    try {
      // Get QR canvas
      const qrCanvas = document.querySelector('#qr-canvas-download');
      if (!qrCanvas) {
        toast({ title: "Error", description: "No se pudo generar el QR. Asegúrate de que el código sea visible.", variant: "destructive" });
        return;
      }

      const qrImage = qrCanvas.toDataURL('image/png');
      const url = `https://www.solimaq.site/cotizacion/${currentThemeData.slug}`;
      const projectTitle = currentThemeData.project || 'Proyecto';
      const clientName = currentThemeData.client || '';

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // --- HEADER ---
      // Add Title (Centered, Bold)
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const titleLines = pdf.splitTextToSize(projectTitle, 170);
      pdf.text(titleLines, 105, 30, { align: 'center' });

      // Add Subtitle (Client)
      let currentY = 30 + (titleLines.length * 10);
      if (clientName) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text(clientName, 105, currentY, { align: 'center' });
        currentY += 15;
      } else {
        currentY += 5;
      }

      // --- QR CODE ---
      const qrSize = 90;
      const qrX = (210 - qrSize) / 2;
      pdf.addImage(qrImage, 'PNG', qrX, currentY, qrSize, qrSize);
      currentY += qrSize + 15;

      // --- CLICKABLE LINK ---
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204); // Blue color link
      pdf.setFont('helvetica', 'bold');

      const linkText = url;
      const textWidth = pdf.getTextWidth(linkText);
      const textX = (210 - textWidth) / 2;

      pdf.text(linkText, textX, currentY);

      // Make it clickable
      pdf.link(textX, currentY - 4, textWidth, 6, { url: url });

      currentY += 10;

      // --- INSTRUCTIONS ---
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Escanea el código QR o haz clic en el enlace para acceder al proyecto.', 105, currentY, { align: 'center' });

      // Add Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generado por Solimaq Center', 105, 280, { align: 'center' });

      // Save PDF
      const safeTitle = (projectTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `QR_${safeTitle}.pdf`;
      pdf.save(fileName);

      toast({ title: "¡PDF Descargado! 📄", description: `${fileName} guardado con enlace activo.` });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    }
  };


  if (!isOpen) return null;
  // CRITICAL GUARD: Render nothing if critical data missing
  if (!currentThemeData || !themes) return null;

  // Safe derivations
  const themeObj = themes[activeTheme];
  const isEditingTemplate = themeObj?.is_template;
  const isEditingHome = themeObj?.is_home;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-4" onClick={onClose}>
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
                          .filter(t => t && t.theme_key && !String(t.theme_key).startsWith('deleted_')) // Validar filtro visual local y existencia
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
                                  <span className="text-[10px] text-gray-600 truncate font-mono">{theme.theme_key}</span>
                                  {String(theme.theme_key).startsWith('mp-') && (
                                    <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1 rounded inline-block w-fit mt-1">MASTER PLAN</span>
                                  )}
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
                                // Always update logo to match the brand when explicitly changed by user
                                updates.logo = brand.defaultLogo;
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
                          <SelectContent className="bg-gray-900 border-gray-700 text-white z-[6000] max-h-[300px]">
                            {Object.values(themes || {})
                              .filter(t => t && t.theme_key && !String(t.theme_key).startsWith('deleted_'))
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


                <div className="flex flex-col gap-2 mt-4 p-3 rounded-xl border border-gray-800 bg-gray-950/50">
                  <Label className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                    Visibilidad (Default)
                  </Label>
                  <button
                    onClick={handleSetAsHome}
                    disabled={isSaving}
                    className={cn(
                      "w-full py-2 px-4 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide relative overflow-hidden group border",
                      currentThemeData.is_home
                        ? "bg-primary/20 text-primary border-primary shadow-[0_0_15px_rgba(155,212,40,0.3)]" // Active State (Sutil)
                        : "bg-gray-900 text-gray-500 border-gray-800 hover:border-gray-600 hover:text-gray-300" // Inactive State
                    )}
                  >
                    {/* Status Indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-sm mr-1",
                      currentThemeData.is_home ? "bg-primary animate-pulse shadow-[0_0_8px_currentColor]" : "bg-gray-700"
                    )} />

                    <Home className={cn("w-4 h-4 z-10", currentThemeData.is_home ? "fill-current" : "")} />
                    <span className="z-10 relative">{currentThemeData.is_home ? "PROYECTO ACTIVO" : "Establecer como Activo"}</span>
                  </button>
                </div>

                <div><Label htmlFor="project" className="text-primary mb-2 block font-semibold">{t('adminModal.project')}</Label><Input id="project" name="project" value={currentThemeData.project || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div><Label htmlFor="client" className="text-primary mb-2 block font-semibold">{t('adminModal.client')}</Label><Input id="client" name="client" value={currentThemeData.client || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div><Label htmlFor="title" className="text-primary mb-2 block font-semibold">{t('adminModal.title')}</Label><Input id="title" name="title" value={currentThemeData.title || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="subtitle" className="text-primary mb-2 block font-semibold">{t('adminModal.subtitle')}</Label><Input id="subtitle" name="subtitle" value={currentThemeData.subtitle || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="slug" className="text-primary mb-2 block flex items-center gap-2 font-semibold"><LinkIcon className="w-4 h-4" />{t('adminModal.slug')}</Label><Input id="slug" name="slug" value={currentThemeData.slug || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="description" className="text-primary mb-2 block font-semibold">{t('adminModal.description')}</Label><textarea id="description" name="description" value={currentThemeData.description || ''} onChange={handleInputChange} rows="3" className="flex w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50" /></div>

                <div className="pt-4 border-t border-white/10 space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Optimización de Rendimiento
                  </h3>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl space-y-2">
                    <p className="text-sm text-yellow-200/80">
                      Si la página tarda más de 5 segundos en cargar, es probable que tengas imágenes antiguas guardadas de forma ineficiente.
                    </p>
                    <Button
                      onClick={migrateBase64ToStorage}
                      disabled={isOptimizing}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold"
                    >
                      {isOptimizing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Optimizando...</>
                      ) : (
                        "ACELERAR CARGA (MIGRAR A LA NUBE)"
                      )}
                    </Button>
                  </div>
                </div>
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
                <Button variant="outline" onClick={handleDownloadQRPDF} className="border-primary text-primary hover:bg-primary/10 w-full"><QrCode className="h-4 w-4 mr-2" />QR</Button>
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

              {/* HIDDEN QR CANVAS FOR GENERATION */}
              <div className="absolute opacity-0 pointer-events-none -z-50">
                <QRCodeCanvas
                  id="qr-canvas-hidden"
                  value={`https://www.solimaq.site/cotizacion/${currentThemeData?.slug || ''}`}
                  size={512}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: currentThemeData?.favicon || "",
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AdminModal;