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
          onFocus={(e) => {
            if (query) setIsOpen(true);
            e.currentTarget.style.borderColor = 'rgba(217,119,6,0.7)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2), 0 0 8px rgba(217,119,6,0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(217,119,6,0.4)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2)';
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-10 rounded-full text-amber-100 text-sm placeholder:text-stone-500 focus:outline-none transition-all"
          style={{
            background: 'linear-gradient(to bottom, rgba(28,25,23,0.95) 0%, rgba(41,37,36,0.95) 50%, rgba(28,25,23,0.95) 100%)',
            border: '1px solid rgba(217,119,6,0.4)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2)'
          }}
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
          className="absolute top-full mt-2 w-full rounded-xl max-h-80 overflow-hidden z-50"
          style={{
            background: 'linear-gradient(to bottom, rgba(20,15,10,0.98) 0%, rgba(28,25,23,0.98) 50%, rgba(20,15,10,0.98) 100%)',
            border: '2px solid rgba(217,119,6,0.4)',
            boxShadow: 'inset 0 0 0 1px rgba(120,53,15,0.3), 0 8px 24px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="overflow-y-auto max-h-80">
            {results.map((person) => (
              <button
                key={person.id}
                onClick={() => handleSelect(person)}
                className="w-full flex items-center gap-3 px-3 py-2.5 transition-all border-b border-stone-800/30 last:border-b-0"
                style={{
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgba(120,53,15,0.3), rgba(217,119,6,0.15))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
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