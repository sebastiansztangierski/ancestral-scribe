import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customPositions, setCustomPositions] = useState({});
  const [marriageNodePositions, setMarriageNodePositions] = useState({});
  const [draggingPersonId, setDraggingPersonId] = useState(null);
  const [draggingMarriageIdx, setDraggingMarriageIdx] = useState(null);

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

    // Build spouse pair map
    const spousePairs = new Map();
    tree.family_edges.filter(e => e.relation_type === 'spouse').forEach(edge => {
      spousePairs.set(edge.from_id, edge.to_id);
      spousePairs.set(edge.to_id, edge.from_id);
    });

    // Build parent-child map
    const childrenByParent = new Map();
    tree.family_edges.filter(e => e.relation_type === 'parent_child').forEach(edge => {
      if (!childrenByParent.has(edge.from_id)) {
        childrenByParent.set(edge.from_id, []);
      }
      childrenByParent.get(edge.from_id).push(edge.to_id);
    });

    // Calculate positions - group spouses together
    Object.entries(generations).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([gen, persons]) => {
      const genNum = parseInt(gen);
      const spacing = 200;
      const processed = new Set();
      const arranged = [];

      // Arrange persons, grouping spouses together
      persons.forEach(person => {
        if (processed.has(person.id)) return;

        const spouseId = spousePairs.get(person.id);
        const spouse = spouseId ? persons.find(p => p.id === spouseId) : null;

        if (spouse && !processed.has(spouse.id)) {
          // Add couple together
          arranged.push(person, spouse);
          processed.add(person.id);
          processed.add(spouse.id);
        } else if (!processed.has(person.id)) {
          // Add single person
          arranged.push(person);
          processed.add(person.id);
        }
      });

      // Position arranged persons
      const genWidth = arranged.length * spacing;
      const startX = -genWidth / 2 + spacing / 2;
      const processedIds = new Set();
      
      // Calculate and apply positions
      arranged.forEach((person, index) => {
        if (processedIds.has(person.id)) return;
        
        let x = startX + index * spacing;
        const y = genNum * 180;
        
        // Check if this is a single child that should be centered under parents
        if (genNum > 0) {
          const parents = tree.family_edges
            .filter(e => e.relation_type === 'parent_child' && e.to_id === person.id)
            .map(e => e.from_id);

          if (parents.length === 2) {
            const parent1Id = parents[0];
            const parent2Id = parents[1];

            // Check if this person is the only child of these parents
            const siblingsFromParent1 = tree.family_edges
              .filter(e => e.relation_type === 'parent_child' && e.from_id === parent1Id)
              .map(e => e.to_id);
            const siblingsFromParent2 = tree.family_edges
              .filter(e => e.relation_type === 'parent_child' && e.from_id === parent2Id)
              .map(e => e.to_id);
            const commonChildren = siblingsFromParent1.filter(id => siblingsFromParent2.includes(id));

            if (commonChildren.length === 1 && positions[parent1Id] && positions[parent2Id]) {
              // Single child - calculate marriage node center
              const marriageKey = `${parent1Id}-${parent2Id}`;
              const reverseMarriageKey = `${parent2Id}-${parent1Id}`;
              const customMarriagePos = marriageNodePositions[marriageKey] || marriageNodePositions[reverseMarriageKey];
              const parentsCenterX = customMarriagePos?.x ?? (positions[parent1Id].centerX + positions[parent2Id].centerX) / 2;

              // Check if person has spouse
              const spouseId = spousePairs.get(person.id);
              const spouse = spouseId ? arranged.find(p => p.id === spouseId) : null;

              if (spouse) {
                // Position couple centered under parents
                const customPos1 = customPositions[person.id];
                const customPos2 = customPositions[spouseId];
                
                const x1 = customPos1?.x ?? (parentsCenterX - spacing / 2);
                const x2 = customPos2?.x ?? (parentsCenterX + spacing / 2);
                const y1 = customPos1?.y ?? y;
                const y2 = customPos2?.y ?? y;
                
                positions[person.id] = { x: x1, y: y1, centerX: x1, centerY: y1 + 48 };
                positions[spouseId] = { x: x2, y: y2, centerX: x2, centerY: y2 + 48 };
                
                processedIds.add(person.id);
                processedIds.add(spouseId);
                return;
              } else {
                // Single person without spouse, center them
                x = parentsCenterX;
              }
            }
          }
        }
        
        // Use custom position if available, otherwise use calculated position
        const customPos = customPositions[person.id];
        const finalX = customPos?.x ?? x;
        const finalY = customPos?.y ?? y;

        positions[person.id] = {
          x: finalX,
          y: finalY,
          centerX: finalX,
          centerY: finalY + 48
        };
        
        processedIds.add(person.id);
      });
    });

    return positions;
  }, [tree.persons, tree.family_edges, customPositions, marriageNodePositions]);

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

  // Handle portrait drag start
  const handlePortraitMouseDown = (e, personId) => {
    e.stopPropagation();
    setDraggingPersonId(personId);
    const pos = positionMap[personId];
    setDragStart({ 
      x: e.clientX / transform.scale - pos.x, 
      y: e.clientY / transform.scale - pos.y 
    });
  };

  // Handle marriage node drag start
  const handleMarriageNodeMouseDown = (e, pair, idx) => {
    e.stopPropagation();
    setDraggingMarriageIdx(idx);
    const pos1 = positionMap[pair.parent1];
    const pos2 = positionMap[pair.parent2];
    const marriageKey = `${pair.parent1}-${pair.parent2}`;
    const currentMarriagePos = marriageNodePositions[marriageKey];
    const midX = currentMarriagePos?.x ?? (pos1.centerX + pos2.centerX) / 2;
    const midY = currentMarriagePos?.y ?? Math.max(pos1.y, pos2.y) + 96;
    setDragStart({ 
      x: e.clientX / transform.scale - midX, 
      y: e.clientY / transform.scale - midY 
    });
  };

  // Handle canvas drag start
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.closest('.canvas-background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  // Handle drag
  const handleMouseMove = (e) => {
    if (draggingMarriageIdx !== null) {
      const pair = familyStructure.spousePairs[draggingMarriageIdx];
      const marriageKey = `${pair.parent1}-${pair.parent2}`;
      const pos1 = positionMap[pair.parent1];
      const pos2 = positionMap[pair.parent2];
      
      const currentMarriagePos = marriageNodePositions[marriageKey];
      const oldMarriageX = currentMarriagePos?.x ?? (pos1.centerX + pos2.centerX) / 2;
      const oldMarriageY = currentMarriagePos?.y ?? Math.max(pos1.y, pos2.y) + 96;
      
      const newX = e.clientX / transform.scale - dragStart.x;
      const newY = e.clientY / transform.scale - dragStart.y;
      
      const deltaX = newX - oldMarriageX;
      const deltaY = newY - oldMarriageY;
      
      setMarriageNodePositions(prev => ({
        ...prev,
        [marriageKey]: { x: newX, y: newY }
      }));
      
      setCustomPositions(prev => ({
        ...prev,
        [pair.parent1]: { x: pos1.x + deltaX, y: pos1.y + deltaY },
        [pair.parent2]: { x: pos2.x + deltaX, y: pos2.y + deltaY }
      }));
    } else if (draggingPersonId) {
      const newX = e.clientX / transform.scale - dragStart.x;
      const newY = e.clientY / transform.scale - dragStart.y;
      setCustomPositions(prev => ({
        ...prev,
        [draggingPersonId]: { x: newX, y: newY }
      }));
    } else if (isDragging) {
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
    setDraggingPersonId(null);
    setDraggingMarriageIdx(null);
  };

  // Initialize marriage node positions when tree loads
  useEffect(() => {
    const initialPositions = {};
    familyStructure.spousePairs.forEach((pair) => {
      const marriageKey = `${pair.parent1}-${pair.parent2}`;
      if (!marriageNodePositions[marriageKey]) {
        const pos1 = positionMap[pair.parent1];
        const pos2 = positionMap[pair.parent2];
        if (pos1 && pos2) {
          initialPositions[marriageKey] = {
            x: (pos1.centerX + pos2.centerX) / 2,
            y: Math.max(pos1.y, pos2.y) + 96
          };
        }
      }
    });
    if (Object.keys(initialPositions).length > 0) {
      setMarriageNodePositions(prev => ({ ...prev, ...initialPositions }));
    }
  }, [tree.persons, tree.family_edges]);

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
        const marriageKey = `${pair.parent1}-${pair.parent2}`;
        const customMarriagePos = marriageNodePositions[marriageKey];
        
        // Marriage node position - use custom or calculate default
        const marriageX = customMarriagePos?.x ?? (pos1.centerX + pos2.centerX) / 2;
        const marriageY = customMarriagePos?.y ?? Math.max(pos1.y, pos2.y) + 96;
        
        // Connect parent 1 to marriage node
        connectors.push(
          <line
            key={`spouse-line-1-${idx}`}
            x1={pos1.centerX}
            y1={pos1.y + 96}
            x2={marriageX}
            y2={marriageY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
        
        // Connect parent 2 to marriage node
        connectors.push(
          <line
            key={`spouse-line-2-${idx}`}
            x1={pos2.centerX}
            y1={pos2.y + 96}
            x2={marriageX}
            y2={marriageY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
        
        // Marriage node (pink/red square)
        connectors.push(
          <rect
            key={`spouse-node-${idx}`}
            x={marriageX - 6}
            y={marriageY - 6}
            width="12"
            height="12"
            fill="#dc2626"
            stroke="#fbbf24"
            strokeWidth="2"
            rx="2"
            className="cursor-move"
            style={{ pointerEvents: 'all', cursor: 'move' }}
            onMouseDown={(e) => handleMarriageNodeMouseDown(e, pair, idx)}
          />
        );
      }
    });

    // Draw parent-to-children connections
    Object.values(childrenByParents).forEach(({ pair, children }, groupIdx) => {
      const pos1 = positionMap[pair.parent1];
      const pos2 = positionMap[pair.parent2];
      
      if (!pos1 || !pos2 || children.size === 0) return;
      
      const childArray = Array.from(children);
      const childPositions = childArray.map(id => positionMap[id]).filter(Boolean);
      
      if (childPositions.length === 0) return;

      // Marriage point - use custom position if set
      const marriageKey = `${pair.parent1}-${pair.parent2}`;
      const customMarriagePos = marriageNodePositions[marriageKey];
      const marriageX = customMarriagePos?.x ?? (pos1.centerX + pos2.centerX) / 2;
      const marriageY = customMarriagePos?.y ?? Math.max(pos1.y, pos2.y) + 96;
      
      // Calculate horizontal bar position and range
      const childXPositions = childPositions.map(c => c.centerX);
      const minChildX = Math.min(...childXPositions);
      const maxChildX = Math.max(...childXPositions);
      
      // Horizontal bar just above children
      const childGenY = childPositions[0].y;
      const dropY = childGenY - 30;
      
      // Single child - straight line from marriage to child
      if (childPositions.length === 1) {
        connectors.push(
          <line
            key={`drop-${groupIdx}`}
            x1={marriageX}
            y1={marriageY}
            x2={marriageX}
            y2={dropY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
        connectors.push(
          <line
            key={`child-drop-${groupIdx}-0`}
            x1={marriageX}
            y1={dropY}
            x2={childPositions[0].centerX}
            y2={childGenY - 5}
            stroke="#b45309"
            strokeWidth="3"
          />
        );
      } else {
        // Multiple children - line down to horizontal bar
        const childrenCenterX = (minChildX + maxChildX) / 2;
        connectors.push(
          <line
            key={`drop-${groupIdx}`}
            x1={marriageX}
            y1={marriageY}
            x2={childrenCenterX}
            y2={dropY}
            stroke="#b45309"
            strokeWidth="3"
          />
        );

        // Horizontal bar spanning all children
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

        // Vertical lines down to each child
        childPositions.forEach((childPos, childIdx) => {
          connectors.push(
            <line
              key={`child-drop-${groupIdx}-${childIdx}`}
              x1={childPos.centerX}
              y1={dropY}
              x2={childPos.centerX}
              y2={childGenY - 5}
              stroke="#b45309"
              strokeWidth="3"
            />
          );
        });
      }
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
          const pos = positionMap[person.id];
          if (!pos) return null;
          
          return (
            <div
              key={person.id}
              className="absolute cursor-move"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translateX(-50%)'
              }}
              onMouseDown={(e) => handlePortraitMouseDown(e, person.id)}
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