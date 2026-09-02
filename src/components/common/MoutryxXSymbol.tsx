import React from 'react';

const moutryxXImg = '/LOGO FOLHAMOUTRYX.png';

interface MoutryxXSymbolProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  alt?: string;
  style?: React.CSSProperties;
}

export const MoutryxXSymbol: React.FC<MoutryxXSymbolProps> = ({
  className = '',
  size = 'md',
  alt = 'MOUTRYX',
  style,
}) => {
  const sizeMap: Record<string, string> = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };

  const sizeClass = typeof size === 'string' ? sizeMap[size] || 'h-6 w-6' : '';
  const customStyle = typeof size === 'number' ? { height: `${size}px`, width: `${size}px`, ...style } : style;

  return (
    <img
      src={moutryxXImg}
      alt={alt}
      className={`object-contain shrink-0 select-none ${sizeClass} ${className}`}
      style={customStyle}
      referrerPolicy="no-referrer"
    />
  );
};
