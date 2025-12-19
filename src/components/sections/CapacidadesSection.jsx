import React from 'react';
import { motion } from 'framer-motion';
import { Sliders, BarChart2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const capabilities = [
  {
    title: 'Control Remoto Total',
    icon: Sliders,
    features: [
      'Encendido/apagado instantáneo',
      'Ajuste preciso de parámetros',
      'Monitoreo en tiempo real',
      'Gestión desde cualquier dispositivo',
    ],
  },
  {
    title: 'Analítica Inteligente',
    icon: BarChart2,
    features: [
      'Reportes automatizados',
      'Detección de anomalías',
      'Predicción de mantenimiento',
      'Análisis de eficiencia',
    ],
  },
  {
    title: 'Seguridad Avanzada',
    icon: ShieldCheck,
    features: [
      'Encriptación de datos',
      'Autenticación biométrica',
      'Protocolos anti-intrusión',
      'Respaldo automático',
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 100,
    },
  },
};

const CapabilityCard = ({ title, icon: Icon, features, index }) => (
  <motion.div
    variants={itemVariants}
    className={cn(
      'bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 relative overflow-hidden',
      'shadow-lg shadow-black/20'
    )}
  >
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50"></div>
    <div className="relative z-10">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-primary/20 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
      </div>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-primary mt-1.5">&#8226;</span>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

const CapacidadesSection = () => {
  return (
    <div className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-6xl font-black text-white uppercase tracking-tighter">
            Capacidades <span className="text-primary">Revolucionarias</span>
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
            Un ecosistema completo diseñado para maximizar el control y la eficiencia industrial.
          </p>
        </motion.div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {capabilities.map((capability, index) => (
            <CapabilityCard key={capability.title} {...capability} index={index} />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default CapacidadesSection;