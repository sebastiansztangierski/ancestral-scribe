import React, { useRef } from 'react';

export default function ResizeHandle({ onResize, onResizeEnd, onDoubleClick }) {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    
    // Disable text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - startXRef.current;
    startXRef.current = e.clientX;
    
    onResize(deltaX);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = false;
    
    // Re-enable text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (onResizeEnd) {
      onResizeEnd();
    }
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <div
      className="relative flex items-center justify-center group cursor-col-resize"
      style={{ width: '8px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize, double-click to reset"
    >
      {/* Invisible hit area */}
      <div className="absolute inset-0 hover:bg-amber-500/10" />
      
      {/* Visual divider */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-stone-700 group-hover:bg-amber-600 transition-colors" />
    </div>
  );
}