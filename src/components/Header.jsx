import React, { useState } from 'react';
import { Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import Banner from '@/components/Banner';
import MobileMenu from '@/components/MobileMenu';

const Header = ({
  quotationData,
  onLogoClick,
  onSearchClick,
  isBannerVisible,
  isEditorMode,
  isAdminView,
  // Props needed for MobileMenu
  sections,
  activeSection,
  onSectionSelect,
  onHomeClick,
  isAdminAuthenticated,
  onAdminLogin,
  onAdminLogout,
  onCotizadorClick,
  onSubItemSelect,
  activeTabMap,
  setIsEditorMode,
  onAdminClick
}) => {
  const { t } = useLanguage();
  const { company, project, client, logo, logo_size, banner_text, banner_scale, banner_direction, hide_banner } = quotationData;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show banner if not hidden in settings, and if the idle/initial timer says it should be visible.
  const showBanner = !hide_banner && isBannerVisible;

  // 1) Agranda el logo SMQ: Use a larger default size if not specified.
  const finalLogoSize = logo_size && logo_size > 0 ? logo_size : 250; // Larger default
  const logoContainerStyle = {
    '--logo-width': `${finalLogoSize}px`
  };

  return (
    <>
      <header className="relative bg-black text-white z-30">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-800 h-16 sm:h-20">
          {/* Left section: Hamburger (Mobile) & Logo */}
          <div className="flex-1 flex items-center gap-2 sm:gap-4">
            {/* Hamburger Button - Visible only on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-white hover:bg-gray-800 rounded-md transition-colors z-50"
              aria-label="Abrir menú"
            >
              <Menu size={28} />
            </button>

            {logo && (
              <button onClick={onLogoClick} className="focus:outline-none focus:ring-2 focus:ring-primary rounded-md">
                <div className="header-logo-container scale-75 sm:scale-100 origin-left" style={logoContainerStyle}>
                  <img
                    src={logo}
                    alt={`${company} Logo`}
                    className="header-logo"
                  />
                </div>
              </button>
            )}
          </div>

          {/* Center section: Project Title and Client Name */}
          <div className="flex-[2] flex flex-col items-center justify-center text-center px-1 sm:px-4 overflow-hidden">
            <h1 className="text-base sm:text-2xl md:text-3xl font-bold text-gray-200 leading-tight truncate w-full">
              {project}
            </h1>
            <p className="text-[10px] sm:text-base text-gray-400 mt-0.5 truncate w-full hidden sm:block">
              {client}
            </p>
          </div>

          {/* Right section: Language selector and Search button */}
          <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2">
            <div className="scale-90 sm:scale-100 origin-right">
              <LanguageSelector />
            </div>
            {isAdminView && (
              <Button variant="ghost" size="icon" onClick={onSearchClick} className="text-gray-400 hover:text-white hover:bg-gray-800 hidden sm:flex">
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <Banner
          isVisible={showBanner}
          text={banner_text}
          direction={banner_direction}
          scale={banner_scale}
          company={company}
          client={client}
          project={project}
          isEditorMode={isEditorMode}
          isAdminView={isAdminView}
        />
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        sections={sections || []}
        activeSection={activeSection}
        onSectionSelect={onSectionSelect}
        onHomeClick={onHomeClick}
        isAdminView={isAdminView}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogin={onAdminLogin}
        onAdminLogout={onAdminLogout}
        onCotizadorClick={onCotizadorClick}
        onSubItemSelect={onSubItemSelect}
        activeTabMap={activeTabMap}
        isEditorMode={isEditorMode}
        setIsEditorMode={setIsEditorMode}
        onAdminClick={onAdminClick}
      />
    </>
  );
};

export default Header;