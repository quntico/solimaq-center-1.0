import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

function getYouTubeEmbedUrl(input) {
  const url = input.trim();
  if (!url) return { id: null, embedUrl: null };

  // Intentar detectar ID desde formatos comunes
  let id = null;

  // youtu.be/VIDEO_ID
  if (url.includes("youtu.be/")) {
    const parts = url.split("youtu.be/");
    if (parts[1]) {
      id = parts[1].split(/[?&]/)[0];
    }
  }

  // /embed/VIDEO_ID
  if (!id && url.includes("/embed/")) {
    const parts = url.split("/embed/");
    if (parts[1]) {
      id = parts[1].split(/[?&]/)[0];
    }
  }

  // watch?v=VIDEO_ID
  if (!id && url.includes("watch?")) {
    const match = url.match(/[?&]v=([^&]+)/);
    if (match && match[1]) {
      id = match[1];
    }
  }

  // Si sólo pegaron el ID directamente
  if (!id && /^[a-zA-Z0-9_-]{6,}$/.test(url)) {
    id = url;
  }

  if (!id) {
    return { id: null, embedUrl: null };
  }

  const embedUrl = `https://www.youtube.com/embed/${id}?rel=0`;
  return { id, embedUrl };
}

export default function VideoSection({ quotationData, onVideoUrlUpdate, isEditorMode }) {
  // Force rebuild timestamp: 2025-12-01
  const initialUrl = quotationData?.video_url || "";
  const [input, setInput] = useState(initialUrl);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [error, setError] = useState(null);

  // Initialize embedUrl on mount or when prop changes
  useEffect(() => {
    if (initialUrl) {
      const { embedUrl: computedUrl } = getYouTubeEmbedUrl(initialUrl);
      if (computedUrl) {
        setEmbedUrl(computedUrl);
        setInput(initialUrl);
      }
    }
  }, [initialUrl]);

  const handleLoad = () => {
    const { id, embedUrl } = getYouTubeEmbedUrl(input);
    if (!id || !embedUrl) {
      setEmbedUrl(null);
      setError("No pude reconocer el ID del video. Verifica la liga de YouTube.");
      return;
    }
    setError(null);
    setEmbedUrl(embedUrl);
    console.log("Usando URL embed de YouTube:", embedUrl);

    // Save to DB if prop is provided
    if (onVideoUrlUpdate) {
      onVideoUrlUpdate(input);
    }
  };

  return (
    <section id="video" className="py-16 sm:py-24 bg-black text-white">
      <div className="container mx-auto px-4 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter">
            Maquinaria en <span className="text-blue-500">Acción</span>
          </h2>
          <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Observa la eficiencia y precisión de nuestra línea de producción.
          </p>
        </motion.div>

        {/* Editor Controls */}
        {isEditorMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 max-w-2xl mx-auto bg-gray-900 p-4 rounded-xl border border-gray-800"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pega aquí la liga de YouTube"
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleLoad}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Cargar
              </button>
            </div>
            {error && (
              <p className="mt-2 text-red-400 text-sm text-left">{error}</p>
            )}
            {embedUrl && (
              <p className="mt-2 text-gray-500 text-xs text-left break-all">
                URL embed: {embedUrl}
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 sm:mt-12 aspect-video max-w-4xl mx-auto bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl shadow-blue-900/10"
        >
          {embedUrl ? (
            <iframe
              className="w-full h-full"
              src={embedUrl}
              title="Video de presentación"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              {isEditorMode
                ? 'Pega una liga de YouTube arriba y haz clic en "Cargar"'
                : 'No hay video disponible'}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}