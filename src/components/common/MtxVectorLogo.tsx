import React from 'react';

const moutryxXImg = '/LOGO FOLHAMOUTRYX.png';

interface MtxVectorLogoProps {
  className?: string;
  color?: string;
  height?: number | string;
  width?: number | string;
  variant?: 'full' | 'symbol' | 'horizontal';
}

export const MtxVectorLogo: React.FC<MtxVectorLogoProps> = ({
  className = '',
  height = '100%',
  width = 'auto',
}) => {
  return (
    <img
      src={moutryxXImg}
      alt="MOUTRYX"
      className={`object-contain ${className}`}
      style={{ height, width }}
      referrerPolicy="no-referrer"
    />
  );
};

