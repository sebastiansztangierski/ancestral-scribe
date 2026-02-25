import { useState, useRef, useEffect } from 'react';

export function useViewportController({ initialTransform = { x: 0, y: 0, scale: 1 } } = {}) {
  const [targetTransform, setTargetTransform] = useState(initialTransform);
  const [currentTransform, setCurrentTransform] = useState(initialTransform);
  
  const animationFrameRef = useRef(null);
  const inertiaFrameRef = useRef(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const isInertiaActiveRef = useRef(false);
  const prefersReducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Smooth interpolation loop
  useEffect(() => {
    const smoothingFactor = prefersReducedMotion.current ? 1 : 0.18;
    
    const animate = () => {
      setCurrentTransform(prev => {
        const dx = targetTransform.x - prev.x;
        const dy = targetTransform.y - prev.y;
        const ds = targetTransform.scale - prev.scale;
        
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(ds) < 0.001) {
          return targetTransform;
        }
        
        return {
          x: prev.x + dx * smoothingFactor,
          y: prev.y + dy * smoothingFactor,
          scale: prev.scale + ds * smoothingFactor
        };
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (inertiaFrameRef.current) {
        cancelAnimationFrame(inertiaFrameRef.current);
      }
    };
  }, [targetTransform]);

  // Pan by delta (relative movement)
  const panBy = (dx, dy, immediate = false) => {
    setTargetTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    if (immediate) {
      setCurrentTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
    }
  };

  // Pan to absolute position
  const panTo = (x, y, immediate = false) => {
    setTargetTransform(prev => ({
      ...prev,
      x,
      y
    }));
    
    if (immediate) {
      setCurrentTransform(prev => ({
        ...prev,
        x,
        y
      }));
    }
  };

  // Zoom at a specific point (keeping that point stationary)
  const zoomAt = (mouseX, mouseY, zoomFactor) => {
    setTargetTransform(prev => {
      const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.3), 2);
      
      const worldX = (mouseX - prev.x) / prev.scale;
      const worldY = (mouseY - prev.y) / prev.scale;
      
      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;
      
      return {
        x: newX,
        y: newY,
        scale: newScale
      };
    });
  };

  // Set scale directly (used by zoom buttons)
  const setScale = (newScale) => {
    setTargetTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(newScale, 0.3), 2)
    }));
  };

  // Set complete transform (used for initial setup)
  const setTransform = (transform, immediate = false) => {
    setTargetTransform(transform);
    if (immediate) {
      setCurrentTransform(transform);
    }
  };

  // Start fling/inertia animation
  const startFling = (vx, vy) => {
    if (prefersReducedMotion.current) return;
    if (isInertiaActiveRef.current) return;
    
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 1) return;
    
    const maxSpeed = 30;
    if (speed > maxSpeed) {
      velocityRef.current = { vx: (vx / speed) * maxSpeed, vy: (vy / speed) * maxSpeed };
    } else {
      velocityRef.current = { vx, vy };
    }
    
    isInertiaActiveRef.current = true;
    
    const animate = () => {
      const { vx: currentVx, vy: currentVy } = velocityRef.current;
      const currentSpeed = Math.sqrt(currentVx * currentVx + currentVy * currentVy);
      
      if (currentSpeed < 0.1) {
        isInertiaActiveRef.current = false;
        return;
      }
      
      setTargetTransform(prev => ({
        ...prev,
        x: prev.x + currentVx,
        y: prev.y + currentVy
      }));
      
      setCurrentTransform(prev => ({
        ...prev,
        x: prev.x + currentVx,
        y: prev.y + currentVy
      }));
      
      velocityRef.current = {
        vx: currentVx * 0.94,
        vy: currentVy * 0.94
      };
      
      inertiaFrameRef.current = requestAnimationFrame(animate);
    };
    
    inertiaFrameRef.current = requestAnimationFrame(animate);
  };

  // Stop any active fling/inertia
  const stopFling = () => {
    if (isInertiaActiveRef.current && inertiaFrameRef.current) {
      cancelAnimationFrame(inertiaFrameRef.current);
      isInertiaActiveRef.current = false;
      velocityRef.current = { vx: 0, vy: 0 };
    }
  };

  return {
    currentTransform,
    targetTransform,
    panBy,
    panTo,
    zoomAt,
    setScale,
    setTransform,
    startFling,
    stopFling
  };
}