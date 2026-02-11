import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchPeople({ persons, onSelectPerson }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter persons based on query
  const results = query.trim()
    ? persons
        .filter(p => {
          const searchTerm = query.toLowerCase();
          return (
            p.name.toLowerCase().includes(searchTerm) ||
            p.title?.toLowerCase().includes(searchTerm)
          );
        })
        .slice(0, 8)
    : [];

  // Handle selection
  const handleSelect = (person) => {
    onSelectPerson(person);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600/70" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search person..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-10 bg-stone-900 border border-amber-700/40 rounded-full text-amber-100 text-sm placeholder:text-stone-500 focus:outline-none focus:border-amber-600/60 focus:ring-1 focus:ring-amber-600/30 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-amber-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-stone-900 border border-amber-700/40 rounded-xl shadow-2xl shadow-black/50 max-h-80 overflow-hidden z-50"
        >
          <div className="overflow-y-auto max-h-80">
            {results.map((person) => (
              <button
                key={person.id}
                onClick={() => handleSelect(person)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-800/80 transition-colors border-b border-stone-800/30 last:border-b-0"
              >
                <img
                  src={person.portrait}
                  alt={person.name}
                  className={cn(
                    "w-9 h-9 rounded-md object-cover border border-amber-700/30",
                    person.is_unknown && "filter blur-sm grayscale"
                  )}
                />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm text-amber-100 truncate font-medium">{person.name}</p>
                  <p className="text-xs text-stone-500 truncate">{person.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}