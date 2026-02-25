import React, { useRef, useEffect, useState } from 'react';
import { Pin, Eye, Plus, Minus } from 'lucide-react';

export default function OverviewWidget({ 
  layout, 
  transform, 
  containerDimensions, 
  onPanTo, 
  allPersons, 
  collapsedPersonIds, 
  isHidden, 
  descendantCounts,
  onZoomIn,
  onZoomOut
}) {
  const canvasRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const clickTimerRef = useRef(null);
  const lastClickRef = useRef(null);
  
  const minimapWidth = 200;
  const minimapHeight = 150;
  const padding = 10;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [viewportRect, setViewportRect] = useState(null);
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('minimapMode');
    return saved || 'pinned';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [pings, setPings] = useState([]);

  useEffect(() => {
    if (!layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, minimapWidth, minimapHeight);

    const positions = Object.values(layout.positions);
    if (positions.length === 0) return;

    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 96;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = (minimapWidth - padding * 2) / treeWidth;
    const scaleY = (minimapHeight - padding * 2) / treeHeight;
    const scale = Math.min(scaleX, scaleY);

    const toMinimapX = (worldX) => padding + (worldX - minX) * scale;
    const toMinimapY = (worldY) => padding + (worldY - minY) * scale;

    // Draw connectors
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.3)';
    ctx.lineWidth = 1;
    
    layout.couples.forEach(couple => {
      const pos1 = layout.positions[couple.person1];
      const pos2 = layout.positions[couple.person2];
      
      if (pos1 && pos2) {
        const x1 = toMinimapX(pos1.centerX);
        const y1 = toMinimapY(pos1.centerY);
        const x2 = toMinimapX(pos2.centerX);
        const y2 = toMinimapY(pos2.centerY);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (couple.children && couple.children.length > 0) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          
          couple.children.forEach(childId => {
            const childPos = layout.positions[childId];
            if (childPos) {
              const childX = toMinimapX(childPos.centerX);
              const childY = toMinimapY(childPos.centerY);
              ctx.beginPath();
              ctx.moveTo(midX, midY);
              ctx.lineTo(childX, childY);
              ctx.stroke();
            }
          });
        }
      }
    });

    // Draw nodes
    if (allPersons) {
      allPersons.forEach(person => {
        const pos = layout.positions[person.id];
        if (!pos) return;
        
        const x = toMinimapX(pos.centerX);
        const y = toMinimapY(pos.centerY);
        const personIsHidden = isHidden && isHidden(person.id);
        const isCollapsedRoot = collapsedPersonIds && collapsedPersonIds.has(person.id);
        const hasHiddenDescendants = descendantCounts && descendantCounts[person.id] > 0 && isCollapsedRoot;

        if (personIsHidden) {
          ctx.fillStyle = 'rgba(120, 113, 108, 0.3)';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();

          if (hasHiddenDescendants) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
    }

    // Draw viewport rectangle
    if (containerDimensions) {
      const { width, height } = containerDimensions;
      
      const worldTopLeftX = (0 - transform.x) / transform.scale;
      const worldTopLeftY = (0 - transform.y) / transform.scale;
      const worldBottomRightX = (width - transform.x) / transform.scale;
      const worldBottomRightY = (height - transform.y) / transform.scale;

      const viewX = toMinimapX(worldTopLeftX);
      const viewY = toMinimapY(worldTopLeftY);
      const viewW = toMinimapX(worldBottomRightX) - viewX;
      const viewH = toMinimapY(worldBottomRightY) - viewY;

      setViewportRect({ x: viewX, y: viewY, width: viewW, height: viewH });

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(viewX, viewY, viewW, viewH);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(viewX, viewY, viewW, viewH);
    }
  }, [layout, transform, containerDimensions]);

  const isPointInViewport = (x, y) => {
    if (!viewportRect) return false;
    return x >= viewportRect.x && x <= viewportRect.x + viewportRect.width &&
           y >= viewportRect.y && y <= viewportRect.y + viewportRect.height;
  };

  const handlePointerDown = (e) => {
    if (!layout || !containerDimensions) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (isPointInViewport(clickX, clickY)) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: clickX, y: clickY });
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dragStart || !layout || !containerDimensions) return;

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    const positions = Object.values(layout.positions);
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 96;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = (minimapWidth - padding * 2) / treeWidth;
    const scaleY = (minimapHeight - padding * 2) / treeHeight;
    const minimapScale = Math.min(scaleX, scaleY);

    const worldDeltaX = deltaX / minimapScale;
    const worldDeltaY = deltaY / minimapScale;

    const newX = transform.x - worldDeltaX * transform.scale;
    const newY = transform.y - worldDeltaY * transform.scale;

    onPanTo(newX, newY);
    setDragStart({ x: currentX, y: currentY });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragStart(null);
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  const handleClick = (e) => {
    if (isDragging || !layout || !containerDimensions) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (isPointInViewport(clickX, clickY)) return;

    const now = Date.now();
    if (lastClickRef.current && now - lastClickRef.current < 300) {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      handleDoubleClick(clickX, clickY);
      lastClickRef.current = null;
      return;
    }

    lastClickRef.current = now;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    
    clickTimerRef.current = setTimeout(() => {
      const positions = Object.values(layout.positions);
      const xs = positions.map(p => p.x);
      const ys = positions.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + 80;
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + 96;

      const treeWidth = maxX - minX;
      const treeHeight = maxY - minY;

      const scaleX = (minimapWidth - padding * 2) / treeWidth;
      const scaleY = (minimapHeight - padding * 2) / treeHeight;
      const scale = Math.min(scaleX, scaleY);

      const worldX = ((clickX - padding) / scale) + minX;
      const worldY = ((clickY - padding) / scale) + minY;

      const newX = containerDimensions.width / 2 - worldX * transform.scale;
      const newY = containerDimensions.height / 2 - worldY * transform.scale;

      onPanTo(newX, newY);
      clickTimerRef.current = null;
    }, 300);
  };

  const handleDoubleClick = (clickX, clickY) => {
    if (!layout || !containerDimensions) return;

    const positions = Object.values(layout.positions);
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 96;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = (minimapWidth - padding * 2) / treeWidth;
    const scaleY = (minimapHeight - padding * 2) / treeHeight;
    const scale = Math.min(scaleX, scaleY);

    const worldX = ((clickX - padding) / scale) + minX;
    const worldY = ((clickY - padding) / scale) + minY;

    const newX = containerDimensions.width / 2 - worldX * transform.scale;
    const newY = containerDimensions.height / 2 - worldY * transform.scale;

    onPanTo(newX, newY);

    const pingId = Date.now();
    setPings(prev => [...prev, { id: pingId, x: clickX, y: clickY }]);

    setTimeout(() => {
      setPings(prev => prev.filter(p => p.id !== pingId));
    }, 600);
  };

  const toggleMode = () => {
    const newMode = mode === 'pinned' ? 'auto' : 'pinned';
    setMode(newMode);
    localStorage.setItem('minimapMode', newMode);
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (mode === 'auto' && !isDragging) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 400);
    }
  };

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isDragging) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  }, [isDragging]);

  const isExpanded = mode === 'pinned' || isHovered;

  return (
    <div
      className="bg-stone-900/90 border border-amber-800/50 rounded-lg shadow-lg transition-all duration-300"
      style={{
        transform: isExpanded ? 'translateX(0)' : 'translateX(calc(100% - 40px))',
        opacity: isExpanded ? 1 : 0.8
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-amber-800/30">
        <div className="text-xs text-amber-600 font-serif">Overview</div>
        <button
          onClick={toggleMode}
          className="p-1 hover:bg-amber-900/30 rounded transition-colors"
          title={mode === 'pinned' ? 'Enable auto-hide' : 'Pin minimap'}
        >
          {mode === 'pinned' ? (
            <Pin className="w-3 h-3 text-amber-600" />
          ) : (
            <Eye className="w-3 h-3 text-amber-600" />
          )}
        </button>
      </div>

      {/* Minimap Canvas */}
      <div className="p-2 relative">
        <canvas
          ref={canvasRef}
          width={minimapWidth}
          height={minimapHeight}
          className="rounded"
          style={{ 
            display: 'block',
            cursor: isDragging ? 'grabbing' : 'pointer',
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
        />
        {pings.map(ping => (
          <div
            key={ping.id}
            className="absolute pointer-events-none"
            style={{
              left: `${ping.x}px`,
              top: `${ping.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="absolute w-4 h-4 rounded-full border-2 border-blue-400 animate-ping" />
            <div className="absolute w-2 h-2 rounded-full bg-blue-400 opacity-75" />
          </div>
        ))}
      </div>

      {/* Zoom Controls Footer */}
      <div className="flex items-center justify-center gap-2 px-2 py-2 border-t border-amber-800/30">
        <button
          onClick={onZoomOut}
          className="flex items-center justify-center w-8 h-8 rounded bg-stone-800/60 border border-amber-700/50 text-amber-100 hover:bg-stone-700/80 transition-colors"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="text-xs text-amber-600/60 font-mono">Zoom</div>
        <button
          onClick={onZoomIn}
          className="flex items-center justify-center w-8 h-8 rounded bg-stone-800/60 border border-amber-700/50 text-amber-100 hover:bg-stone-700/80 transition-colors"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}