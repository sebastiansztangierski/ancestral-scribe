import React, { useState, useRef, useEffect, useMemo } from 'react';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingCouple, setDraggingCouple] = useState(null);
  const [coupleDragStart, setCoupleDragStart] = useState(null);
  const [positionOverrides, setPositionOverrides] = useState({});

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

    // Compact layout configuration
    const NODE_WIDTH = 80;
    const NODE_HEIGHT = 96;
    const PARTNER_GAP = 20;
    const SIBLING_GAP = 40;
    const GENERATION_GAP = 220;
    const COMPONENT_GAP = 60;

    const positions = {};
    const couples = [];
    const personById = {};
    tree.persons.forEach(p => personById[p.id] = p);

    // Tidy tree layout - returns { width, leftBound, rightBound, centerX }
    function layoutSubtree(personId, relX, y) {
      const person = personById[personId];
      if (!person || positions[personId]) return { width: 0, leftBound: relX, rightBound: relX, centerX: relX };

      const spouseId = spouseMap.get(personId);
      const spouse = spouseId ? personById[spouseId] : null;

      if (spouse && !positions[spouse.id]) {
        // Couple node - treat as single unit
        const coupleKey = [personId, spouse.id].sort().join('-');
        const childIds = Array.from(childrenByCouple.get(coupleKey) || []);
        const familyWidth = NODE_WIDTH * 2 + PARTNER_GAP;

        if (childIds.length === 0) {
          // Leaf couple
          positions[personId] = { x: relX, y, centerX: relX + NODE_WIDTH / 2, centerY: y + NODE_HEIGHT / 2 };
          positions[spouse.id] = { x: relX + NODE_WIDTH + PARTNER_GAP, y, centerX: relX + NODE_WIDTH + PARTNER_GAP + NODE_WIDTH / 2, centerY: y + NODE_HEIGHT / 2 };
          
          couples.push({ person1: personId, person2: spouse.id, children: [] });

          const centerX = relX + familyWidth / 2;
          return { width: familyWidth, leftBound: relX, rightBound: relX + familyWidth, centerX };
        } else {
          // Layout children subtrees
          const childY = y + GENERATION_GAP;
          let childX = relX;
          const childLayouts = [];

          childIds.forEach(childId => {
            const childLayout = layoutSubtree(childId, childX, childY);
            childLayouts.push(childLayout);
            childX += childLayout.width + SIBLING_GAP;
          });

          // Children bounds
          const childrenWidth = childX - relX - SIBLING_GAP;
          const childrenLeft = childLayouts[0].leftBound;
          const childrenRight = childLayouts[childLayouts.length - 1].rightBound;
          const childrenCenterX = (childrenLeft + childrenRight) / 2;

          // Position couple centered over children
          const coupleLeft = childrenCenterX - familyWidth / 2;
          positions[personId] = { x: coupleLeft, y, centerX: coupleLeft + NODE_WIDTH / 2, centerY: y + NODE_HEIGHT / 2 };
          positions[spouse.id] = { x: coupleLeft + NODE_WIDTH + PARTNER_GAP, y, centerX: coupleLeft + NODE_WIDTH + PARTNER_GAP + NODE_WIDTH / 2, centerY: y + NODE_HEIGHT / 2 };

          couples.push({ person1: personId, person2: spouse.id, children: childIds });

          // Subtree bounds
          const subtreeLeft = Math.min(coupleLeft, childrenLeft);
          const subtreeRight = Math.max(coupleLeft + familyWidth, childrenRight);
          const subtreeWidth = subtreeRight - subtreeLeft;
          const subtreeCenterX = (subtreeLeft + subtreeRight) / 2;

          return { width: subtreeWidth, leftBound: subtreeLeft, rightBound: subtreeRight, centerX: subtreeCenterX };
        }
      } else if (!positions[personId]) {
        // Single person
        positions[personId] = { x: relX, y, centerX: relX + NODE_WIDTH / 2, centerY: y + NODE_HEIGHT / 2 };
        return { width: NODE_WIDTH, leftBound: relX, rightBound: relX + NODE_WIDTH, centerX: relX + NODE_WIDTH / 2 };
      }

      return { width: 0, leftBound: relX, rightBound: relX, centerX: relX };
    }

    // Layout all roots and pack them
    const roots = tree.persons.filter(p => p.generation === 0);
    let packX = 0;
    const rootLayouts = [];

    roots.forEach(rootId => {
      const rootLayout = layoutSubtree(rootId, packX, 0);
      rootLayouts.push(rootLayout);
      packX = rootLayout.rightBound + COMPONENT_GAP;
    });

    // Compaction pass - shift left where possible
    const generations = {};
    Object.keys(positions).forEach(personId => {
      const gen = personById[personId].generation;
      if (!generations[gen]) generations[gen] = [];
      generations[gen].push(personId);
    });

    Object.keys(generations).forEach(gen => {
      const people = generations[gen].sort((a, b) => positions[a].x - positions[b].x);
      
      for (let i = 1; i < people.length; i++) {
        const currentId = people[i];
        const prevId = people[i - 1];
        const currentPos = positions[currentId];
        const prevPos = positions[prevId];
        
        const minX = prevPos.x + NODE_WIDTH + SIBLING_GAP;
        if (currentPos.x > minX + 10) {
          const shift = currentPos.x - minX;
          positions[currentId].x = minX;
          positions[currentId].centerX -= shift;
          
          // Shift spouse if exists
          const spouseId = spouseMap.get(currentId);
          if (spouseId && positions[spouseId]) {
            positions[spouseId].x -= shift;
            positions[spouseId].centerX -= shift;
          }
        }
      }
    });

    // Compute bounding box
    const allX = Object.values(positions).map(p => p.x);
    const allY = Object.values(positions).map(p => p.y);
    const bbox = {
      minX: Math.min(...allX),
      maxX: Math.max(...allX) + NODE_WIDTH,
      minY: Math.min(...allY),
      maxY: Math.max(...allY) + NODE_HEIGHT
    };

    return { positions, couples, bbox };
  }, [tree]);

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setTransform(prev => {
      const newScale = Math.min(Math.max(prev.scale * delta, 0.3), 2);
      
      // Calculate point under mouse before zoom
      const worldX = (mouseX - prev.x) / prev.scale;
      const worldY = (mouseY - prev.y) / prev.scale;
      
      // Calculate new position to keep point under mouse
      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;
      
      return {
        x: newX,
        y: newY,
        scale: newScale
      };
    });
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
    setDraggingCouple(null);
    setCoupleDragStart(null);
  };

  const handleCoupleMouseDown = (e, couple, midX, midY) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
    const worldY = (e.clientY - rect.top - transform.y) / transform.scale;
    
    setDraggingCouple(couple);
    setCoupleDragStart({ x: worldX - midX, y: worldY - midY });
  };

  const handleCoupleMouseMove = (e) => {
    if (draggingCouple && coupleDragStart) {
      const rect = containerRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
      const worldY = (e.clientY - rect.top - transform.y) / transform.scale;
      
      const newMidX = worldX - coupleDragStart.x;
      const newMidY = worldY - coupleDragStart.y;
      
      const pos1 = layout.positions[draggingCouple.person1];
      const pos2 = layout.positions[draggingCouple.person2];
      
      const currentMidX = (pos1.centerX + pos2.centerX) / 2;
      const currentMidY = (pos1.centerY + pos2.centerY) / 2;
      
      const deltaX = newMidX - currentMidX;
      const deltaY = newMidY - currentMidY;
      
      setPositionOverrides(prev => ({
        ...prev,
        [draggingCouple.person1]: {
          x: pos1.x + deltaX,
          y: pos1.y + deltaY,
          centerX: pos1.centerX + deltaX,
          centerY: pos1.centerY + deltaY
        },
        [draggingCouple.person2]: {
          x: pos2.x + deltaX,
          y: pos2.y + deltaY,
          centerX: pos2.centerX + deltaX,
          centerY: pos2.centerY + deltaY
        }
      }));
    }
  };

  // Auto-fit and center on load
  useEffect(() => {
    if (layout && containerRef.current && !selectedPerson) {
      const rect = containerRef.current.getBoundingClientRect();
      const { bbox } = layout;
      
      const treeWidth = bbox.maxX - bbox.minX;
      const treeHeight = bbox.maxY - bbox.minY;
      
      const scaleX = (rect.width * 0.85) / treeWidth;
      const scaleY = (rect.height * 0.85) / treeHeight;
      const fitScale = Math.min(scaleX, scaleY, 1.2);
      
      const centerX = rect.width / 2 - ((bbox.minX + bbox.maxX) / 2) * fitScale;
      const centerY = rect.height / 2 - ((bbox.minY + bbox.maxY) / 2) * fitScale;
      
      setTransform({ x: centerX, y: centerY, scale: fitScale });
    }
  }, [layout]);

  // Center on selected person
  useEffect(() => {
    if (selectedPerson && containerRef.current && layout) {
      const pos = layout.positions[selectedPerson.id];
      if (pos) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform(prev => ({
          ...prev,
          x: rect.width / 2 - pos.centerX * prev.scale,
          y: rect.height / 3 - pos.centerY * prev.scale
        }));
      }
    }
  }, [selectedPerson?.id]);

  // Get position helper (merges overrides)
  const getPosition = (personId) => {
    if (!layout) return null;
    return positionOverrides[personId] || layout.positions[personId];
  };

  // Render connectors
  const renderConnectors = () => {
    if (!layout) return null;

    const connectors = [];
    const { positions, couples } = layout;

    // Draw marriage connectors (horizontal lines between spouses)
    couples.forEach((couple, idx) => {
      const pos1 = getPosition(couple.person1);
      const pos2 = getPosition(couple.person2);
      
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

        // Marriage node (red square in center - draggable)
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
            className="cursor-move pointer-events-auto"
            onMouseDown={(e) => handleCoupleMouseDown(e, couple, midX, midY)}
          />
        );

        // Draw children connectors if they have children
        if (couple.children && couple.children.length > 0) {
          const childPositions = couple.children
            .map(childId => getPosition(childId))
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

    // Draw special relations (only for selected person)
    if (tree.special_relations && selectedPerson) {
      tree.special_relations
        .filter(rel => rel.from_id === selectedPerson.id || rel.to_id === selectedPerson.id)
        .forEach((rel, idx) => {
          const fromPos = getPosition(rel.from_id);
          const toPos = getPosition(rel.to_id);

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
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleCoupleMouseMove(e);
      }}
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
          className="absolute"
          style={{
            pointerEvents: 'none',
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
          const pos = getPosition(person.id);
          if (!pos) return null;

          const hasSpecialRelations = tree.special_relations?.some(
            rel => rel.from_id === person.id || rel.to_id === person.id
          );

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
                hasSpecialRelations={hasSpecialRelations}
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