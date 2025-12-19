import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { UploadCloud, Save, X, Loader2, AlignLeft, AlignJustify } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { getActiveBucket } from '@/lib/bucketResolver';

const EditableText = ({
  value,
  alignment = 'left',
  onSave,
  isEditorMode,
  projectId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [currentAlign, setCurrentAlign] = useState(alignment);
  const textareaRef = useRef(null);

  const formatTextForDisplay = rawText => {
    return rawText.replace(/\n/g, '<br />');
  };

  const applyFormatting = rawText => {
    let formattedText = rawText;
    if (projectId) {
      const projectRegex = new RegExp(`(${projectId})`, 'gi');
      formattedText = formattedText.replace(projectRegex, `<span class="font-bold text-white">${projectId}</span>`);
    }
    const keywordsRegex = new RegExp(`(mezclado, formado, enfriamiento y empaquetado)`, 'gi');
    formattedText = formattedText.replace(keywordsRegex, `<span class="font-bold text-white">$1</span>`);
    return formattedText;
  };

  useEffect(() => {
    const plainText = value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    setText(plainText);
    setCurrentAlign(alignment);
  }, [value, alignment]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [isEditing, text]);

  const handleSave = () => {
    onSave(text, currentAlign);
    setIsEditing(false);
  };

  const toggleAlign = () => {
    setCurrentAlign(prev => prev === 'left' ? 'justify' : 'left');
  };

  const handleCancel = () => {
    const plainText = value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    setText(plainText);
    setCurrentAlign(alignment);
    setIsEditing(false);
  };

  if (!isEditorMode) {
    return <p
      className={alignment === 'justify' ? 'text-justify' : 'text-left'}
      dangerouslySetInnerHTML={{
        __html: formatTextForDisplay(applyFormatting(value))
      }}
    />;
  }

  return <div className="relative group">
    {isEditing ? <div className="relative">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        className={`w-full bg-gray-800 border border-primary rounded-md p-2 text-white resize-none focus:outline-none ${currentAlign === 'justify' ? 'text-justify' : 'text-left'}`}
        rows={4}
      />
      <div className="absolute top-2 right-2 flex gap-2">
        <button onClick={toggleAlign} className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600" title="Alinear texto">
          {currentAlign === 'justify' ? <AlignJustify size={16} /> : <AlignLeft size={16} />}
        </button>
        <button onClick={handleSave} className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600"><Save size={16} /></button>
        <button onClick={handleCancel} className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X size={16} /></button>
      </div>
    </div> : <p
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer p-2 border border-transparent group-hover:border-primary/50 rounded-md transition-all ${alignment === 'justify' ? 'text-justify' : 'text-left'}`}
      dangerouslySetInnerHTML={{
        __html: formatTextForDisplay(applyFormatting(value))
      }}
    />}
  </div>;
};

const DescripcionSection = ({
  quotationData,
  sectionData,
  isEditorMode,
  activeTheme,
  onContentChange
}) => {
  const {
    toast
  } = useToast();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const defaultContent = {
    p1: `La línea ${quotationData.project} es una solución de producción continua que integra cuatro áreas fundamentales: mezclado, formado, enfriamiento y empaquetado. Cada área ha sido diseñada para trabajar en sincronía perfecta, garantizando una producción fluida y eficiente de barras de cereal de alta calidad.`,
    p1_align: 'left',
    image: "https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/ed2d6f1f-4d92-4f33-722a-2a4b8682e000/public"
  };
  const content = sectionData.content || defaultContent;

  const handleSaveText = (key, newValue, newAlign) => {
    const newContent = {
      ...content,
      [key]: newValue,
      [`${key}_align`]: newAlign
    };
    onContentChange(newContent);
    toast({
      title: "Contenido guardado en la nube. ☁️"
    });
  };

  const handleImageClick = () => {
    if (isEditorMode) {
      fileInputRef.current.click();
    }
  };
  const handleFileChange = async files => {
    const file = files[0];
    if (!file || !isEditorMode) return;
    setIsUploading(true);
    try {
      const bucketName = await getActiveBucket();
      const fileName = `sections/descripcion/${activeTheme.toLowerCase()}-${Date.now()}-${file.name}`;
      const {
        error
      } = await supabase.storage.from(bucketName).upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
      if (error) throw error;
      const {
        data: publicUrlData
      } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      if (!publicUrlData.publicUrl) throw new Error("No se pudo obtener la URL pública.");
      const newContent = {
        ...content,
        image: publicUrlData.publicUrl
      };
      onContentChange(newContent);
      toast({
        title: "¡Imagen guardada en la nube! 🖼️"
      });
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      toast({
        title: "Error al subir la imagen",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleDragEvents = (e, isOver) => {
    if (isEditorMode) {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(isOver);
    }
  };
  const handleDrop = e => {
    if (isEditorMode) {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileChange(files);
      }
    }
  };
  const { t } = useLanguage();

  const title = `${t('sections.visionGeneral')} <span class="text-primary">${quotationData.project}</span>`;

  // Dynamic Translation Logic for P1
  // We reconstruct the default Spanish string to check if the current content is "default" (un-edited).
  // If it matches the default Spanish string, we assume we can safely translate it to the current language.
  const spanishDefaultP1 = `La línea ${quotationData.project} es una solución de producción continua que integra cuatro áreas fundamentales: mezclado, formado, enfriamiento y empaquetado. Cada área ha sido diseñada para trabajar en sincronía perfecta, garantizando una producción fluida y eficiente de barras de cereal de alta calidad.`;

  let p1ToUse = content.p1;
  // Check if content matches the constructed Spanish default
  if (p1ToUse === spanishDefaultP1) {
    p1ToUse = t('sections.descripcionText', { project: quotationData.project });
  }

  return <div className="min-h-screen w-full flex items-center justify-center py-16 sm:py-24 bg-black">
    <motion.div initial={{
      opacity: 0,
      y: 50
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true,
      amount: 0.3
    }} transition={{
      duration: 0.8
    }} className="w-full max-w-7xl px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Columna de Texto */}
        <motion.div initial={{
          opacity: 0,
          x: -30
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.7,
          delay: 0.2
        }}>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-white leading-none" dangerouslySetInnerHTML={{
            __html: title
          }} />
          <div className="mt-8 space-y-6 text-gray-300 text-base leading-relaxed">
            <EditableText
              value={p1ToUse}
              alignment={content.p1_align}
              onSave={(v, a) => handleSaveText('p1', v, a)}
              isEditorMode={isEditorMode}
              projectId={quotationData.project}
            />
          </div>
        </motion.div>

        {/* Columna de Imagen */}
        <motion.div initial={{
          opacity: 0,
          scale: 0.9
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.7,
          delay: 0.4
        }} className="w-full relative min-h-[300px] lg:min-h-[auto]" onClick={handleImageClick} onDragEnter={e => handleDragEvents(e, true)} onDragLeave={e => handleDragEvents(e, false)} onDragOver={e => handleDragEvents(e, true)} onDrop={handleDrop}>
          <input type="file" ref={fileInputRef} onChange={e => handleFileChange(e.target.files)} accept="image/png, image/jpeg, image/webp" className="hidden" />
          <img className="w-full h-full object-cover rounded-2xl shadow-2xl shadow-primary/10" alt={`Línea de producción ${quotationData.project}`} src={content.image} />
          {isEditorMode && <div className={`absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-300 border-2 border-dashed ${dragOver ? 'border-primary' : 'border-transparent'} ${isUploading ? '' : 'opacity-0 hover:opacity-100'} cursor-pointer`}>
            {isUploading ? <>
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="mt-4 font-semibold">Subiendo imagen...</p>
            </> : <>
              <UploadCloud className="w-12 h-12" />
              <p className="mt-4 font-semibold">Cambiar imagen</p>
              <p className="text-sm text-gray-400">Haz clic o arrastra y suelta</p>
            </>}
          </div>}
        </motion.div>
      </div>
    </motion.div>
  </div>;
};
export default DescripcionSection;