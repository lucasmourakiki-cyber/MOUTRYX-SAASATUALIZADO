import React from 'react';

const uploadedLogo = '/LOGO OFICIAL MOUTRYX.png';
const uploadedIcon = '/LOGO FOLHAMOUTRYX.png';

interface MoutryxLogoProps {
  variant?: 'icon' | 'horizontal' | 'full' | 'stacked' | 'banner' | 'official' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
  showTagline?: boolean;
  showPills?: boolean;
  theme?: 'light' | 'dark' | 'green';
  className?: string;
  onClick?: () => void;
}

export const MoutryxLogo: React.FC<MoutryxLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showPills = false,
  theme = 'light',
  className = '',
  onClick,
}) => {
  // Proportions perfectly balanced for navbar, headers, login and cards
  const sizeMap = {
    xs: {
      img: 'h-6 max-w-[110px]',
      iconImg: 'h-6 w-6',
      card: 'p-1.5',
    },
    sm: {
      img: 'h-7 sm:h-8 max-w-[130px]',
      iconImg: 'h-8 w-8',
      card: 'p-2',
    },
    md: {
      // Standard header & sidebar balanced size (not too big, not too small)
      img: 'h-8 sm:h-9 max-w-[160px]',
      iconImg: 'h-9 w-9',
      card: 'p-2.5',
    },
    lg: {
      // Login & prominent views
      img: 'h-11 sm:h-12 max-w-[210px]',
      iconImg: 'h-12 w-12',
      card: 'p-3',
    },
    xl: {
      img: 'h-14 sm:h-16 max-w-[260px]',
      iconImg: 'h-16 w-16',
      card: 'p-4',
    },
    '2xl': {
      img: 'h-20 sm:h-24 max-w-[340px]',
      iconImg: 'h-20 w-20',
      card: 'p-5',
    },
  };

  const currentSize = sizeMap[size];

  // Full Official Logo Card
  if (variant === 'official' || variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl border border-[#E2E6E3] shadow-2xs bg-white ${currentSize.card} flex items-center justify-center group ${className} ${
          onClick ? 'cursor-pointer hover:border-[#05521F]/40 transition-colors' : ''
        }`}
      >
        <img
          src={uploadedLogo}
          alt="MOUTRYX Agro Intelligence"
          className={`${currentSize.img} w-auto object-contain transition-transform group-hover:scale-[1.02]`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Stacked Layout (Login screen & splash headers)
  if (variant === 'stacked') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center justify-center text-center group select-none ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <div className="relative mb-2.5 flex items-center justify-center">
          <div className="rounded-2xl bg-white p-3 sm:p-3.5 shadow-2xs border border-[#E2E6E3] flex items-center justify-center">
            <img
              src={uploadedLogo}
              alt="MOUTRYX Agro Intelligence"
              className={`${currentSize.img} w-auto object-contain`}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[#667085] tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
          <span className="w-2 h-[1.5px] bg-[#05521F] inline-block rounded-full" />
          TECNOLOGIA & PRECISÃO AGRO
          <span className="w-2 h-[1.5px] bg-[#05521F] inline-block rounded-full" />
        </p>
      </div>
    );
  }

  // Banner Layout
  if (variant === 'banner') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl border border-[#E2E6E3] shadow-2xs bg-white p-5 text-[#111827] ${className} ${
          onClick ? 'cursor-pointer hover:border-[#05521F]/40 transition-colors' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="shrink-0 bg-white p-2 rounded-xl border border-[#E2E6E3]">
            <img
              src={uploadedLogo}
              alt="MOUTRYX"
              className="h-10 sm:h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-center sm:text-left sm:border-l sm:border-[#E2E6E3] sm:pl-4">
            <div className="text-xs sm:text-sm font-bold uppercase text-[#05521F] tracking-wider">
              GESTÃO INTELIGENTE QUE TRANSFORMA
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Plataforma Especializada de Pulverização & Mapeamento por Drones
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pure Icon Variant
  if (variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`relative group inline-flex items-center justify-center shrink-0 ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <div className="p-1.5 rounded-xl bg-white shadow-2xs border border-[#E2E6E3] flex items-center justify-center">
          <img
            src={uploadedIcon}
            alt="MOUTRYX"
            className={`${currentSize.iconImg} object-contain`}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  // Default: Horizontal Brand Representation (Header & Sidebar)
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${className} ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      <div className="flex items-center">
        <img
          src={uploadedLogo}
          alt="MOUTRYX Agro Intelligence"
          className={`${currentSize.img} w-auto object-contain transition-transform group-hover:scale-[1.02]`}
          referrerPolicy="no-referrer"
        />
      </div>

      {showPills && (
        <div className="hidden sm:flex items-center gap-2 text-[9px] text-[#667085] font-semibold border-l border-[#E2E6E3] pl-2.5">
          <span className="text-[#05521F]">🛸 DRONES</span>
          <span className="text-slate-300">•</span>
          <span className="text-[#2E7D32]">🌾 OPERAÇÕES</span>
          <span className="text-slate-300">•</span>
          <span className="text-[#05521F]">📊 RESULTADOS</span>
        </div>
      )}
    </div>
  );
};
