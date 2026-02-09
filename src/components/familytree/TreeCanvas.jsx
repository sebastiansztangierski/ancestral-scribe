import React, { useState, useRef, useEffect, useMemo } from 'react';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build family tree layout
  const layout = useMemo(() => {
    if (!tree || !tree.persons || tree.persons.length === 0) return null;

    // Build relationship maps
    const spouseMap = new Map();
    tree.family_edges
      .filter(e => e.relation_type === 'spouse')
      .forEach(edge => {
        spouseMap.set(edge.from_id, edge.to_id);
        spouseMap.set(edge.to_id, edge.from_id);
      });

    // Group children by parent pairs
    const childrenByCouple = new Map();
    tree.family_edges
      .filter(e => e.relation_type === 'parent_child')
      .forEach(edge => {
        const parentId = edge.from_id;
        const childId = edge.to_id;
        const spouseId = spouseMap.get(parentId);
        
        if (spouseId) {
          const coupleKey = [parentId, spouseId].sort().join('-');
          if (!childrenByCouple.has(coupleKey)) {
            childrenByCouple.set(coupleKey, new Set());
          }
          childrenByCouple.get(coupleKey).add(childId);
        }
      });

    // Layout configuration
    const COUPLE_SPACING = 150;
    const GENERATION_SPACING = 250;
    const SIBLING_SPACING = 200;

    const positions = {};
    const couples = [];
    const personById = {};
    tree.persons.forEach(p => personById[p.id] = p);

    // Recursive layout function
    function layoutSubtree(personId, x, y) {
      const person = personById[personId];
      if (!person || positions[personId]) return { width: 0, center: x };

      const spouseId = spouseMap.get(personId);
      const spouse = spouseId ? personById[spouseId] : null;

      if (spouse && !positions[spouse.id]) {
        // This is a couple
        const coupleKey = [personId, spouse.id].sort().join('-');
        const childIds = Array.from(childrenByCouple.get(coupleKey) || []);

        if (childIds.length === 0) {
          // No children - simple couple layout
          positions[personId] = { x, y, centerX: x + 40, centerY: y + 48 };
          positions[spouse.id] = { x: x + COUPLE_SPACING, y, centerX: x + COUPLE_SPACING + 40, centerY: y + 48 };
          
          couples.push({
            person1: personId,
            person2: spouse.id,
            children: []
          });

          return { width: COUPLE_SPACING + 80, center: x + COUPLE_SPACING / 2 + 40 };
        } else {
          // Layout children first
          const childY = y + GENERATION_SPACING;
          let childX = x;
          const childLayouts = [];

          childIds.forEach(childId => {
            const layout = layoutSubtree(childId, childX, childY);
            childLayouts.push(layout);
            childX += layout.width + SIBLING_SPACING;
          });

          // Calculate children center based on their actual center positions
          const childCenters = childIds.map(childId => positions[childId].centerX);
          const childrenCenter = childCenters.reduce((a, b) => a + b, 0) / childCenters.length;
          const totalChildWidth = childX - x - SIBLING_SPACING;

          // Position parents centered above children
          const parent1X = childrenCenter - COUPLE_SPACING / 2 - 40;
          const parent2X = childrenCenter + COUPLE_SPACING / 2 - 40;

          positions[personId] = { x: parent1X, y, centerX: parent1X + 40, centerY: y + 48 };
          positions[spouse.id] = { x: parent2X, y, centerX: parent2X + 40, centerY: y + 48 };

          couples.push({
            person1: personId,
            person2: spouse.id,
            children: childIds
          });

          return { width: Math.max(totalChildWidth, COUPLE_SPACING), center: childrenCenter };
        }
      } else if (!positions[personId]) {
        // Single person
        positions[personId] = { x, y, centerX: x + 40, centerY: y + 48 };
        return { width: 80, center: x + 40 };
      }

      return { width: 0, center: x };
    }

    // Find root (generation 0)
    const roots = tree.persons.filter(p => p.generation === 0);
    let currentX = 0;

    roots.forEach(root => {
      const layout = layoutSubtree(root.id, currentX, 0);
      currentX += layout.width + SIBLING_SPACING * 2;
    });

    return { positions, couples };
  }, [tree]);

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * delta, 0.3), 2)
    }));
  };

  // Handle canvas drag
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.closest('.canvas-background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Center on selected person
  useEffect(() => {
    if (selectedPerson && containerRef.current && layout) {
      const pos = layout.positions[selectedPerson.id];
      if (pos) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform(prev => ({
          ...prev,
          x: rect.width / 2 - pos.x * prev.scale,
          y: rect.height / 3 - pos.y * prev.scale
        }));
      }
    }
  }, [selectedPerson?.id, layout]);

  // Render connectors
  const renderConnectors = () => {
    if (!layout) return null;

    const connectors = [];
    const { positions, couples } = layout;

    // Draw marriage connectors (horizontal lines between spouses)
    couples.forEach((couple, idx) => {
      const pos1 = positions[couple.person1];
      const pos2 = positions[couple.person2];
      
      if (pos1 && pos2) {
        const midX = (pos1.centerX + pos2.centerX) / 2;
        const midY = (pos1.centerY + pos2.centerY) / 2;

        // Horizontal line between spouses
        connectors.push(
          <line
            key={`marriage-${idx}`}
            x1={pos1.centerX}
            y1={pos1.centerY}
            x2={pos2.centerX}
            y2={pos2.centerY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );

        // Marriage node (red square in center)
        connectors.push(
          <rect
            key={`marriage-node-${idx}`}
            x={midX - 6}
            y={midY - 6}
            width="12"
            height="12"
            fill="#dc2626"
            stroke="#fbbf24"
            strokeWidth="2"
            rx="2"
          />
        );

        // Draw children connectors if they have children
        if (couple.children && couple.children.length > 0) {
          const childPositions = couple.children
            .map(childId => positions[childId])
            .filter(Boolean);

          if (childPositions.length > 0) {
            const childXs = childPositions.map(p => p.centerX);
            const leftChildX = Math.min(...childXs);
            const rightChildX = Math.max(...childXs);
            const childrenY = childPositions[0].y;
            const horizontalBarY = childrenY - 60;

            // Vertical trunk from marriage node to horizontal bar
            connectors.push(
              <line
                key={`trunk-${idx}`}
                x1={midX}
                y1={midY}
                x2={midX}
                y2={horizontalBarY}
                stroke="#b45309"
                strokeWidth="3"
              />
            );

            // Horizontal bar connecting all children
            connectors.push(
              <line
                key={`children-bar-${idx}`}
                x1={leftChildX}
                y1={horizontalBarY}
                x2={rightChildX}
                y2={horizontalBarY}
                stroke="#b45309"
                strokeWidth="3"
              />
            );

            // Vertical lines from horizontal bar to each child
            childPositions.forEach((childPos, childIdx) => {
              connectors.push(
                <line
                  key={`child-${idx}-${childIdx}`}
                  x1={childPos.centerX}
                  y1={horizontalBarY}
                  x2={childPos.centerX}
                  y2={childPos.y}
                  stroke="#b45309"
                  strokeWidth="3"
                />
              );
            });
          }
        }
      }
    });

    // Draw special relations
    if (tree.special_relations) {
      tree.special_relations.forEach((rel, idx) => {
        const fromPos = positions[rel.from_id];
        const toPos = positions[rel.to_id];

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

  if (!layout) return <div className="w-full h-full flex items-center justify-center text-amber-100">Loading tree...</div>;

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
      <div className="canvas-background absolute inset-0" />

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
            height: '3000px',
            left: '-2000px',
            top: '-500px',
            overflow: 'visible'
          }}
          viewBox="-2000 -500 4000 3000"
        >
          {renderConnectors()}
        </svg>

        {/* Character nodes */}
        {tree.persons.map((person) => {
          const pos = layout.positions[person.id];
          if (!pos) return null;

          return (
            <div
              key={person.id}
              className="absolute"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`
              }}
            >
              <CharacterNode
                person={person}
                isSelected={selectedPerson?.id === person.id}
                onClick={onSelectPerson}
              />
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