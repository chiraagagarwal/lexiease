import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const FocusModeOverlay: React.FC = () => {
  const { preferences } = useApp();
  const [mouseY, setMouseY] = useState<number>(300);

  useEffect(() => {
    if (!preferences.readingRuler) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [preferences.readingRuler]);

  if (!preferences.readingRuler) return null;

  const rulerHeight = preferences.rulerHeight || 80;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Top Mask */}
      <div 
        className="absolute top-0 left-0 right-0 bg-black/25 transition-all duration-75"
        style={{
          height: `${Math.max(0, mouseY - rulerHeight / 2)}px`
        }}
      />

      {/* Clear Focus Band (Reading Window) with soft colored border */}
      <div 
        className="absolute left-0 right-0 border-y-2 border-[#D97706]/70 shadow-xs pointer-events-none transition-all duration-75 bg-[#FEF9EB]/10"
        style={{
          top: `${Math.max(0, mouseY - rulerHeight / 2)}px`,
          height: `${rulerHeight}px`
        }}
      />

      {/* Bottom Mask */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-black/25 transition-all duration-75"
        style={{
          top: `${mouseY + rulerHeight / 2}px`
        }}
      />
    </div>
  );
};
