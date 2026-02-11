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
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
        <Input
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
          className="pl-9 pr-9 bg-stone-800 border-amber-800/50 text-amber-100 placeholder:text-stone-500 w-64"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-stone-900 border border-amber-800/50 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50"
        >
          {results.map((person) => (
            <button
              key={person.id}
              onClick={() => handleSelect(person)}
              className="w-full flex items-center gap-3 p-2 hover:bg-stone-800 transition-colors border-b border-stone-800/50 last:border-b-0"
            >
              <img
                src={person.portrait}
                alt={person.name}
                className={cn(
                  "w-10 h-10 rounded object-cover border border-amber-700/30",
                  person.is_unknown && "filter blur-sm grayscale"
                )}
              />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm text-amber-100 truncate">{person.name}</p>
                <p className="text-xs text-stone-500 truncate">{person.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}