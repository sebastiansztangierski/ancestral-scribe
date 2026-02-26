import React from 'react';
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
  const sortedEvents = [...events].sort((a, b) => {
    const yearA = a.era === 'b.c.' ? -a.year : a.year;
    const yearB = b.era === 'b.c.' ? -b.year : b.year;
    return yearB - yearA;
  });

  const isCompact = mode === 'compact';

  return (
    <div className="w-full h-screen flex flex-col min-h-0 overflow-hidden bg-stone-950 border-l border-amber-800/40">

      {/* Header */}
      <div className={`flex-none bg-stone-900 border-b border-amber-800/40 shadow-md ${isCompact ? 'px-3 py-4 flex flex-col items-center gap-1' : 'px-5 py-4'}`}>
        {isCompact ? (
          <>
            <div className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
              <Scroll className="w-4 h-4 text-amber-400" />
            </div>
            <div className="w-px h-3 bg-amber-800/50" />
          </>
        ) : (
          <>
            <h2 className="text-base font-serif text-amber-100 flex items-center gap-2">
              <span className="text-xl">📜</span>
              House Timeline
            </h2>
            <p className="text-xs text-amber-700 mt-0.5 tracking-wide uppercase">Chronicle of Events</p>
          </>
        )}
      </div>

      {/* Scroll area — fade mask wrapper */}
      <div className="relative flex-1 min-h-0">
        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-10 bg-gradient-to-t from-stone-950 to-transparent" />

        <div
          className="timeline-scroll h-full overflow-y-auto overscroll-contain"
          data-scroll-panel="timeline"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className={`relative ${isCompact ? 'px-3 py-3 pb-14' : 'px-3 py-3 pb-14'}`}>

            {/* Vertical timeline track */}
            <div
              className={`absolute top-0 bottom-0 w-px bg-gradient-to-b from-amber-700/80 via-amber-800/50 to-transparent ${isCompact ? 'left-1/2 -translate-x-px' : 'left-8'}`}
            />

            {/* Events */}
            <div className={`flex flex-col ${isCompact ? 'items-center gap-3' : 'gap-3'}`}>
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className={`relative group ${isCompact ? 'flex justify-center' : 'flex items-start gap-3'}`}
                >
                  {/* Icon bubble */}
                  <button
                    className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-stone-800 border-2 border-amber-800/70 hover:border-amber-500 flex items-center justify-center shadow-lg transition-all duration-150 group-hover:scale-110 group-hover:shadow-amber-900/60 cursor-pointer"
                    onMouseEnter={() => onEventHover(event.participants || [])}
                    onMouseLeave={() => onEventHover([])}
                    onClick={() => onEventClick(event)}
                    title={isCompact ? `${event.title} · ${event.year} ${event.era}` : undefined}
                  >
                    <span className="text-base leading-none">{EVENT_ICONS[event.iconType] || '⚡'}</span>
                  </button>

                  {/* Card — expanded only */}
                  {!isCompact && (
                    <button
                      className="flex-1 text-left bg-stone-900/70 hover:bg-stone-800/80 border border-amber-900/30 hover:border-amber-700/60 rounded-lg px-3 py-2.5 transition-all duration-150 cursor-pointer shadow-sm group-hover:shadow-amber-950/40"
                      onClick={() => onEventClick(event)}
                      onMouseEnter={() => onEventHover(event.participants || [])}
                      onMouseLeave={() => onEventHover([])}
                    >
                      <p className="text-sm font-serif text-amber-100 leading-snug">{event.title}</p>
                      <p className="text-xs text-amber-700 font-medium mt-0.5 tracking-wide">
                        {event.year} {event.era}
                      </p>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — expanded only */}
      {!isCompact && (
        <div className="flex-none px-4 py-2.5 bg-stone-900 border-t border-amber-900/30 text-xs text-stone-600 tracking-wide">
          {events.length} recorded events
        </div>
      )}
    </div>
  );
}