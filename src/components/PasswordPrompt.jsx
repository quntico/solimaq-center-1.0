import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PasswordPrompt = ({ onCorrectPassword, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    const editorPasswords = ['2020', '2021'];
    const adminPasswords = ['1917', ...editorPasswords];

    if (adminPasswords.includes(password)) {
      const shouldOpenEditor = editorPasswords.includes(password);
      setError(false);
      onCorrectPassword(shouldOpenEditor);
      toast({
        title: 'Acceso Concedido',
        description: shouldOpenEditor ? 'Modo Editor activado.' : 'Bienvenido, Administrador.',
      });
    } else {
      setError(true);
      setPassword('');
      toast({
        title: 'Acceso Denegado',
        description: 'La contraseña es incorrecta.',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] w-full max-w-md p-8 overflow-hidden relative overflow-hidden ring-1 ring-white/10"
      >
        {/* Shine effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Acceso de Administrador</h2>
          <p className="text-sm text-white/60 mt-2 font-medium">
            Ingrese sus credenciales para acceder al panel de control.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`text-center h-14 text-xl tracking-[0.5em] bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-xl ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              autoFocus
            />
          </div>

          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="px-6 h-12 text-white/70 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="px-8 h-12 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_20px_rgba(var(--primary-rgb),0.3)] rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
            >
              Acceder
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PasswordPrompt;