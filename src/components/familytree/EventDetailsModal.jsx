import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function EventDetailsModal({ event, open, onOpenChange, allPersons }) {
  if (!event) return null;

  const participants = event.participants
    ? event.participants
        .map(id => allPersons?.find(p => p.id === id))
        .filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-stone-900 border-amber-800/50 text-amber-100 max-w-2xl max-h-[90vh] p-0">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-b from-stone-800 to-stone-900 border-b border-amber-800/30 p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl text-amber-100 pr-8">
              {event.title}
            </DialogTitle>
            <p className="text-amber-600 font-medium mt-2">
              {event.year} {event.era}
            </p>
          </DialogHeader>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Event Image */}
            <div className="relative rounded-lg overflow-hidden border-2 border-amber-700/50">
              {event.imageUrl ? (
                <img 
                  src={event.imageUrl} 
                  alt={event.title}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-b from-stone-800 to-stone-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-3">📜</div>
                    <p className="text-stone-500 text-sm">No image available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.descriptionLong ? (
              <div>
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">
                  Chronicle
                </h3>
                <div className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">
                  {event.descriptionLong}
                </div>
              </div>
            ) : (
              <div className="text-sm text-stone-500 italic">
                No detailed description provided.
              </div>
            )}

            {/* Participants */}
            {participants.length > 0 && (
              <>
                <Separator className="bg-amber-800/30" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">
                    Key Participants
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {participants.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 p-2 rounded bg-stone-800/50 border border-amber-900/30"
                      >
                        <img
                          src={person.portrait}
                          alt={person.name}
                          className="w-10 h-10 rounded object-cover border border-amber-700/30"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-amber-100 truncate">{person.name}</p>
                          <p className="text-xs text-stone-500 truncate">{person.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}