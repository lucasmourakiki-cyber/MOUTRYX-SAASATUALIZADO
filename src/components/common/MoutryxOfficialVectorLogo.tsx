import React from 'react';

const moutryxOfficialLogo = '/LOGO OFICIAL MOUTRYX.png';
const moutryxSymbolLogo = '/LOGO FOLHAMOUTRYX.png';

interface MoutryxOfficialVectorLogoProps {
  className?: string;
  color?: string;
  leafColor?: string;
  textColor?: string;
  showSubtitle?: boolean;
  height?: number | string;
  width?: number | string;
  variant?: 'full' | 'symbol' | 'horizontal';
}

export const MoutryxOfficialVectorLogo: React.FC<MoutryxOfficialVectorLogoProps> = ({
  className = '',
  height,
  width,
  variant = 'full',
}) => {
  if (variant === 'symbol') {
    return (
      <img
        src={moutryxSymbolLogo}
        alt="MOUTRYX Symbol"
        className={`object-contain ${className}`}
        style={{ height: height || '100%', width: width || 'auto' }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <img
      src={moutryxOfficialLogo}
      alt="MOUTRYX Oficial"
      className={`object-contain ${className}`}
      style={{ height: height || '100%', width: width || 'auto' }}
      referrerPolicy="no-referrer"
    />
  );
};

