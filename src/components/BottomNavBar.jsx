import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MoreHorizontal, Settings, LogOut, Shield, X, Calculator } from 'lucide-react';
import { iconMap } from '@/lib/iconMap';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const BottomNavBar = ({
  sections,
  activeSection,
  onSectionSelect,
  onHomeClick,
  isEditorMode,
  isAdminAuthenticated,
  onAdminClick,
  setIsEditorMode,
  onAdminLogin,
  onAdminLogout,
  activeTheme,
  isAdminView,
}) => {
  const { t } = useLanguage();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const visibleSections = sections.filter(s => s.isVisible || (isEditorMode && isAdminView));
  
  const cotizadorPageSection = visibleSections.find(s => s.id === 'cotizador_page');

  const mainItems = [
    visibleSections.find(s => s.id === 'portada'),
    visibleSections.find(s => s.id === 'propuesta'),
  ].filter(Boolean);
  
  const moreItems = visibleSections.filter(s => 
    !['portada', 'propuesta', 'cotizador_page'].includes(s.id)
  );

  const NavItem = ({ item, onClick, isActive, isPrimary = false }) => {
    const Icon = iconMap[item.icon] || Home;
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200",
          isPrimary 
            ? (isActive ? 'text-primary' : 'text-primary/70 hover:text-primary')
            : (isActive ? 'text-primary' : 'text-gray-400 hover:text-white')
        )}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[60px]">{t(`sections.${item.id}`)}</span>
      </button>
    );
  };

  const menuVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const handleItemClick = (id) => {
    if (id === 'portada') {
      onHomeClick();
    } else {
      onSectionSelect(id);
    }
    setIsMoreMenuOpen(false);
  };

  const showCotizadorButton = isAdminView && activeTheme === 'SMQ' && isAdminAuthenticated && cotizadorPageSection;

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 sm:h-20 bg-black border-t border-gray-800 z-40">
        <div className={cn(
          "grid h-full",
          showCotizadorButton ? 'grid-cols-4' : 'grid-cols-3'
        )}>
          {mainItems.map(item => (
            <NavItem
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item.id)}
              isActive={activeSection === item.id}
              isPrimary={item.id === 'propuesta'}
            />
          ))}

          {showCotizadorButton && (
            <button
              onClick={() => handleItemClick(cotizadorPageSection.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200",
                "bg-primary text-black hover:bg-primary/90",
                activeSection === cotizadorPageSection.id ? 'opacity-100' : 'opacity-80'
              )}
            >
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[60px]">{t(`sections.${cotizadorPageSection.id}`)}</span>
            </button>
          )}

          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200",
              isMoreMenuOpen ? 'text-primary' : 'text-gray-400 hover:text-white'
            )}
          >
            <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-medium">{t('bottomNav.more')}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMoreMenuOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="lg:hidden fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col"
          >
            <div className="flex-shrink-0 p-4 flex justify-between items-center border-b border-gray-800">
              <h2 className="text-base sm:text-lg font-bold text-white">{t('bottomNav.mainMenu')}</h2>
              <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5 sm:w-6 sm:w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                {moreItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg aspect-square transition-colors",
                      activeSection === item.id ? 'bg-primary/10 text-primary' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                    )}
                  >
                    {React.createElement(iconMap[item.icon] || Home, { className: "w-5 h-5 sm:w-7 sm:h-7" })}
                    <span className="text-xs sm:text-sm text-center font-medium leading-tight">{t(`sections.${item.id}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {isAdminView && (
              <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-800 space-y-2">
                {isAdminAuthenticated && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditorMode(!isEditorMode);
                        setIsMoreMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 sm:p-3 rounded-lg text-left transition-colors text-sm sm:text-base",
                        isEditorMode ? 'bg-green-500/10 text-green-400' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                      )}
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="font-medium">{t('bottomNav.editorMode')}</span>
                      <span className={cn("ml-auto px-2 py-0.5 rounded text-xs font-bold", isEditorMode ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400")}>
                        {isEditorMode ? t('bottomNav.on') : t('bottomNav.off')}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                          onAdminClick();
                          setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left bg-gray-900 text-gray-300 hover:bg-gray-800"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">{t('bottomNav.admin')}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    isAdminAuthenticated ? onAdminLogout() : onAdminLogin();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-2 sm:p-3 rounded-lg text-left bg-gray-900 text-gray-300 hover:bg-gray-800 text-sm sm:text-base"
                >
                  {isAdminAuthenticated ? <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> : <Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
                  <span className="font-medium">{isAdminAuthenticated ? t('bottomNav.logout') : t('bottomNav.login')}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BottomNavBar;