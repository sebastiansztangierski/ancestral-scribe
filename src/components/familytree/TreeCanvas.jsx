import React, { useState, useRef, useEffect, useCallback } from 'react';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Organize persons by generation
  const generations = {};
  tree.persons.forEach(person => {
    if (!generations[person.generation]) {
      generations[person.generation] = [];
    }
    generations[person.generation].push(person);
  });

  // Build position map for connectors
  const getPersonPosition = useCallback((personId) => {
    for (const [gen, persons] of Object.entries(generations)) {
      const index = persons.findIndex(p => p.id === personId);
      if (index !== -1) {
        const genNum = parseInt(gen);
        const spacing = 140;
        const genWidth = persons.length * spacing;
        const startX = -genWidth / 2 + spacing / 2;
        return {
          x: startX + index * spacing,
          y: genNum * 180
        };
      }
    }
    return null;
  }, [generations]);

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * delta, 0.3), 2)
    }));
  };

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.closest('.canvas-background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  // Handle drag
  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Center on selected person
  useEffect(() => {
    if (selectedPerson && containerRef.current) {
      const pos = getPersonPosition(selectedPerson.id);
      if (pos) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform(prev => ({
          ...prev,
          x: rect.width / 2 - pos.x * prev.scale,
          y: rect.height / 3 - pos.y * prev.scale
        }));
      }
    }
  }, [selectedPerson?.id]);

  // Render connectors
  const renderConnectors = () => {
    const connectors = [];
    
    tree.family_edges.forEach((edge, idx) => {
      const fromPos = getPersonPosition(edge.from_id);
      const toPos = getPersonPosition(edge.to_id);
      
      if (fromPos && toPos) {
        if (edge.relation_type === 'spouse') {
          // Horizontal line for spouses
          connectors.push(
            <line
              key={`spouse-${idx}`}
              x1={fromPos.x + 40}
              y1={fromPos.y + 48}
              x2={toPos.x - 40}
              y2={toPos.y + 48}
              stroke="#b45309"
              strokeWidth="2"
            />
          );
          // Marriage connector dot
          connectors.push(
            <circle
              key={`spouse-dot-${idx}`}
              cx={(fromPos.x + toPos.x) / 2}
              cy={fromPos.y + 48}
              r="6"
              fill="#dc2626"
              stroke="#fbbf24"
              strokeWidth="2"
            />
          );
        } else if (edge.relation_type === 'parent_child') {
          // Vertical line from parent to child
          const midY = (fromPos.y + toPos.y) / 2 + 20;
          connectors.push(
            <path
              key={`parent-${idx}`}
              d={`M ${fromPos.x} ${fromPos.y + 96} 
                  L ${fromPos.x} ${midY} 
                  L ${toPos.x} ${midY} 
                  L ${toPos.x} ${toPos.y}`}
              stroke="#b45309"
              strokeWidth="2"
              fill="none"
            />
          );
        }
      }
    });

    return connectors;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23524a3a' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundColor: '#1c1917'
      }}
    >
      {/* Canvas background for drag detection */}
      <div className="canvas-background absolute inset-0" />

      {/* Tree content */}
      <div
        className="absolute"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {/* SVG for connectors */}
        <svg
          className="absolute pointer-events-none"
          style={{
            width: '2000px',
            height: '1000px',
            left: '-1000px',
            top: '-100px'
          }}
        >
          {renderConnectors()}
        </svg>

        {/* Character nodes by generation */}
        {Object.entries(generations).map(([gen, persons]) => {
          const genNum = parseInt(gen);
          const spacing = 140;
          const genWidth = persons.length * spacing;
          const startX = -genWidth / 2 + spacing / 2;

          return (
            <div
              key={gen}
              className="absolute flex items-center"
              style={{
                top: `${genNum * 180}px`,
                left: '50%'
              }}
            >
              {persons.map((person, idx) => (
                <div
                  key={person.id}
                  className="absolute"
                  style={{
                    left: `${startX + idx * spacing}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <CharacterNode
                    person={person}
                    isSelected={selectedPerson?.id === person.id}
                    onClick={onSelectPerson}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 2) }))}
          className="w-10 h-10 rounded bg-stone-800/80 border border-amber-700/50 text-amber-100 hover:bg-stone-700/80 transition-colors font-bold"
        >
          +
        </button>
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.3) }))}
          className="w-10 h-10 rounded bg-stone-800/80 border border-amber-700/50 text-amber-100 hover:bg-stone-700/80 transition-colors font-bold"
        >
          −
        </button>
      </div>
    </div>
  );
}