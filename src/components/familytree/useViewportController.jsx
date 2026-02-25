import { useState, useRef, useEffect } from 'react';

export function useViewportController({ initialTransform = { x: 0, y: 0, scale: 1 } } = {}) {
  const [currentTransform, setCurrentTransform] = useState(initialTransform);
  
  const targetRef = useRef(initialTransform);
  const animationFrameRef = useRef(null);
  const inertiaFrameRef = useRef(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const isInertiaActiveRef = useRef(false);
  const prefersReducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Helper to update target transform
  const updateTarget = (newTarget) => {
    targetRef.current = newTarget;
  };

  // Smooth interpolation loop (runs once on mount)
  useEffect(() => {
    const smoothingFactor = prefersReducedMotion.current ? 1 : 0.18;
    
    const animate = () => {
      setCurrentTransform(prev => {
        const target = targetRef.current;
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        const ds = target.scale - prev.scale;
        
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(ds) < 0.001) {
          return target;
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
  }, []);

  // Pan by delta (relative movement)
  const panBy = (dx, dy, immediate = false) => {
    const newTarget = {
      ...targetRef.current,
      x: targetRef.current.x + dx,
      y: targetRef.current.y + dy
    };
    updateTarget(newTarget);
    
    if (immediate) {
      setCurrentTransform(newTarget);
    }
  };

  // Pan to absolute position
  const panTo = (x, y, immediate = false) => {
    const newTarget = {
      ...targetRef.current,
      x,
      y
    };
    updateTarget(newTarget);
    
    if (immediate) {
      setCurrentTransform(newTarget);
    }
  };

  // Zoom at a specific point (keeping that point stationary)
  const zoomAt = (mouseX, mouseY, zoomFactor) => {
    const prev = targetRef.current;
    const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.3), 2);
    
    const worldX = (mouseX - prev.x) / prev.scale;
    const worldY = (mouseY - prev.y) / prev.scale;
    
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    
    updateTarget({
      x: newX,
      y: newY,
      scale: newScale
    });
  };

  // Set scale directly (used by zoom buttons)
  const setScale = (newScale) => {
    updateTarget({
      ...targetRef.current,
      scale: Math.min(Math.max(newScale, 0.3), 2)
    });
  };

  // Set complete transform (used for initial setup)
  const setTransform = (transform, immediate = false) => {
    updateTarget(transform);
    if (immediate) {
      setCurrentTransform(transform);
    }
  };

  // Start fling/inertia animation
  const startFling = (vx, vy) => {
    if (prefersReducedMotion.current) return;
    if (isInertiaActiveRef.current) return;
    
    const speed = Math.sqrt(vx * vx + vy * vy);
    const minVelocity = 50; // pixels per second
    if (speed < minVelocity) return;
    
    const maxSpeed = 3000; // pixels per second
    if (speed > maxSpeed) {
      velocityRef.current = { vx: (vx / speed) * maxSpeed, vy: (vy / speed) * maxSpeed };
    } else {
      velocityRef.current = { vx, vy };
    }
    
    isInertiaActiveRef.current = true;
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000; // seconds
      lastTime = currentTime;
      
      const { vx: currentVx, vy: currentVy } = velocityRef.current;
      const currentSpeed = Math.sqrt(currentVx * currentVx + currentVy * currentVy);
      
      if (currentSpeed < 10) { // pixels per second
        isInertiaActiveRef.current = false;
        velocityRef.current = { vx: 0, vy: 0 };
        return;
      }
      
      // Apply velocity (convert from px/sec to px/frame)
      const deltaX = currentVx * dt;
      const deltaY = currentVy * dt;
      
      const newTarget = {
        ...targetRef.current,
        x: targetRef.current.x + deltaX,
        y: targetRef.current.y + deltaY
      };
      updateTarget(newTarget);
      
      setCurrentTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      // Frame-rate independent damping (exponential decay)
      const dampingPerSecond = 0.1; // Lower = slower decay
      const dampingFactor = Math.pow(dampingPerSecond, dt);
      
      velocityRef.current = {
        vx: currentVx * dampingFactor,
        vy: currentVy * dampingFactor
      };
      
      inertiaFrameRef.current = requestAnimationFrame(animate);
    };
    
    inertiaFrameRef.current = requestAnimationFrame(animate);
  };

  // Stop any active fling/inertia
  const stopFling = () => {
    if (inertiaFrameRef.current) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    isInertiaActiveRef.current = false;
    velocityRef.current = { vx: 0, vy: 0 };
  };

  return {
    currentTransform,
    targetTransform: targetRef.current,
    panBy,
    panTo,
    zoomAt,
    setScale,
    setTransform,
    startFling,
    stopFling
  };
}