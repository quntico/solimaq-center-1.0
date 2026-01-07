import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, Video, Image as ImageIcon, FileVideo, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import SectionHeader from '@/components/SectionHeader';
import EditableField from '@/components/EditableField';
import { cn } from '@/lib/utils';

// Default images provided by requirements or placeholders
const DEFAULT_ISO_IMAGE = 'https://horizons-cdn.hostinger.com/0f98fff3-e5cd-4ceb-b0fd-55d6f1d7dd5c/253c1c55c47b5f7d4ece09fb2bd9a441.png';
const DEFAULT_TOP_IMAGE = 'https://horizons-cdn.hostinger.com/0f98fff3-e5cd-4ceb-b0fd-55d6f1d7dd5c/dcea69d21f8fa04833cff852034084fb.png';

const ImageModal = ({ src, alt, onClose }) => {
  if (!src) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-50"
      >
        <X className="w-8 h-8" />
        <span className="sr-only">Cerrar</span>
      </button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="absolute bottom-[-30px] left-0 right-0 text-center text-white/70 text-sm">
          {alt}
        </div>
      </motion.div>
    </motion.div>
  );
};
const LayoutViewCard = ({
  title,
  url,
  type,
  bucket,
  folder,
  accept,
  icon: Icon,
  isLoading,
  isEditorMode,
  onSaveTitle,
  onDelete,
  onUpload,
  onViewImage
}) => {
  const inputRef = useRef(null);

  const handleDoubleClick = (e) => {
    if (url && onViewImage) {
      onViewImage(url, title);
    }
  };

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
          onSave={onSaveTitle}
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
                    onDelete();
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
          isEditorMode && "cursor-pointer hover:border-primary/50 hover:shadow-primary/20"
        )}
        onClick={() => isEditorMode && !isLoading && inputRef.current?.click()}
        onDoubleClick={handleDoubleClick}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : null}

        {url ? (
          <img
            src={url}
            alt={title}
            className="w-full h-full object-contain"
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

        {!isEditorMode && url && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              Doble clic para ampliar
            </span>
          </div>
        )}

        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept={accept}
          onChange={(e) => onUpload(e, type, bucket, folder)}
          disabled={isLoading}
        />
      </div>
    </motion.div>
  );
};

const LayoutSection = ({ sectionData = {}, isEditorMode, onContentChange }) => {


  const { toast } = useToast();
  const [uploadingState, setUploadingState] = useState({});
  const [optimisticUrls, setOptimisticUrls] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  const content = {
    topViewUrl: sectionData.content?.topViewUrl ?? DEFAULT_TOP_IMAGE,
    topViewTitle: sectionData.content?.topViewTitle || 'Vista Superior',

    sideViewUrl: sectionData.content?.sideViewUrl ?? '',
    // The issue might be upstream receiving null. Let's ensure we use what's in sectionData strictly if present.
    // Actually, if sectionData.content.sideViewUrl is undefined, it becomes ''.

    sideViewTitle: sectionData.content?.sideViewTitle || 'Vista Lateral',

    isoViewUrl: sectionData.content?.isoViewUrl ?? DEFAULT_ISO_IMAGE,
    isoViewTitle: sectionData.content?.isoViewTitle || 'Vista Isométrica',

    videoUrl: sectionData.content?.videoUrl || '',
    videoTitle: sectionData.content?.videoTitle || 'Animación del Proyecto',
    showVideo: sectionData.content?.showVideo !== false, // Default to true if undefined

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
      if (url.includes('youtube.com/embed/')) return url;
      let videoId = '';
      if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {
      console.error("Error parsing video URL", e);
    }
    return url;
  };

  const handleFileUpload = async (event, type, bucketName, folderPath) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingState(prev => ({ ...prev, [type]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setOptimisticUrls(prev => ({ ...prev, [type]: publicUrl }));
      const newContent = { [`${type}Url`]: publicUrl };
      updateContent(newContent);

      toast({
        title: "Imagen actualizada",
        description: "Vista guardada correctamente.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Error al subir",
        description: "No se pudo actualizar la imagen.",
      });
    } finally {
      setUploadingState(prev => ({ ...prev, [type]: false }));
      if (event.target) event.target.value = '';
    }
  }


  const handleViewImage = (url, title) => {
    setSelectedImage({ url, title });
  };

  // Local state for video URL
  const [localVideoUrl, setLocalVideoUrl] = useState(sectionData.content?.videoUrl || '');

  React.useEffect(() => {
    setLocalVideoUrl(sectionData.content?.videoUrl || '');
  }, [sectionData.content?.videoUrl]);

  // If video is hidden and not in editor mode, don't render the section
  if (!content.showVideo && !isEditorMode) {
    return (
      <>
        <AnimatePresence>
          {selectedImage && (
            <ImageModal
              src={selectedImage.url}
              alt={selectedImage.title}
              onClose={() => setSelectedImage(null)}
            />
          )}
        </AnimatePresence>
        <div className="py-16 sm:py-24 bg-black text-white min-h-screen">
          <SectionHeader
            sectionData={sectionData}
            isEditorMode={isEditorMode}
            onContentChange={updateContent}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* 1. Layout Views Grid ONLY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-20">
              <LayoutViewCard
                type="topView"
                title={content.topViewTitle}
                url={optimisticUrls.topView || content.topViewUrl}
                bucket="logos-bucket"
                folder="layout-superior"
                accept="image/*"
                icon={ImageIcon}
                isLoading={uploadingState.topView}
                isEditorMode={isEditorMode}
                onSaveTitle={(val) => updateContent({ topViewTitle: val })}
                onDelete={() => updateContent({ topViewUrl: '' })}
                onUpload={handleFileUpload}
                onViewImage={handleViewImage}
              />
              <LayoutViewCard
                type="sideView"
                title={content.sideViewTitle}
                url={optimisticUrls.sideView !== undefined ? optimisticUrls.sideView : content.sideViewUrl}
                bucket="logos-bucket"
                folder="layout-lateral"
                accept="image/*"
                icon={ImageIcon}
                isLoading={uploadingState.sideView}
                isEditorMode={isEditorMode}
                onSaveTitle={(val) => updateContent({ sideViewTitle: val })}
                onDelete={() => updateContent({ sideViewUrl: '' })}
                onUpload={handleFileUpload}
                onViewImage={handleViewImage}
              />
              <LayoutViewCard
                type="isoView"
                title={content.isoViewTitle}
                url={optimisticUrls.isoView || content.isoViewUrl}
                bucket="logos-bucket"
                folder="layout-isometrico"
                accept="image/*"
                icon={ImageIcon}
                isLoading={uploadingState.isoView}
                isEditorMode={isEditorMode}
                onSaveTitle={(val) => updateContent({ isoViewTitle: val })}
                onDelete={() => updateContent({ isoViewUrl: '' })}
                onUpload={handleFileUpload}
                onViewImage={handleViewImage}
              />
            </div>
          </div>
        </div>

      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {selectedImage && (
          <ImageModal
            src={selectedImage.url}
            alt={selectedImage.title}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>

      <div className="py-16 sm:py-24 bg-black text-white min-h-screen">
        <SectionHeader
          sectionData={sectionData}
          isEditorMode={isEditorMode}
          onContentChange={updateContent}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* 1. Layout Views Grid ONLY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-20">
            <LayoutViewCard
              type="topView"
              title={content.topViewTitle}
              url={optimisticUrls.topView || content.topViewUrl}
              bucket="logos-bucket"
              folder="layout-superior"
              accept="image/*"
              icon={ImageIcon}
              isLoading={uploadingState.topView}
              isEditorMode={isEditorMode}
              onSaveTitle={(val) => updateContent({ topViewTitle: val })}
              onDelete={() => updateContent({ topViewUrl: '' })}
              onUpload={handleFileUpload}
              onViewImage={handleViewImage}
            />
            <LayoutViewCard
              type="sideView"
              title={content.sideViewTitle}
              url={optimisticUrls.sideView !== undefined ? optimisticUrls.sideView : content.sideViewUrl}
              bucket="logos-bucket"
              folder="layout-lateral"
              accept="image/*"
              icon={ImageIcon}
              isLoading={uploadingState.sideView}
              isEditorMode={isEditorMode}
              onSaveTitle={(val) => updateContent({ sideViewTitle: val })}
              onDelete={() => updateContent({ sideViewUrl: '' })}
              onUpload={handleFileUpload}
              onViewImage={handleViewImage}
            />
            <LayoutViewCard
              type="isoView"
              title={content.isoViewTitle}
              url={optimisticUrls.isoView || content.isoViewUrl}
              bucket="logos-bucket"
              folder="layout-isometrico"
              accept="image/*"
              icon={ImageIcon}
              isLoading={uploadingState.isoView}
              isEditorMode={isEditorMode}
              onSaveTitle={(val) => updateContent({ isoViewTitle: val })}
              onDelete={() => updateContent({ isoViewUrl: '' })}
              onUpload={handleFileUpload}
              onViewImage={handleViewImage}
            />
          </div>

          {/* 2. Video Section - Specialized for YouTube Input - Only show if not hidden or if in editor mode */}
          {(content.showVideo || isEditorMode) && (
            <div className={cn("border-t border-gray-800 pt-16 transition-opacity duration-300", !content.showVideo && isEditorMode && "opacity-50 grayscale")}>
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col items-center mb-8 justify-center text-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Video className="w-6 h-6 text-primary" />
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

                    {/* Visibility Toggle for Video Section */}
                    {isEditorMode && (
                      <div
                        className="flex items-center gap-2 ml-4 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800 cursor-pointer relative group"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newState = !content.showVideo;
                          updateContent({ showVideo: newState });
                        }}
                      >
                        <Switch
                          checked={!!content.showVideo}
                          className="data-[state=checked]:bg-primary pointer-events-none"
                        />
                        <span className={cn("text-xs font-medium select-none", content.showVideo ? "text-white" : "text-gray-500")}>
                          {content.showVideo ? "Visible" : "Oculto"}
                        </span>
                        <div className="absolute inset-0 z-50 cursor-pointer" />
                      </div>
                    )}
                  </div>

                  {isEditorMode && (
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-green-500 border-green-900 bg-green-900/10 hover:bg-green-900/20"
                        onClick={() => {
                          toast({ title: "Guardando...", description: "Forzando sincronización de datos." });
                          updateContent({ ...content });
                        }}
                      >
                        Forzar Guardado Layout
                      </Button>
                    </div>
                  )}

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
                        {!content.showVideo ? "Este video está OCULTO para el cliente." : "Se actualizará la vista previa automáticamente."}
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
          )}
        </div>
      </div>
    </>
  );
};

export default LayoutSection;