import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BrainCircuit, User, CornerDownLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2"
  >
    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
    <span className="text-sm text-gray-400">Pensando...</span>
  </motion.div>
);

const IASection = ({ initialQuery, setInitialQuery }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const chatContainerRef = useRef(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, isLoading]);

  const sendQuery = async (query, existingMessages) => {
    if (!query.trim() || isLoading) return;

    const userMessage = { role: 'user', content: query };
    const newMessages = [...existingMessages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: JSON.stringify({ messages: newMessages }),
      });

      if (error) throw new Error(`Function invocation error: ${error.message}`);
      
      if(data.error) throw new Error(`OpenAI API error: ${data.details || data.error}`);

      const assistantMessage = data.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error('La respuesta de la IA no es válida.');
      }
      
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error fetching AI response:', error);
      toast({
        title: 'Error de Conexión',
        description: `No se pudo conectar con el asistente de IA: ${error.message}`,
        variant: 'destructive',
      });
      // Rollback user message if API call fails
      setMessages(existingMessages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      sendQuery(initialQuery, messages);
      setInitialQuery('');
    }
  }, [initialQuery, setInitialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuery(input, messages);
    setInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col p-4 sm:p-6 bg-[#0c0c0c] rounded-lg border border-gray-800"
    >
      <div className="flex-1 overflow-y-auto pr-4 -mr-4" ref={chatContainerRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col justify-center items-center text-center text-gray-500">
               <BrainCircuit size={40} className="mb-4 text-primary/50 sm:size-48" />
               <h2 className="text-xl sm:text-2xl font-bold text-gray-300">Asistente IA</h2>
               <p className="mt-2 text-sm sm:text-base">Hazme una pregunta para empezar.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6 ${
                  msg.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] sm:max-w-xl p-3 sm:p-4 rounded-xl text-sm sm:text-base ${
                    msg.role === 'user'
                      ? 'bg-primary/90 text-black rounded-br-none'
                      : 'bg-[#1a1a1a] text-gray-300 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                 {msg.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))
          )}
           {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="max-w-[80%] sm:max-w-xl p-3 sm:p-4 rounded-xl bg-[#1a1a1a] text-gray-300 rounded-bl-none">
                <TypingIndicator />
              </div>
            </motion.div>
           )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Escribe tu mensaje aquí... (Shift + Enter para nueva línea)"
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 sm:p-4 pr-20 sm:pr-24 text-sm sm:text-base text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:outline-none resize-none transition-all"
          rows={1}
          disabled={isLoading}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            <p className="text-xs text-gray-500 hidden sm:block">
              <CornerDownLeft size={14} className="inline-block -mt-1" /> Enviar
            </p>
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 disabled:bg-gray-600 w-8 h-8 sm:w-10 sm:h-10"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-black" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
              )}
            </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default IASection;