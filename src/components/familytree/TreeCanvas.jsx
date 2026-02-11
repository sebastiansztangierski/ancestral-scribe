import React, { useState, useRef, useEffect, useMemo } from 'react';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson, hoveredEventParticipants = [] }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingCouple, setDraggingCouple] = useState(null);
  const [coupleDragStart, setCoupleDragStart] = useState(null);
  const [positionOverrides, setPositionOverrides] = useState({});

  // Layout configuration constants
  const COUPLE_SPACING = 140;
  const GENERATION_SPACING = 280;
  const SIBLING_SPACING = 100;
  const PARENT_TO_CHILD_GAP = 200;

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
          // Layout children first - use extended gap for vertical layout
          const childY = y + GENERATION_SPACING + PARENT_TO_CHILD_GAP;
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

    // Component packing step - find connected components and pack them
    const componentGap = 50;
    
    // Build adjacency map for finding connected components
    const adjacency = new Map();
    tree.persons.forEach(p => adjacency.set(p.id, new Set()));
    
    tree.family_edges.forEach(edge => {
      adjacency.get(edge.from_id).add(edge.to_id);
      adjacency.get(edge.to_id).add(edge.from_id);
    });

    // Find all connected components using DFS
    const visited = new Set();
    const components = [];

    function dfs(personId, component) {
      if (visited.has(personId)) return;
      visited.add(personId);
      component.add(personId);
      adjacency.get(personId).forEach(neighbor => dfs(neighbor, component));
    }

    tree.persons.forEach(person => {
      if (!visited.has(person.id)) {
        const component = new Set();
        dfs(person.id, component);
        components.push(component);
      }
    });

    // Compute bounding box for each component
    const componentBounds = components.map(component => {
      const personIds = Array.from(component);
      const xs = personIds.map(id => positions[id].x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs.map((x, i) => x + 80)); // +80 for node width
      
      return {
        personIds,
        minX,
        maxX,
        width: maxX - minX
      };
    });

    // Sort components by minX
    componentBounds.sort((a, b) => a.minX - b.minX);

    // Pack components left-to-right
    let packX = 0;
    componentBounds.forEach(comp => {
      const deltaX = packX - comp.minX;
      
      // Shift all nodes in this component
      comp.personIds.forEach(personId => {
        positions[personId].x += deltaX;
        positions[personId].centerX += deltaX;
      });
      
      packX += comp.width + componentGap;
    });

    // Compute global bounding box after packing
    const allX = Object.values(positions).map(p => p.x);
    const allY = Object.values(positions).map(p => p.y);
    const bbox = {
      minX: Math.min(...allX),
      maxX: Math.max(...allX) + 80,
      minY: Math.min(...allY),
      maxY: Math.max(...allY) + 96
    };

    return { positions, couples, bbox };
  }, [tree, COUPLE_SPACING, GENERATION_SPACING, SIBLING_SPACING]);

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
    if (layout && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const { bbox } = layout;
      
      const treeWidth = bbox.maxX - bbox.minX;
      const treeHeight = bbox.maxY - bbox.minY;
      
      const scaleX = (rect.width * 0.9) / treeWidth;
      const scaleY = (rect.height * 0.9) / treeHeight;
      const fitScale = Math.min(scaleX, scaleY, 1);
      
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
            const parentY = midY;
            const horizontalBarY = parentY + PARENT_TO_CHILD_GAP;

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
          const isHighlighted = hoveredEventParticipants.includes(person.id);

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
                isHighlighted={isHighlighted}
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