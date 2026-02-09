import React, { useState, useRef, useEffect, useMemo } from 'react';
import { tree as d3Tree, hierarchy } from 'd3-hierarchy';
import CharacterNode from './CharacterNode';

export default function TreeCanvas({ tree, selectedPerson, onSelectPerson }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build hierarchical tree structure from family data
  const treeLayout = useMemo(() => {
    if (!tree || !tree.persons || tree.persons.length === 0) return null;

    // Find the root person (generation 0)
    const rootPerson = tree.persons.find(p => p.generation === 0);
    if (!rootPerson) return null;

    // Build parent-child map
    const childrenMap = new Map();
    tree.family_edges
      .filter(e => e.relation_type === 'parent_child')
      .forEach(edge => {
        if (!childrenMap.has(edge.from_id)) {
          childrenMap.set(edge.from_id, []);
        }
        childrenMap.get(edge.from_id).push(edge.to_id);
      });

    // Build spouse map
    const spouseMap = new Map();
    tree.family_edges
      .filter(e => e.relation_type === 'spouse')
      .forEach(edge => {
        spouseMap.set(edge.from_id, edge.to_id);
        spouseMap.set(edge.to_id, edge.from_id);
      });

    // Recursive function to build hierarchy
    function buildNode(personId) {
      const person = tree.persons.find(p => p.id === personId);
      if (!person) return null;

      const spouseId = spouseMap.get(personId);
      const spouse = spouseId ? tree.persons.find(p => p.id === spouseId) : null;

      const children = childrenMap.get(personId) || [];
      const childNodes = children.map(childId => buildNode(childId)).filter(Boolean);

      return {
        id: personId,
        person,
        spouse,
        children: childNodes
      };
    }

    const root = hierarchy(buildNode(rootPerson.id));
    
    // Configure tree layout
    const layout = d3Tree()
      .size([2000, 1500])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    layout(root);

    return { root, spouseMap };
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
    if (selectedPerson && containerRef.current && treeLayout) {
      const node = treeLayout.root.descendants().find(n => n.data.id === selectedPerson.id);
      if (node) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform(prev => ({
          ...prev,
          x: rect.width / 2 - node.x * prev.scale,
          y: rect.height / 3 - node.y * prev.scale
        }));
      }
    }
  }, [selectedPerson?.id, treeLayout]);

  // Render connectors using d3 hierarchy
  const renderConnectors = () => {
    if (!treeLayout) return null;

    const connectors = [];
    const { root, spouseMap } = treeLayout;

    // Draw parent-child links
    root.links().forEach((link, idx) => {
      const sourceX = link.source.x;
      const sourceY = link.source.y + 96; // Bottom of portrait
      const targetX = link.target.x;
      const targetY = link.target.y; // Top of portrait

      // Draw vertical + horizontal path
      const midY = (sourceY + targetY) / 2;

      connectors.push(
        <path
          key={`link-${idx}`}
          d={`M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`}
          stroke="#b45309"
          strokeWidth="3"
          fill="none"
        />
      );
    });

    // Draw spouse connections
    root.descendants().forEach((node, idx) => {
      if (node.data.spouse) {
        const spouseId = node.data.spouse.id;
        const spouseNode = root.descendants().find(n => n.data.id === spouseId);
        
        if (spouseNode && node.data.id < spouseId) { // Draw once per pair
          const x1 = node.x;
          const y1 = node.y + 48; // Center of portrait
          const x2 = spouseNode.x;
          const y2 = spouseNode.y + 48;

          connectors.push(
            <line
              key={`spouse-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#b45309"
              strokeWidth="3"
            />
          );

          // Marriage node
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          connectors.push(
            <rect
              key={`marriage-${idx}`}
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
        }
      }
    });

    // Draw special relations
    if (tree.special_relations) {
      tree.special_relations.forEach((rel, idx) => {
        const fromNode = root.descendants().find(n => n.data.id === rel.from_id);
        const toNode = root.descendants().find(n => n.data.id === rel.to_id);
        
        if (fromNode && toNode) {
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
              x1={fromNode.x}
              y1={fromNode.y + 48}
              x2={toNode.x}
              y2={toNode.y + 48}
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

  if (!treeLayout) return <div className="w-full h-full flex items-center justify-center text-amber-100">Loading tree...</div>;

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
        {treeLayout.root.descendants().map((node) => {
          const person = node.data.person;
          if (!person) return null;

          return (
            <div
              key={person.id}
              className="absolute"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: 'translateX(-50%)'
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

        {/* Render spouses alongside their partners */}
        {treeLayout.root.descendants().map((node) => {
          const spouse = node.data.spouse;
          if (!spouse) return null;

          return (
            <div
              key={spouse.id}
              className="absolute"
              style={{
                left: `${node.x + 150}px`, // Offset spouse to the right
                top: `${node.y}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <CharacterNode
                person={spouse}
                isSelected={selectedPerson?.id === spouse.id}
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