import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, Video, Image as ImageIcon, FileVideo, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import SectionHeader from '@/components/SectionHeader';
import EditableField from '@/components/EditableField';
import { cn } from '@/lib/utils';

// Default images provided by requirements or placeholders
const DEFAULT_ISO_IMAGE = 'https://horizons-cdn.hostinger.com/0f98fff3-e5cd-4ceb-b0fd-55d6f1d7dd5c/253c1c55c47b5f7d4ece09fb2bd9a441.png';
const DEFAULT_TOP_IMAGE = 'https://horizons-cdn.hostinger.com/0f98fff3-e5cd-4ceb-b0fd-55d6f1d7dd5c/dcea69d21f8fa04833cff852034084fb.png';

const LayoutSection = ({ sectionData = {}, isEditorMode, onContentChange }) => {
  const { toast } = useToast();
  const [uploadingState, setUploadingState] = useState({}); // Tracks loading state per field key

  // Initialize content with new structure, preserving old data if needed
  const content = {
    topViewUrl: sectionData.content?.topViewUrl ?? DEFAULT_TOP_IMAGE,
    topViewTitle: sectionData.content?.topViewTitle || 'Vista Superior',

    sideViewUrl: sectionData.content?.sideViewUrl || '',
    sideViewTitle: sectionData.content?.sideViewTitle || 'Vista Lateral',

    isoViewUrl: sectionData.content?.isoViewUrl ?? DEFAULT_ISO_IMAGE,
    isoViewTitle: sectionData.content?.isoViewTitle || 'Vista Isométrica',

    videoUrl: sectionData.content?.videoUrl || '',
    videoTitle: sectionData.content?.videoTitle || 'Animación del Proyecto',

    ...sectionData.content
  };

  const updateContent = (updates) => {
    if (onContentChange) {
      onContentChange({ ...content, ...updates });
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    try {
      // Already an embed link
      if (url.includes('youtube.com/embed/')) return url;

      let videoId = '';
      // Standard watch URL
      if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
      }
      // Shortened URL
      else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {
      console.error("Error parsing video URL", e);
    }
    // Return original if no known pattern matched (might be valid iframe src already)
    return url;
  };

  const handleFileUpload = async (event, type, bucketName, folderPath) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`[LayoutSection] Uploading ${file.name} to ${bucketName}/${folderPath} for type ${type}`);
    setUploadingState(prev => ({ ...prev, [type]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        console.error("[LayoutSection] Supabase Upload Error:", uploadError);
        throw uploadError;
      }
      console.log("[LayoutSection] Upload Data:", data);

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log("[LayoutSection] Generated Public URL:", publicUrl);

      const newContent = { [`${type}Url`]: publicUrl };
      console.log("[LayoutSection] Calling updateContent with:", newContent);
      updateContent(newContent);

      toast({
        title: "Imagen subida",
        description: "La imagen se ha guardado correctamente.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Error al subir",
        description: error.message || "No se pudo guardar el archivo.",
      });
    } finally {
      setUploadingState(prev => ({ ...prev, [type]: false }));
      event.target.value = '';
    }
  };

  // Component for Image Views
  const LayoutViewCard = ({ titleKey, urlKey, type, bucket, folder, accept, icon: Icon }) => {
    const inputRef = useRef(null);
    const isLoading = uploadingState[type];
    const url = content[`${type}Url`];
    const title = content[`${type}Title`];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <EditableField
            value={title}
            onSave={(val) => updateContent({ [`${type}Title`]: val })}
            isEditorMode={isEditorMode}
            className={cn(
              "text-xl font-semibold text-white",
              isEditorMode && "border border-transparent hover:border-gray-700 rounded px-2 -ml-2"
            )}
          />
          {isEditorMode && (
            <>
              {url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 hover:text-red-400 hover:bg-red-900/20 mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('¿Estás seguro de querer borrar esta imagen?')) {
                      updateContent({ [`${type}Url`]: '' });
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Borrar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-white"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-2" />
                {url ? 'Cambiar' : 'Subir'}
              </Button>
            </>
          )}
        </div>

        <div
          className={cn(
            "relative aspect-video bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800 transition-all duration-300 group shadow-lg",
            isEditorMode && "cursor-pointer hover:border-blue-500/50 hover:shadow-blue-900/20"
          )}
          onClick={() => isEditorMode && !isLoading && inputRef.current?.click()}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : null}

          {url ? (
            <img
              src={url}
              alt={title}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-3">
              <Icon className="w-16 h-16 opacity-20" />
              <span className="text-sm font-medium opacity-50">
                {isEditorMode ? 'Haz clic para subir imagen' : 'Sin imagen disponible'}
              </span>
            </div>
          )}

          {isEditorMode && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-[2px]">
              <Icon className="w-12 h-12 text-white mb-3" />
              <span className="text-white font-medium mb-2">
                {url ? 'Reemplazar Imagen' : 'Subir Imagen'}
              </span>
              <span className="text-xs text-gray-300 bg-black/50 px-2 py-1 rounded">
                {folder ? `Carpeta: ${folder}` : 'Root Bucket'}
              </span>
            </div>
          )}

          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={accept}
            onChange={(e) => handleFileUpload(e, type, bucket, folder)}
            disabled={isLoading}
          />
        </div>
      </motion.div>
    );
  };

  // Local state for video URL to prevent freezing on typing (debounce/onBlur pattern)
  const [localVideoUrl, setLocalVideoUrl] = useState(sectionData.content?.videoUrl || '');

  // Sync local state when prop changes (external updates)
  React.useEffect(() => {
    setLocalVideoUrl(sectionData.content?.videoUrl || '');
  }, [sectionData.content?.videoUrl]);

  return (
    <div className="py-16 sm:py-24 bg-black text-white min-h-screen">
      <SectionHeader
        sectionData={sectionData}
        isEditorMode={isEditorMode}
        onContentChange={updateContent}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* 1. Layout Views Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-20">
          <LayoutViewCard
            type="topView"
            titleKey="topViewTitle"
            bucket="logos-bucket"
            folder="layout-superior"
            accept="image/*"
            icon={ImageIcon}
          />

          <LayoutViewCard
            type="sideView"
            titleKey="sideViewTitle"
            bucket="logos-bucket"
            folder="layout-lateral"
            accept="image/*"
            icon={ImageIcon}
          />

          <LayoutViewCard
            type="isoView"
            titleKey="isoViewTitle"
            bucket="logos-bucket"
            folder="layout-isometrico"
            accept="image/*"
            icon={ImageIcon}
          />
        </div>

        {/* 2. Video Section - Specialized for YouTube Input */}
        <div className="border-t border-gray-800 pt-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center mb-8 justify-center text-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Video className="w-6 h-6 text-blue-500" />
                </div>
                <EditableField
                  value={content.videoTitle}
                  onSave={(val) => updateContent({ videoTitle: val })}
                  isEditorMode={isEditorMode}
                  className={cn(
                    "text-2xl font-bold text-white",
                    isEditorMode && "border border-transparent hover:border-gray-700 rounded px-2"
                  )}
                />
              </div>

              {isEditorMode && (
                <div className="w-full max-w-lg">
                  <Input
                    placeholder="Pega aquí la URL de YouTube (ej: https://www.youtube.com/watch?v=...)"
                    value={localVideoUrl}
                    onChange={(e) => setLocalVideoUrl(e.target.value)}
                    onBlur={() => updateContent({ videoUrl: localVideoUrl })}
                    className="bg-gray-900/50 border-gray-700 text-white text-center placeholder:text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Se actualizará automáticamente la vista previa al pegar el enlace.
                  </p>
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative aspect-video bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800 shadow-2xl"
            >
              {content.videoUrl ? (
                <iframe
                  src={getEmbedUrl(content.videoUrl)}
                  title={content.videoTitle}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-3">
                  <FileVideo className="w-16 h-16 opacity-20" />
                  <span className="text-sm font-medium opacity-50">
                    {isEditorMode ? 'Ingresa una URL arriba para ver el video' : 'No hay video configurado'}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LayoutSection;