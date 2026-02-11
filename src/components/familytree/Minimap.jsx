import React, { useRef, useEffect, useState } from 'react';

export default function Minimap({ layout, transform, containerDimensions, onPanTo }) {
  const canvasRef = useRef(null);
  const minimapWidth = 200;
  const minimapHeight = 150;
  const padding = 10;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [viewportRect, setViewportRect] = useState(null);

  useEffect(() => {
    if (!layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, minimapWidth, minimapHeight);

    // Get all visible positions
    const positions = Object.values(layout.positions);
    if (positions.length === 0) return;

    // Compute tree bounds
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 96;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    // Calculate scale to fit tree in minimap
    const scaleX = (minimapWidth - padding * 2) / treeWidth;
    const scaleY = (minimapHeight - padding * 2) / treeHeight;
    const scale = Math.min(scaleX, scaleY);

    // Helper to convert world coords to minimap coords
    const toMinimapX = (worldX) => padding + (worldX - minX) * scale;
    const toMinimapY = (worldY) => padding + (worldY - minY) * scale;

    // Draw connectors (optional - thin lines)
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

        // Children lines
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

    // Draw nodes as dots
    ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
    positions.forEach(pos => {
      const x = toMinimapX(pos.centerX);
      const y = toMinimapY(pos.centerY);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw viewport rectangle
    if (containerDimensions) {
      const { width, height } = containerDimensions;
      
      // Convert screen corners to world coordinates
      const worldTopLeftX = (0 - transform.x) / transform.scale;
      const worldTopLeftY = (0 - transform.y) / transform.scale;
      const worldBottomRightX = (width - transform.x) / transform.scale;
      const worldBottomRightY = (height - transform.y) / transform.scale;

      // Convert world to minimap
      const viewX = toMinimapX(worldTopLeftX);
      const viewY = toMinimapY(worldTopLeftY);
      const viewW = toMinimapX(worldBottomRightX) - viewX;
      const viewH = toMinimapY(worldBottomRightY) - viewY;

      // Store viewport rect for drag detection
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

    // Check if clicking on viewport rectangle
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

    // Get tree bounds and minimap scale
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

    // Convert minimap delta to world delta
    const worldDeltaX = deltaX / minimapScale;
    const worldDeltaY = deltaY / minimapScale;

    // Update main view pan (move in opposite direction)
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

    // Don't pan if clicking on viewport rectangle
    if (isPointInViewport(clickX, clickY)) return;

    // Get tree bounds
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

    // Convert minimap click to world coordinates
    const worldX = ((clickX - padding) / scale) + minX;
    const worldY = ((clickY - padding) / scale) + minY;

    // Calculate new transform to center this point
    const newX = containerDimensions.width / 2 - worldX * transform.scale;
    const newY = containerDimensions.height / 2 - worldY * transform.scale;

    onPanTo(newX, newY);
  };

  return (
    <div className="absolute bottom-20 right-4 bg-stone-900/90 border border-amber-800/50 rounded-lg p-2 shadow-lg">
      <div className="text-xs text-amber-600 mb-1 font-serif">Overview</div>
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
    </div>
  );
}