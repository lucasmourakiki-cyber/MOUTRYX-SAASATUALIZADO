import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  ClipboardList,
  Target,
  Smartphone,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenCopilot?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenMobileMenu,
}) => {
  const { activeTab, setActiveTab, setIsFieldMode } = useApp();

  const handleNav = (tabId: string) => {
    if (tabId === 'modo_campo') {
      setIsFieldMode(true);
      setActiveTab('modo_campo');
    } else {
      setActiveTab(tabId);
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Início',
      icon: LayoutDashboard,
      isActive:
        activeTab === 'dashboard' ||
        activeTab === 'drone_intelligence' ||
        activeTab === 'drone_score' ||
        activeTab === 'recomendacoes',
    },
    {
      id: 'ordens_servico',
      label: 'OS & Voos',
      icon: ClipboardList,
      isActive:
        activeTab === 'ordens_servico' ||
        activeTab === 'os' ||
        activeTab === 'agenda' ||
        activeTab === 'calendario',
    },
    {
      id: 'modo_campo',
      label: 'Campo',
      icon: Smartphone,
      isActive: activeTab === 'modo_campo',
    },
    {
      id: 'reativa',
      label: 'REATIVA',
      icon: Target,
      isActive: activeTab === 'reativa',
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      isActive: false,
      onClick: onOpenMobileMenu,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegação Principal Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#E2E8E5] bg-white/98 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] select-none"
    >
      <div className="grid grid-cols-5 h-16 w-full max-w-lg mx-auto px-1 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              type="button"
              onClick={item.onClick || (() => handleNav(item.id))}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] w-full px-0.5 py-1.5 transition-colors cursor-pointer touch-manipulation focus:outline-none ${
                active
                  ? 'text-[#05521F]'
                  : 'text-[#718096] hover:text-[#263238] active:text-[#05521F]'
              }`}
            >
              {/* Active top line indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-[#05521F]" />
              )}

              {/* Icon Container with subtle active pill background */}
              <div
                className={`flex h-8 w-10 items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-[#E8F3EC]' : 'bg-transparent'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-[#05521F] stroke-[2.4]' : 'text-current stroke-[1.8]'}`} />
              </div>

              {/* Label */}
              <span
                className={`mt-0.5 text-[10px] sm:text-[11px] leading-none text-center truncate max-w-full px-0.5 ${
                  active ? 'font-bold text-[#05521F]' : 'font-medium text-[#718096]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
