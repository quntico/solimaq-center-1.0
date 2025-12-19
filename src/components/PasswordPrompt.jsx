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
    if (password === '2026') {
      setError(false);
      onCorrectPassword();
      toast({
        title: 'Acceso Concedido',
        description: 'Bienvenido, Administrador.',
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
        className="bg-gray-950 border border-gray-800 rounded-lg shadow-2xl w-full max-w-md p-6 overflow-hidden"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-blue-600/10 rounded-full mb-4 border border-blue-600/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-blue-600">Acceso de Administrador</h2>
          <p className="text-sm text-gray-400 mt-2">
            Ingrese sus credenciales para acceder al panel de control.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`text-center bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-600 focus:ring-blue-600 ${error ? 'border-destructive ring-1 ring-destructive' : ''}`}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              Acceder
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PasswordPrompt;