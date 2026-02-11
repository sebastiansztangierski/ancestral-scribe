import React from 'react';
import { cn } from '@/lib/utils';

export default function CharacterNode({ person, isSelected, onClick, hasSpecialRelations, isHighlighted, isJumpHighlight, hasChildren, isCollapsed, hiddenCount, onToggleCollapse }) {
  return (
    <div
      onClick={() => onClick(person)}
      className={cn(
        "relative cursor-pointer transition-all duration-200 group",
        isSelected && "scale-110 z-10",
        isHighlighted && "scale-110 z-10",
        isJumpHighlight && "scale-125 z-20"
      )}
    >
      {/* Ornate frame */}
      <div className={cn(
        "absolute -inset-2 rounded-lg transition-all duration-200",
        "bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800",
        "shadow-lg",
        isSelected && "from-amber-500 via-amber-600 to-amber-700 shadow-amber-500/50 shadow-xl",
        isHighlighted && "from-yellow-400 via-yellow-500 to-amber-600 shadow-yellow-400/70 shadow-2xl animate-pulse",
        isJumpHighlight && "from-yellow-300 via-yellow-400 to-amber-500 shadow-yellow-300/90 shadow-2xl animate-pulse"
      )} />
      
      {/* Inner frame decoration */}
      <div className={cn(
        "absolute -inset-1 rounded-md",
        "bg-gradient-to-b from-amber-900 to-stone-900"
      )} />

      {/* Portrait container */}
      <div className="relative w-20 h-24 overflow-hidden rounded-sm">
        <img
          src={person.portrait}
          alt={person.name}
          className={cn(
            "w-full h-full object-cover",
            person.is_unknown && "filter blur-sm grayscale"
          )}
        />
        
        {/* Unknown overlay */}
        {person.is_unknown && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-3xl text-amber-500/80">?</span>
          </div>
        )}

        {/* Selection glow */}
        {isSelected && (
          <div className="absolute inset-0 bg-amber-400/20 animate-pulse" />
        )}
      </div>

      {/* Name plate */}
      <div className={cn(
        "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap",
        "px-2 py-0.5 rounded text-xs",
        "bg-stone-900/90 border border-amber-700/50",
        "text-amber-100 font-serif",
        isSelected && "bg-amber-900/90 border-amber-500"
      )}>
        {person.name}
      </div>

      {/* Hover effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
        "bg-gradient-to-t from-amber-500/20 to-transparent rounded-sm"
      )} />

      {/* Special relations indicator */}
      {hasSpecialRelations && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 border-2 border-amber-900 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-[8px]">⚡</span>
        </div>
      )}

      {/* Collapse toggle */}
      {hasChildren && (
        <button
          onClick={(e) => onToggleCollapse(person.id, e)}
          className={cn(
            "absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-all z-20",
            "border-2 border-amber-900",
            isCollapsed ? "bg-amber-600 hover:bg-amber-500" : "bg-stone-700 hover:bg-stone-600"
          )}
          title={isCollapsed ? `Expand (${hiddenCount} hidden)` : "Collapse branch"}
        >
          <span className="text-[10px] font-bold text-white">
            {isCollapsed ? '+' : '−'}
          </span>
        </button>
      )}

      {/* Hidden count badge */}
      {isCollapsed && hiddenCount > 0 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-amber-600 border border-amber-900 rounded-full shadow-md">
          <span className="text-[9px] font-bold text-white">+{hiddenCount}</span>
        </div>
      )}
    </div>
  );
}