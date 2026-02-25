import React, { useState, useRef, useEffect, useMemo } from 'react';
import CharacterNode from './CharacterNode';
import OverviewWidget from './OverviewWidget';
import { useViewportController } from './useViewportController';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson, hoveredEventParticipants = [], jumpToPersonId = null, hasInitialized, setHasInitialized }) {
  const containerRef = useRef(null);
  const viewport = useViewportController();
  const [containerDimensions, setContainerDimensions] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingCouple, setDraggingCouple] = useState(null);
  const [coupleDragStart, setCoupleDragStart] = useState(null);
  const [positionOverrides, setPositionOverrides] = useState({});
  const [collapsedPersonIds, setCollapsedPersonIds] = useState(() => {
    const saved = localStorage.getItem('familyTreeCollapsed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const dragHistory = useRef([]);

  // Layout configuration constants
  const COUPLE_SPACING = 140;
  const GENERATION_SPACING = 280;
  const SIBLING_SPACING = 100;
  const PARENT_TO_CHILD_GAP = 200;

  // Build children map and visibility helpers
  const { childrenByParent, getDescendants, isHidden, visiblePersons, descendantCounts } = useMemo(() => {
    if (!tree || !tree.persons) return { childrenByParent: new Map(), getDescendants: () => [], isHidden: () => false, visiblePersons: [], descendantCounts: {} };

    const childrenByParent = new Map();
    tree.family_edges
      .filter(e => e.relation_type === 'parent_child')
      .forEach(edge => {
        if (!childrenByParent.has(edge.from_id)) {
          childrenByParent.set(edge.from_id, []);
        }
        childrenByParent.get(edge.from_id).push(edge.to_id);
      });

    const getDescendants = (personId) => {
      const descendants = [];
      const queue = [personId];
      const visited = new Set();

      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        
        const children = childrenByParent.get(current) || [];
        children.forEach(childId => {
          descendants.push(childId);
          queue.push(childId);
        });
      }

      return descendants;
    };

    const hiddenIds = new Set();
    collapsedPersonIds.forEach(collapsedId => {
      getDescendants(collapsedId).forEach(descId => hiddenIds.add(descId));
    });

    const isHidden = (personId) => hiddenIds.has(personId);
    const visiblePersons = tree.persons.filter(p => !isHidden(p.id));

    const descendantCounts = {};
    tree.persons.forEach(person => {
      const descendants = getDescendants(person.id);
      descendantCounts[person.id] = descendants.length;
    });

    return { childrenByParent, getDescendants, isHidden, visiblePersons, descendantCounts };
  }, [tree, collapsedPersonIds]);

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
    visiblePersons.forEach(p => personById[p.id] = p);

    // Recursive layout function
    function layoutSubtree(personId, x, y) {
      const person = personById[personId];
      if (!person || positions[personId]) return { width: 0, center: x };

      const spouseId = spouseMap.get(personId);
      const spouse = spouseId ? personById[spouseId] : null;

      if (spouse && !positions[spouse.id]) {
        // This is a couple
        const coupleKey = [personId, spouse.id].sort().join('-');
        const childIds = Array.from(childrenByCouple.get(coupleKey) || []).filter(id => !isHidden(id));

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
    const roots = visiblePersons.filter(p => p.generation === 0);
    let currentX = 0;

    roots.forEach(root => {
      const layout = layoutSubtree(root.id, currentX, 0);
      currentX += layout.width + SIBLING_SPACING * 2;
    });

    // Component packing step - find connected components and pack them
    const componentGap = 50;
    
    // Build adjacency map for finding connected components
    const adjacency = new Map();
    visiblePersons.forEach(p => adjacency.set(p.id, new Set()));
    
    tree.family_edges.forEach(edge => {
      if (!isHidden(edge.from_id) && !isHidden(edge.to_id)) {
        adjacency.get(edge.from_id)?.add(edge.to_id);
        adjacency.get(edge.to_id)?.add(edge.from_id);
      }
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

    visiblePersons.forEach(person => {
      if (!visited.has(person.id)) {
        const component = new Set();
        dfs(person.id, component);
        components.push(component);
      }
    });

    // Compute bounding box for each component
    const componentBounds = components.map(component => {
      const personIds = Array.from(component).filter(id => positions[id]);
      if (personIds.length === 0) return null;
      
      const xs = personIds.map(id => positions[id].x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs.map((x, i) => x + 80)); // +80 for node width
      
      return {
        personIds,
        minX,
        maxX,
        width: maxX - minX
      };
    }).filter(Boolean);

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
  }, [tree, COUPLE_SPACING, GENERATION_SPACING, SIBLING_SPACING, visiblePersons, isHidden]);



  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    
    const normalizedDelta = e.deltaY > 0 ? 1 : -1;
    const zoomStep = 1 + (normalizedDelta * -0.05);
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    viewport.zoomAt(mouseX, mouseY, zoomStep);
  };

  // Handle canvas drag
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.closest('.canvas-background')) {
      e.preventDefault();
      viewport.stopFling();
      
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.currentTransform.x, y: e.clientY - viewport.currentTransform.y });
      dragHistory.current = [{ x: e.clientX, y: e.clientY, time: performance.now() }];
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const now = performance.now();
      dragHistory.current.push({ x: e.clientX, y: e.clientY, time: now });
      
      // Keep only last 100ms of samples
      dragHistory.current = dragHistory.current.filter(p => now - p.time < 100);
      
      viewport.panTo(newX, newY, true);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      if (dragHistory.current.length >= 2) {
        const recent = dragHistory.current.slice(-6);
        const oldest = recent[0];
        const newest = recent[recent.length - 1];
        const dt = (newest.time - oldest.time) / 1000; // convert to seconds
        
        if (dt > 0) {
          // Calculate velocity in pixels per second
          const vx = (newest.x - oldest.x) / dt;
          const vy = (newest.y - oldest.y) / dt;
          viewport.startFling(vx, vy);
        }
      }
    }
    
    setIsDragging(false);
    setDraggingCouple(null);
    setCoupleDragStart(null);
    dragHistory.current = [];
  };

  const handleCoupleMouseDown = (e, couple, midX, midY) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - viewport.currentTransform.x) / viewport.currentTransform.scale;
    const worldY = (e.clientY - rect.top - viewport.currentTransform.y) / viewport.currentTransform.scale;
    
    setDraggingCouple(couple);
    setCoupleDragStart({ x: worldX - midX, y: worldY - midY });
  };

  const handleCoupleMouseMove = (e) => {
    if (draggingCouple && coupleDragStart) {
      const rect = containerRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - viewport.currentTransform.x) / viewport.currentTransform.scale;
      const worldY = (e.clientY - rect.top - viewport.currentTransform.y) / viewport.currentTransform.scale;
      
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

  // Auto-fit and center on initial load only
  useEffect(() => {
    if (layout && containerRef.current && !hasInitialized) {
      const rect = containerRef.current.getBoundingClientRect();
      const { bbox } = layout;
      
      setContainerDimensions({ width: rect.width, height: rect.height });
      
      const treeWidth = bbox.maxX - bbox.minX;
      const treeHeight = bbox.maxY - bbox.minY;
      
      const scaleX = (rect.width * 0.9) / treeWidth;
      const scaleY = (rect.height * 0.9) / treeHeight;
      const fitScale = Math.min(scaleX, scaleY, 1);
      
      const centerX = rect.width / 2 - ((bbox.minX + bbox.maxX) / 2) * fitScale;
      const centerY = rect.height / 2 - ((bbox.minY + bbox.maxY) / 2) * fitScale;
      
      viewport.setTransform({ x: centerX, y: centerY, scale: fitScale }, true);
      setHasInitialized(true);
    }
  }, [layout, hasInitialized]);

  // Update container dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Center on selected person
  useEffect(() => {
    if (selectedPerson && containerRef.current && layout) {
      viewport.stopFling();
      const pos = layout.positions[selectedPerson.id];
      if (pos) {
        const rect = containerRef.current.getBoundingClientRect();
        const newX = rect.width / 2 - pos.centerX * viewport.targetTransform.scale;
        const newY = rect.height / 3 - pos.centerY * viewport.targetTransform.scale;
        viewport.panTo(newX, newY);
      }
    }
  }, [selectedPerson?.id]);

  // Jump to person (from search)
  useEffect(() => {
    if (jumpToPersonId && containerRef.current && layout) {
      viewport.stopFling();
      const pos = layout.positions[jumpToPersonId];
      if (pos) {
        const rect = containerRef.current.getBoundingClientRect();
        const newX = rect.width / 2 - pos.centerX * viewport.targetTransform.scale;
        const newY = rect.height / 2 - pos.centerY * viewport.targetTransform.scale;
        viewport.panTo(newX, newY);
      }
    }
  }, [jumpToPersonId, layout]);

  // Get position helper (merges overrides)
  const getPosition = (personId) => {
    if (!layout) return null;
    return positionOverrides[personId] || layout.positions[personId];
  };

  // Handle collapse toggle
  const handleToggleCollapse = (personId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setCollapsedPersonIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      localStorage.setItem('familyTreeCollapsed', JSON.stringify([...newSet]));
      return newSet;
    });
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
        backgroundColor: '#1c1917',
        position: 'relative'
      }}
    >
      <div className="canvas-background absolute inset-0" />

      <div
        className="absolute"
        style={{
          transform: `translate(${viewport.currentTransform.x}px, ${viewport.currentTransform.y}px) scale(${viewport.currentTransform.scale})`,
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
        {visiblePersons.map((person) => {
          const pos = getPosition(person.id);
          if (!pos) return null;

          const hasSpecialRelations = tree.special_relations?.some(
            rel => rel.from_id === person.id || rel.to_id === person.id
          );
          const isHighlighted = hoveredEventParticipants.includes(person.id);
          const isJumpHighlight = jumpToPersonId === person.id;
          const hasChildren = (childrenByParent.get(person.id) || []).length > 0;
          const isCollapsed = collapsedPersonIds.has(person.id);
          const hiddenCount = isCollapsed ? descendantCounts[person.id] : 0;

          return (
            <div
              key={person.id}
              data-person-id={person.id}
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
                isJumpHighlight={isJumpHighlight}
                hasChildren={hasChildren}
                isCollapsed={isCollapsed}
                hiddenCount={hiddenCount}
                onToggleCollapse={handleToggleCollapse}
              />
            </div>
          );
          })}
      </div>

      {/* Overview Widget (Minimap + Zoom) */}
      {layout && (
        <div className="absolute bottom-6 right-6 z-10">
          <OverviewWidget
            layout={layout}
            transform={viewport.currentTransform}
            containerDimensions={containerDimensions}
            onPanTo={(x, y) => viewport.panTo(x, y, true)}
            allPersons={tree.persons}
            collapsedPersonIds={collapsedPersonIds}
            isHidden={isHidden}
            descendantCounts={descendantCounts}
            onZoomIn={() => viewport.setScale(viewport.targetTransform.scale * 1.2)}
            onZoomOut={() => viewport.setScale(viewport.targetTransform.scale * 0.8)}
          />
        </div>
      )}
    </div>
  );
}