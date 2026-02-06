import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build a stable position map for all persons
  const positionMap = useMemo(() => {
    const positions = {};
    const generations = {};
    
    // Group by generation
    tree.persons.forEach(person => {
      if (!generations[person.generation]) {
        generations[person.generation] = [];
      }
      generations[person.generation].push(person);
    });

    // Calculate positions
    Object.entries(generations).forEach(([gen, persons]) => {
      const genNum = parseInt(gen);
      const spacing = 140;
      const genWidth = persons.length * spacing;
      const startX = -genWidth / 2 + spacing / 2;
      
      persons.forEach((person, index) => {
        positions[person.id] = {
          x: startX + index * spacing,
          y: genNum * 180,
          centerX: startX + index * spacing,
          centerY: genNum * 180 + 48 // center of portrait
        };
      });
    });

    return positions;
  }, [tree.persons]);

  // Organize persons by generation for rendering
  const generations = useMemo(() => {
    const gens = {};
    tree.persons.forEach(person => {
      if (!gens[person.generation]) {
        gens[person.generation] = [];
      }
      gens[person.generation].push(person);
    });
    return gens;
  }, [tree.persons]);

  const getPersonPosition = useCallback((personId) => {
    return positionMap[personId] || null;
  }, [positionMap]);

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

  // Find spouse pairs and their children
  const familyStructure = useMemo(() => {
    const spousePairs = [];
    const childrenByParents = {};

    // Find all spouse pairs
    tree.family_edges.filter(e => e.relation_type === 'spouse').forEach(edge => {
      const parent1 = edge.from_id;
      const parent2 = edge.to_id;
      spousePairs.push({ parent1, parent2 });
      
      // Initialize children set for this pair
      const pairKey = [parent1, parent2].sort().join('-');
      childrenByParents[pairKey] = { pair: { parent1, parent2 }, children: new Set() };
    });

    // Group children by their parent pairs
    tree.family_edges.filter(e => e.relation_type === 'parent_child').forEach(edge => {
      const parentId = edge.from_id;
      const childId = edge.to_id;
      
      // Find which spouse pair this parent belongs to
      for (const pairKey in childrenByParents) {
        const { pair } = childrenByParents[pairKey];
        if (pair.parent1 === parentId || pair.parent2 === parentId) {
          childrenByParents[pairKey].children.add(childId);
          break;
        }
      }
    });

    return { spousePairs, childrenByParents };
  }, [tree.family_edges]);

  // Render connectors
  const renderConnectors = () => {
    const connectors = [];
    const { spousePairs, childrenByParents } = familyStructure;
    
    // Draw spouse connections
    spousePairs.forEach((pair, idx) => {
      const pos1 = positionMap[pair.parent1];
      const pos2 = positionMap[pair.parent2];
      
      if (pos1 && pos2) {
        const leftPos = pos1.x < pos2.x ? pos1 : pos2;
        const rightPos = pos1.x < pos2.x ? pos2 : pos1;
        
        // Horizontal line between spouses
        connectors.push(
          <line
            key={`spouse-line-${idx}`}
            x1={leftPos.x + 45}
            y1={leftPos.centerY}
            x2={rightPos.x - 45}
            y2={rightPos.centerY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
        
        // Marriage node (pink/red square like in mockup)
        const midX = (leftPos.x + rightPos.x) / 2;
        connectors.push(
          <rect
            key={`spouse-node-${idx}`}
            x={midX - 6}
            y={leftPos.centerY - 6}
            width="12"
            height="12"
            fill="#dc2626"
            stroke="#fbbf24"
            strokeWidth="2"
            rx="2"
          />
        );
      }
    });

    // Draw parent-to-children connections
    Object.values(childrenByParents).forEach(({ pair, children }, groupIdx) => {
      const pos1 = positionMap[pair.parent1];
      const pos2 = positionMap[pair.parent2];
      
      if (!pos1 || !pos2) return;
      
      const childArray = Array.from(children);
      const childPositions = childArray.map(id => positionMap[id]).filter(Boolean);
      
      if (childPositions.length === 0) return;

      // Marriage point (center between spouses)
      const marriageX = (pos1.x + pos2.x) / 2;
      const marriageY = pos1.centerY;
      
      // Vertical line down from marriage point
      const dropY = marriageY + 50;
      connectors.push(
        <line
          key={`drop-${groupIdx}`}
          x1={marriageX}
          y1={marriageY + 6}
          x2={marriageX}
          y2={dropY}
          stroke="#b45309"
          strokeWidth="3"
        />
      );

      // Horizontal bar connecting to children
      const childXPositions = childPositions.map(p => p.x);
      const minChildX = Math.min(...childXPositions);
      const maxChildX = Math.max(...childXPositions);
      
      if (childPositions.length > 1) {
        connectors.push(
          <line
            key={`hbar-${groupIdx}`}
            x1={minChildX}
            y1={dropY}
            x2={maxChildX}
            y2={dropY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
      }

      // Vertical lines down to each child
      childPositions.forEach((childPos, childIdx) => {
        connectors.push(
          <line
            key={`child-drop-${groupIdx}-${childIdx}`}
            x1={childPos.x}
            y1={dropY}
            x2={childPos.x}
            y2={childPos.y - 5}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
      });
    });

    // Draw special relations (dashed lines)
    if (tree.special_relations) {
      tree.special_relations.forEach((rel, idx) => {
        const fromPos = positionMap[rel.from_id];
        const toPos = positionMap[rel.to_id];
        
        if (fromPos && toPos) {
          const relationColors = {
            rival: '#ef4444',
            mentor: '#3b82f6', 
            sworn_enemy: '#991b1b',
            lover: '#ec4899',
            oath_bound: '#8b5cf6',
            betrayer: '#f97316'
          };
          const color = relationColors[rel.relation_type] || '#6b7280';
          
          connectors.push(
            <line
              key={`special-${idx}`}
              x1={fromPos.centerX}
              y1={fromPos.centerY}
              x2={toPos.centerX}
              y2={toPos.centerY}
              stroke={color}
              strokeWidth="2"
              strokeDasharray="6,4"
              opacity="0.6"
            />
          );
        }
      });
    }

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
            width: '4000px',
            height: '2000px',
            left: '-2000px',
            top: '-200px'
          }}
          viewBox="-2000 -200 4000 2000"
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