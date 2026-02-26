import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PanelHandle({ side, collapsed, onToggle }) {
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle(e);
  };

  return (
    <button
      onClick={handleClick}
      className="absolute top-1/2 -translate-y-1/2 w-10 h-20 bg-amber-800/60 hover:bg-amber-700/80 backdrop-blur-sm border border-amber-600/40 flex items-center justify-center transition-colors rounded-xl shadow-lg z-50 pointer-events-auto"
      style={{
        [side === 'left' ? 'right' : 'left']: 0
      }}
    >
      {side === 'left' ? (
        collapsed ? (
          <ChevronRight className="w-4 h-4 text-amber-100" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-amber-100" />
        )
      ) : (
        collapsed ? (
          <ChevronLeft className="w-4 h-4 text-amber-100" />
        ) : (
          <ChevronRight className="w-4 h-4 text-amber-100" />
        )
      )}
    </button>
  );
}