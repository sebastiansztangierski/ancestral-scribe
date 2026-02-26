import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scroll } from 'lucide-react';

const EVENT_ICONS = {
  birth: '👑',
  death: '💀',
  war: '⚔️',
  conquest: '🏰',
  marriage: '💍',
  betrayal: '🗡️',
  treaty: '📜',
  fire: '🔥',
  plague: '☠️',
  coronation: '👑',
  rebellion: '⚡',
  victory: '🏆',
  defeat: '💔',
  discovery: '✨',
  festival: '🎭'
};

export default function Timeline({ events, onEventHover, onEventClick, mode = 'expanded' }) {
  // Sort events by year (most recent first for descending, or oldest first)
  const sortedEvents = [...events].sort((a, b) => {
    const yearA = a.era === 'b.c.' ? -a.year : a.year;
    const yearB = b.era === 'b.c.' ? -b.year : b.year;
    return yearB - yearA; // Descending (most recent first)
  });

  const isCompact = mode === 'compact';

  return (
    <div className="w-full h-full bg-stone-900 border-l border-amber-800/50 flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-b from-stone-800 to-stone-900 border-b border-amber-800/30 ${isCompact ? 'p-4 flex justify-center' : 'p-6'}`}>
        {isCompact ? (
          <div className="text-amber-500">
            <Scroll className="w-6 h-6" />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-serif text-amber-100 flex items-center gap-2">
              <span className="text-2xl">📜</span>
              House Timeline
            </h2>
            <p className="text-xs text-amber-600/80 mt-1">Chronicle of Major Events</p>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className={`relative ${isCompact ? 'p-4' : 'p-6'}`}>
          {/* Vertical timeline track */}
          <div className={`absolute ${isCompact ? 'left-1/2 -translate-x-1/2' : 'left-12'} top-0 bottom-0 w-1 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900`} />
          
          {/* Timeline events */}
          <div className={isCompact ? 'space-y-4' : 'space-y-6'}>
            {sortedEvents.map((event, idx) => (
              <div key={event.id} className={`relative ${isCompact ? 'flex justify-center' : 'flex items-start gap-4'} group`}>
                {/* Icon on timeline track */}
                <div 
                  className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-stone-800 border-2 border-amber-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform cursor-pointer"
                  onMouseEnter={() => onEventHover(event.participants || [])}
                  onMouseLeave={() => onEventHover([])}
                  onClick={() => onEventClick(event)}
                >
                  <span className="text-lg">{EVENT_ICONS[event.iconType] || '⚡'}</span>
                </div>

                {/* Event content - only in expanded mode */}
                {!isCompact && (
                  <div className="flex-1 pb-2">
                    <div 
                      className="bg-stone-800/50 rounded-lg p-3 border border-amber-900/30 hover:border-amber-700/50 transition-colors cursor-pointer"
                      onClick={() => onEventClick(event)}
                    >
                      <h3 className="text-sm font-serif text-amber-100 leading-tight mb-1">
                        {event.title}
                      </h3>
                      <p className="text-xs text-amber-600 font-medium">
                        {event.year} {event.era}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer stats - only in expanded mode */}
      {!isCompact && (
        <div className="p-3 bg-stone-800/50 border-t border-amber-800/30 text-xs text-stone-500">
          <span>{events.length} recorded events</span>
        </div>
      )}
    </div>
  );
}