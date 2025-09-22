/**
 * Canvas Layer Management Hook
 * 
 * Separates rendering into multiple layers for optimal performance:
 * - Static Layer: Bonds, atoms (rarely changes)
 * - Dynamic Layer: Hover effects, previews (changes frequently)
 * - UI Layer: Grid, selections, UI elements
 */

import { useRef, useCallback, useEffect } from 'react';

export const useCanvasLayers = (canvasWidth, canvasHeight) => {
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const uiCanvasRef = useRef(null);
  
  // Track what needs updating
  const needsUpdateRef = useRef({
    static: true,
    dynamic: true,
    ui: true
  });
  
  // Initialize canvas contexts
  const getContexts = useCallback(() => {
    return {
      static: staticCanvasRef.current?.getContext('2d'),
      dynamic: dynamicCanvasRef.current?.getContext('2d'),
      ui: uiCanvasRef.current?.getContext('2d')
    };
  }, []);
  
  // Mark layers as needing updates
  const markLayerDirty = useCallback((layer) => {
    if (layer === 'all') {
      needsUpdateRef.current = { static: true, dynamic: true, ui: true };
    } else {
      needsUpdateRef.current[layer] = true;
    }
  }, []);
  
  // Clear a specific layer
  const clearLayer = useCallback((layer) => {
    const contexts = getContexts();
    const ctx = contexts[layer];
    if (ctx) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, getContexts]);
  
  // Update static layer (bonds, atoms)
  const updateStaticLayer = useCallback((drawFunction) => {
    if (!needsUpdateRef.current.static) return;
    
    const ctx = getContexts().static;
    if (!ctx) return;
    
    clearLayer('static');
    drawFunction(ctx);
    needsUpdateRef.current.static = false;
  }, [getContexts, clearLayer]);
  
  // Update dynamic layer (hover effects, previews)
  const updateDynamicLayer = useCallback((drawFunction) => {
    if (!needsUpdateRef.current.dynamic) return;
    
    const ctx = getContexts().dynamic;
    if (!ctx) return;
    
    clearLayer('dynamic');
    drawFunction(ctx);
    needsUpdateRef.current.dynamic = false;
  }, [getContexts, clearLayer]);
  
  // Update UI layer (grid, selections)
  const updateUILayer = useCallback((drawFunction) => {
    if (!needsUpdateRef.current.ui) return;
    
    const ctx = getContexts().ui;
    if (!ctx) return;
    
    clearLayer('ui');
    drawFunction(ctx);
    needsUpdateRef.current.ui = false;
  }, [getContexts, clearLayer]);
  
  // Force update all layers
  const forceUpdateAll = useCallback(() => {
    markLayerDirty('all');
  }, [markLayerDirty]);
  
  // Set canvas dimensions when they change
  useEffect(() => {
    const canvases = [staticCanvasRef.current, dynamicCanvasRef.current, uiCanvasRef.current];
    canvases.forEach(canvas => {
      if (canvas) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
    });
    forceUpdateAll();
  }, [canvasWidth, canvasHeight, forceUpdateAll]);
  
  return {
    staticCanvasRef,
    dynamicCanvasRef,
    uiCanvasRef,
    updateStaticLayer,
    updateDynamicLayer,
    updateUILayer,
    markLayerDirty,
    clearLayer,
    forceUpdateAll,
    getContexts
  };
};
