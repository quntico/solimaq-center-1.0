import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cog, Database, ShieldCheck, Zap } from 'lucide-react';

const loadingTexts = [
  "Inicializando sistema...",
  "Cargando módulos de IA...",
  "Optimizando interfaz...",
  "Estableciendo conexión segura...",
  "Verificando integridad de datos...",
  "Compilando shaders de UI...",
  "Despertando al asistente virtual...",
  "¡Casi listo!",
];

const CodeLine = ({ children, delay }) => (
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 1, 1, 0] }}
    transition={{ duration: 2, repeat: Infinity, delay, ease: "linear" }}
    className="font-mono text-xs text-green-400/50"
  >
    {children}
  </motion.p>
);

const LoadingScreen = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % loadingTexts.length);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const icons = [
    { icon: Cog, color: 'text-blue-400' },
    { icon: Database, color: 'text-purple-400' },
    { icon: ShieldCheck, color: 'text-green-400' },
    { icon: Zap, color: 'text-yellow-400' },
  ];

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative flex items-center justify-center w-40 h-40"
      >
        {icons.map((item, index) => {
          const angle = (index / icons.length) * 2 * Math.PI;
          return (
            <motion.div
              key={index}
              className={`absolute ${item.color}`}
              animate={{
                x: Math.cos(angle) * 70,
                y: Math.sin(angle) * 70,
                rotate: [0, 360],
              }}
              transition={{
                duration: 4 + index,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <item.icon />
            </motion.div>
          );
        })}
        <motion.div 
            className="w-16 h-16 bg-primary rounded-full"
            animate={{ scale: [1, 1.2, 1], rotate: [0, -180, -360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="mt-8 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTextIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-medium text-white"
          >
            {loadingTexts[currentTextIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <CodeLine delay={0}>[AI.core] Bootstrapping services...</CodeLine>
        <CodeLine delay={0.25}>[render.v8] Initializing virtual DOM...</CodeLine>
        <CodeLine delay={0.5}>[auth.jwt] Validating session token: SUCCESS</CodeLine>
        <CodeLine delay={0.75}>[db.supa] SELECT * FROM themes WHERE active=true</CodeLine>
        <CodeLine delay={1.0}>[net.edge] Invoking function 'get-user-prefs'...</CodeLine>
        <CodeLine delay={1.25}>[crypto.argon2] Hashing assets for verification...</CodeLine>
        <CodeLine delay={1.5}>[ui.framer] Staggering intro animations...</CodeLine>
        <CodeLine delay={1.75}>[finalizer] All systems nominal. Handing over to user.</CodeLine>
      </div>
    </div>
  );
};

export default LoadingScreen;