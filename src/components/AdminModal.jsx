import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Eraser, Settings, Palette, Scale, Upload, Image, Loader2, Minimize, Timer, PlaySquare, Clock, CheckCircle, Wrench, Ship, Truck, Copy, Link as LinkIcon, ClipboardCopy, Star, Home, MonitorSpeaker as Announce, MoveHorizontal, EyeOff, ExternalLink, QrCode, RefreshCw } from 'lucide-react';
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

const AdminModal = ({ isOpen, onClose, themes, setThemes, activeTheme, setActiveTheme, onCloneClick, onPreviewUpdate }) => {
  const [currentThemeData, setCurrentThemeData] = useState(themes[activeTheme]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const logoFileInputRef = useRef(null);
  const faviconFileInputRef = useRef(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (onPreviewUpdate) {
      onPreviewUpdate(currentThemeData);
    }
  }, [currentThemeData, onPreviewUpdate]);

  useEffect(() => {
    if (isOpen && themes[activeTheme]) {
      const themeDataFromApp = themes[activeTheme];
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

  const updateState = (updates) => {
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

  const handleLogoUploadClick = () => logoFileInputRef.current.click();
  const handleFaviconUploadClick = () => faviconFileInputRef.current.click();

  const handleFileChange = (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Limit file size to 2MB to prevent database bloat
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "Por favor sube una imagen de menos de 2MB.",
        variant: "destructive"
      });
      return;
    }

    const isLogo = fileType === 'logo';
    const setIsUploading = isLogo ? setIsUploadingLogo : setIsUploadingFavicon;
    const field = isLogo ? 'logo' : 'favicon';

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;

      // Immediate update for preview with Base64 string
      updateState({ [field]: base64String });

      setIsUploading(false);
      toast({
        title: `¡${isLogo ? 'Logo' : 'Favicon'} cargado! ${isLogo ? '🖼️' : '✨'}`,
        description: "La imagen se ha procesado correctamente. No olvides guardar los cambios."
      });
    };

    reader.onerror = () => {
      console.error("Error reading file");
      setIsUploading(false);
      toast({
        title: "Error al leer el archivo",
        description: "No se pudo procesar la imagen.",
        variant: "destructive"
      });
    };

    reader.readAsDataURL(file);

    if (event.target) event.target.value = "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
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
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('quotations').update(dataToSave).eq('theme_key', activeTheme);
      if (error) throw error;

      setThemes(prev => {
        const newThemes = { ...prev };
        newThemes[activeTheme] = {
          ...newThemes[activeTheme],
          ...currentThemeData,
        };
        return newThemes;
      });

      toast({ title: "¡Guardado exitoso! 🎉", description: `Los datos de ${activeTheme} han sido actualizados.` });
      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
      toast({ title: "¡Error al guardar! 😭", description: `No se pudieron guardar los cambios: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentThemeData(themes[activeTheme]);
    toast({ title: "Valores restaurados 🔄", description: "Los campos se han restablecido a sus valores por defecto." });
  };

  const handleThemeChange = (newThemeKey) => {
    setActiveTheme(newThemeKey);
    toast({ title: "Cotización cambiada ✨", description: `Ahora estás editando: ${themes[newThemeKey]?.project || newThemeKey}.` });
  };

  const handleGoToTemplate = () => {
    const templateKey = Object.keys(themes).find(key => themes[key].is_template);
    if (templateKey) {
      setActiveTheme(templateKey);
      toast({ title: "Cargando Plantilla Base ✨", description: "Ahora estás editando la cotización madre." });
    } else {
      toast({ title: "Error", description: "No se encontró la plantilla base.", variant: "destructive" });
    }
  };

  const handleSetAsTemplate = async () => {
    setIsSaving(true);
    try {
      const currentTemplateKey = Object.keys(themes).find(key => themes[key].is_template);

      if (currentTemplateKey) {
        await supabase.from('quotations').update({ is_template: false }).eq('theme_key', currentTemplateKey);
      }
      await supabase.from('quotations').update({ is_template: true }).eq('theme_key', activeTheme);

      setThemes(prev => {
        const newThemes = { ...prev };
        if (currentTemplateKey) {
          newThemes[currentTemplateKey] = { ...newThemes[currentTemplateKey], is_template: false };
        }
        newThemes[activeTheme] = { ...newThemes[activeTheme], is_template: true };
        return newThemes;
      });

      toast({
        title: "¡Nueva Plantilla Base establecida! 🌟",
        description: `"${themes[activeTheme].project}" es ahora la cotización base para clonar.`,
      });

    } catch (error) {
      console.error('Error setting base template:', error);
      toast({ title: "Error", description: `No se pudo establecer la plantilla: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAsHome = async () => {
    setIsSaving(true);
    try {
      const currentHomeKey = Object.keys(themes).find(key => themes[key].is_home);

      if (currentHomeKey) {
        await supabase.from('quotations').update({ is_home: false }).eq('theme_key', currentHomeKey);
      }
      await supabase.from('quotations').update({ is_home: true }).eq('theme_key', activeTheme);

      setThemes(prev => {
        const newThemes = { ...prev };
        if (currentHomeKey) {
          newThemes[currentHomeKey] = { ...newThemes[currentHomeKey], is_home: false };
        }
        newThemes[activeTheme] = { ...newThemes[activeTheme], is_home: true };
        return newThemes;
      });

      toast({
        title: "¡Nueva Página Madre establecida! 🏠",
        description: `"${themes[activeTheme].project}" ahora se mostrará en la página de inicio.`,
      });

    } catch (error) {
      console.error('Error setting home page:', error);
      toast({ title: "Error", description: `No se pudo establecer la página madre: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }


  const handleCopyLink = () => {
    if (!currentThemeData.slug) {
      toast({
        title: "No hay slug",
        description: "Esta cotización no tiene un slug para generar un enlace.",
        variant: "destructive",
      });
      return;
    }
    // Always use production URL for sharing
    const link = `https://www.smq1.site/cotizacion/${currentThemeData.slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "¡Enlace copiado! 📋",
      description: "El enlace público ha sido copiado al portapapeles.",
    });
  };

  const handleOpenLink = () => {
    if (!currentThemeData.slug) return;
    // Keep Open Link relative to current environment for previewing
    const link = `${window.location.origin}/cotizacion/${currentThemeData.slug}`;
    window.open(link, '_blank');
  };

  if (!isOpen) return null;

  const isEditingTemplate = themes[activeTheme]?.is_template;
  const isEditingHome = themes[activeTheme]?.is_home;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="bg-[#0a0a0a] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#0f0f0f]">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-3"><Settings className="w-6 h-6 text-primary" />{t('adminModal.panelTitle')}</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800"><X className="h-5 w-5" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <div className="md:col-span-2">
                  <Label className="text-primary mb-2 block flex items-center gap-2 font-semibold"><Palette className="w-5 h-5" />{t('adminModal.activeQuotation')}</Label>
                  <Select value={activeTheme} onValueChange={handleThemeChange}>
                    <SelectTrigger className="border-gray-700 bg-gray-900 text-white focus:ring-primary">
                      <SelectValue placeholder={t('adminModal.selectQuotation')} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                      {Object.values(themes).sort((a, b) => a.project.localeCompare(b.project)).map(theme => (
                        <SelectItem key={theme.theme_key} value={theme.theme_key} className="focus:bg-primary focus:text-white">
                          <div className="flex items-center gap-2">
                            {theme.is_home && <Home className="w-4 h-4 text-green-400" />}
                            {theme.is_template && <Star className="w-4 h-4 text-yellow-400" />}
                            {theme.project} ({theme.client})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="company" className="text-[#2563eb] mb-2 block font-semibold">{t('adminModal.company')}</Label><Input id="company" name="company" value={currentThemeData.company || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-[#2563eb]" /></div>

                {/* Start Page Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <Home className={`w-5 h-5 ${currentThemeData.is_home ? 'text-green-500' : 'text-gray-400'}`} />
                    <Label htmlFor="is_home" className="text-white cursor-pointer select-none font-semibold">
                      {t('adminModal.setAsHomePage') || "Página de Inicio"}
                    </Label>
                  </div>
                  <Switch
                    id="is_home"
                    checked={!!currentThemeData.is_home}
                    onCheckedChange={handleSetAsHome}
                    disabled={isSaving}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>

                <div><Label htmlFor="project" className="text-primary mb-2 block font-semibold">{t('adminModal.project')}</Label><Input id="project" name="project" value={currentThemeData.project || ''} onChange={handleInputChange} disabled={isEditingTemplate} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div><Label htmlFor="client" className="text-primary mb-2 block font-semibold">{t('adminModal.client')}</Label><Input id="client" name="client" value={currentThemeData.client || ''} onChange={handleInputChange} disabled={isEditingTemplate} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div><Label htmlFor="title" className="text-primary mb-2 block font-semibold">{t('adminModal.title')}</Label><Input id="title" name="title" value={currentThemeData.title || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="subtitle" className="text-primary mb-2 block font-semibold">{t('adminModal.subtitle')}</Label><Input id="subtitle" name="subtitle" value={currentThemeData.subtitle || ''} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="slug" className="text-primary mb-2 block flex items-center gap-2 font-semibold"><LinkIcon className="w-4 h-4" />{t('adminModal.slug')}</Label><Input id="slug" name="slug" value={currentThemeData.slug || ''} onChange={handleInputChange} disabled={isEditingTemplate} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div>
                <div className="md:col-span-2"><Label htmlFor="description" className="text-primary mb-2 block font-semibold">{t('adminModal.description')}</Label><textarea id="description" name="description" value={currentThemeData.description || ''} onChange={handleInputChange} rows="3" className="flex w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50" /></div>

                <div className="md:col-span-2 border-t border-gray-800 pt-6">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Announce className="w-5 h-5" />{t('adminModal.bannerSettings')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="banner_text" className="text-gray-300">{t('adminModal.bannerText')}</Label>
                      <Input id="banner_text" name="banner_text" value={currentThemeData.banner_text || ''} onChange={handleInputChange} placeholder={t('adminModal.bannerTextPlaceholder')} className="bg-gray-900 border-gray-700 text-white focus:border-primary" />
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
                <div className="md:col-span-2 border-t border-gray-800 pt-6"><h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Clock className="w-5 h-5" />{t('adminModal.timelineSettings')}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800"><Label className="flex items-center gap-2 text-primary font-semibold"><CheckCircle className="w-4 h-4" />{t('adminModal.phase1')}</Label><Input name="phase1_name" placeholder={t('adminModal.phase1Name')} value={currentThemeData.phase1_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary mb-2" /><Input name="phase1_duration" type="number" placeholder={t('adminModal.durationDays')} value={currentThemeData.phase1_duration} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div><div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800"><Label className="flex items-center gap-2 text-primary font-semibold"><Wrench className="w-4 h-4" />{t('adminModal.phase2')}</Label><Input name="phase2_name" placeholder={t('adminModal.phase2Name')} value={currentThemeData.phase2_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary mb-2" /><Input name="phase2_duration" type="number" placeholder={t('adminModal.durationDays')} value={currentThemeData.phase2_duration} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div><div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800"><Label className="flex items-center gap-2 text-primary font-semibold"><Ship className="w-4 h-4" />{t('adminModal.phase3')}</Label><Input name="phase3_name" placeholder={t('adminModal.phase3Name')} value={currentThemeData.phase3_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary mb-2" /><Input name="phase3_duration" type="number" placeholder={t('adminModal.durationDays')} value={currentThemeData.phase3_duration} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div><div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800"><Label className="flex items-center gap-2 text-primary font-semibold"><Truck className="w-4 h-4" />{t('adminModal.phase4')}</Label><Input name="phase4_name" placeholder={t('adminModal.phase4Name')} value={currentThemeData.phase4_name} onChange={handleInputChange} className="bg-gray-900 border-gray-700 text-white focus:border-primary" /></div></div></div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-800"><Button variant="outline" onClick={handleLogoUploadClick} disabled={isUploadingLogo} className="border-primary text-primary hover:bg-primary/10">{isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{isUploadingLogo ? t('adminModal.uploading') : t('adminModal.uploadLogo')}</Button><Button variant="outline" onClick={handleFaviconUploadClick} disabled={isUploadingFavicon} className="border-primary text-primary hover:bg-primary/10">{isUploadingFavicon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image className="mr-2 h-4 w-4" />}{isUploadingFavicon ? t('adminModal.uploading') : t('adminModal.uploadFavicon')}</Button></div>
                <input type="file" ref={logoFileInputRef} onChange={(e) => handleFileChange(e, 'logo')} accept="image/png, image/jpeg, image/svg+xml" className="hidden" /><input type="file" ref={faviconFileInputRef} onChange={(e) => handleFileChange(e, 'favicon')} accept="image/x-icon, image/png, image/svg+xml" className="hidden" />
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

              {/* Secondary Actions & System Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!isEditingTemplate && (
                  <Button variant="secondary" onClick={handleSetAsTemplate} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 w-full"><Star className="h-4 w-4 mr-2" />{t('adminModal.setAsTemplate')}</Button>
                )}
                {!isEditingHome && (
                  <Button variant="secondary" onClick={handleSetAsHome} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 w-full"><Home className="h-4 w-4 mr-2" />{t('adminModal.setAsHomePage')}</Button>
                )}
                {isEditingTemplate && (
                  <Button variant="secondary" onClick={handleGoToTemplate} disabled className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 w-full"><Star className="h-4 w-4 mr-2 text-yellow-500" />{t('adminModal.editingTemplate')}</Button>
                )}
                <Button variant="outline" onClick={() => window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime()} className="border-red-500 text-red-500 hover:bg-red-500/10 w-full"><RefreshCw className="h-4 w-4 mr-2" />Forzar Actualización</Button>
              </div>

              {/* Save & Reset Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-800">
                <Button variant="outline" onClick={handleReset} disabled={isSaving} className="border-primary text-primary hover:bg-primary/10 flex-1"><Eraser className="h-4 w-4 mr-2" />{t('adminModal.reset')}</Button>
                <Button onClick={handleSave} disabled={isSaving || isUploadingLogo || isUploadingFavicon} className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.4)] flex-[2]">{isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}{t('adminModal.saveChanges')}</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white p-8 rounded-xl flex flex-col items-center gap-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-black">Código QR</h3>
            <div className="p-4 bg-white rounded-lg shadow-inner border border-gray-200">
              <QRCodeCanvas value={`https://www.smq1.site/cotizacion/${currentThemeData.slug}`} size={256} level="H" includeMargin={true} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium mb-1">{currentThemeData.project}</p>
              <p className="text-xs text-gray-400 break-all max-w-xs">
                {`https://www.smq1.site/cotizacion/${currentThemeData.slug || 'SIN-SLUG'}`}
              </p>
            </div>
            <Button onClick={() => setShowQR(false)} className="w-full">Cerrar</Button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminModal;