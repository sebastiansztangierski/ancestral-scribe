import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const RELATION_TYPE_LABELS = {
  rival: { label: 'Rival', color: 'text-red-400' },
  mentor: { label: 'Mentor', color: 'text-blue-400' },
  sworn_enemy: { label: 'Sworn Enemy', color: 'text-red-600' },
  lover: { label: 'Lover', color: 'text-pink-400' },
  oath_bound: { label: 'Oath Bound', color: 'text-purple-400' },
  betrayer: { label: 'Betrayer', color: 'text-orange-400' }
};

export default function Sidebar({ tree, selectedPerson, onSelectPerson }) {
  // Get special relations for selected person
  const getRelationsForPerson = (personId) => {
    if (!personId || !tree.special_relations) return [];
    
    return tree.special_relations
      .filter(rel => rel.from_id === personId || rel.to_id === personId)
      .map(rel => {
        const otherId = rel.from_id === personId ? rel.to_id : rel.from_id;
        const otherPerson = tree.persons.find(p => p.id === otherId);
        return {
          ...rel,
          person: otherPerson
        };
      })
      .filter(rel => rel.person);
  };

  const relations = selectedPerson ? getRelationsForPerson(selectedPerson.id) : [];

  return (
    <div className="w-full h-full bg-stone-900 border-r border-amber-800/50 flex flex-col">
      {/* House Header */}
      <div className="p-6 bg-gradient-to-b from-stone-800 to-stone-900 border-b border-amber-800/30">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{tree.house_crest}</div>
          <div>
            <h1 className="text-xl font-serif text-amber-100">House {tree.house_name}</h1>
            <p className="text-sm text-amber-600/80 italic">"{tree.house_motto}"</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {selectedPerson ? (
          <div className="p-4">
            {/* Selected Character Portrait */}
            <div className="relative mb-4">
              {/* Ornate frame */}
              <div className="absolute -inset-3 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 rounded-lg" />
              <div className="absolute -inset-2 bg-gradient-to-b from-amber-900 to-stone-900 rounded-md" />
              
              <div className="relative overflow-hidden rounded">
                <img
                  src={selectedPerson.portrait}
                  alt={selectedPerson.name}
                  className={cn(
                    "w-full h-48 object-cover",
                    selectedPerson.is_unknown && "filter blur-sm grayscale"
                  )}
                />
                {selectedPerson.is_unknown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-6xl text-amber-500/80">?</span>
                  </div>
                )}
              </div>
            </div>

            {/* Character Name & Title */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-serif text-amber-100">{selectedPerson.name}</h2>
              <p className="text-sm text-amber-600">{selectedPerson.title}</p>
              {selectedPerson.birth_year && (
                <p className="text-xs text-stone-500 mt-1">
                  {selectedPerson.birth_year} — {selectedPerson.death_year || 'Present'}
                </p>
              )}
            </div>

            <Separator className="bg-amber-800/30 my-4" />

            {/* Biography */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-2">
                Biography
              </h3>
              <p className="text-sm text-stone-300 leading-relaxed">
                {selectedPerson.biography}
              </p>
            </div>

            {/* Special Relations */}
            {relations.length > 0 && (
              <>
                <Separator className="bg-amber-800/30 my-4" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">
                    Notable Relations
                  </h3>
                  <div className="space-y-2">
                    {relations.map((rel, idx) => {
                      const relType = RELATION_TYPE_LABELS[rel.relation_type] || { label: rel.relation_type, color: 'text-stone-400' };
                      return (
                        <button
                          key={idx}
                          onClick={() => onSelectPerson(rel.person)}
                          className="w-full flex items-center gap-3 p-2 rounded bg-stone-800/50 hover:bg-stone-800 transition-colors border border-amber-900/30 hover:border-amber-700/50"
                        >
                          <img
                            src={rel.person.portrait}
                            alt={rel.person.name}
                            className="w-10 h-10 rounded object-cover border border-amber-700/30"
                          />
                          <div className="text-left flex-1">
                            <p className="text-sm text-amber-100">{rel.person.name}</p>
                            <p className={cn("text-xs", relType.color)}>{relType.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-stone-500">
            <p className="text-sm">Select a character to view their details</p>
          </div>
        )}
      </ScrollArea>

      {/* Stats footer */}
      <div className="p-3 bg-stone-800/50 border-t border-amber-800/30 text-xs text-stone-500 flex justify-between">
        <span>{tree.persons.length} members</span>
        <span>{Object.keys(tree.persons.reduce((acc, p) => ({ ...acc, [p.generation]: true }), {})).length} generations</span>
      </div>
    </div>
  );
}