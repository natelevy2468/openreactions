/**
 * React hook for optimized rendering integration
 * Demonstrates how to use spatial indexing and optimized rendering
 */

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { SpatialIndex } from '../utils/SpatialIndex.js';
import { OptimizedCanvasRenderer } from '../rendering/OptimizedCanvasRenderer.js';
import { debounce, rafThrottle, measurePerformance } from '../utils/PerformanceUtils.js';

export function useOptimizedRendering(canvasRef, hexRadius = 60) {
  // Create spatial index
  const spatialIndex = useMemo(() => new SpatialIndex(hexRadius), [hexRadius]);
  
  // Create renderer
  const renderer = useRef(null);
  
  // Performance monitors
  const renderMonitor = useRef({ count: 0, totalTime: 0 });
  
  // Initialize renderer when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !renderer.current) {
      renderer.current = new OptimizedCanvasRenderer(canvasRef.current, hexRadius);
    }
  }, [canvasRef, hexRadius]);
  
  // Update spatial index when data changes
  const updateSpatialIndex = useCallback((vertices, segments) => {
    measurePerformance('updateSpatialIndex', () => {
      spatialIndex.update(vertices, segments);
    });
  }, [spatialIndex]);
  
  // Optimized mouse move handler that uses spatial index
  const handleMouseMoveOptimized = useCallback((event, vertices, segments, offset, thresholds) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - offset.x;
    const y = event.clientY - rect.top - offset.y;
    
    // Use spatial index to find only nearby elements
    const nearbyVertices = spatialIndex.getNearbyVertices(x, y, thresholds.vertex);
    const nearbySegments = spatialIndex.getNearbySegments(x, y, thresholds.line);
    
    return {
      nearbyVertices,
      nearbySegments,
      closestVertex: nearbyVertices.length > 0 ? nearbyVertices[0] : null,
      closestSegment: nearbySegments.length > 0 ? nearbySegments[0] : null
    };
  }, [spatialIndex, canvasRef]);
  
  // Throttled mouse move handler
  const handleMouseMoveThrottled = useMemo(
    () => rafThrottle(handleMouseMoveOptimized),
    [handleMouseMoveOptimized]
  );
  
  // Optimized render function
  const renderOptimized = useCallback((renderData) => {
    if (!renderer.current) return;
    
    const start = performance.now();
    
    const {
      segments,
      vertices,
      vertexAtoms,
      offset,
      bondPreviews,
      hoverBondPreview,
      selectedSegments,
      selectedVertices,
      hoverSegmentIndex,
      mode,
      breakingZones
    } = renderData;
    
    // Update viewport
    renderer.current.updateViewport(offset);
    
    // Clear canvas
    renderer.current.clear();
    
    // Draw in layers (back to front)
    renderer.current.drawGridLines(segments, offset, hoverSegmentIndex, breakingZones);
    renderer.current.drawBondPreviews(bondPreviews, offset, hoverBondPreview);
    renderer.current.drawBonds(segments, offset, selectedSegments, hoverSegmentIndex, mode, vertexAtoms);
    renderer.current.drawAtoms(vertices, vertexAtoms, offset, selectedVertices, mode);
    
    // Track performance
    const duration = performance.now() - start;
    renderMonitor.current.count++;
    renderMonitor.current.totalTime += duration;
    
    if (renderMonitor.current.count % 60 === 0) {
      const avg = renderMonitor.current.totalTime / renderMonitor.current.count;
      if (avg > 16.67) {
        console.warn(`⚠️ Render performance: avg ${avg.toFixed(2)}ms over ${renderMonitor.current.count} frames`);
      }
      renderMonitor.current = { count: 0, totalTime: 0 };
    }
  }, []);
  
  // Debounced expensive operations
  const detectRingsDebounced = useMemo(
    () => debounce((detectRingsFn) => {
      measurePerformance('detectRings', detectRingsFn);
    }, 100),
    []
  );
  
  const analyzeGridBreakingDebounced = useMemo(
    () => debounce((analyzeFn) => {
      measurePerformance('analyzeGridBreaking', analyzeFn);
    }, 150),
    []
  );
  
  // Find elements in region (for selection box)
  const findElementsInRegion = useCallback((x1, y1, x2, y2) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Use spatial index to find vertices in region
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radius = Math.max(maxX - minX, maxY - minY) / 2;
    
    const nearbyVertices = spatialIndex.getNearbyVertices(centerX, centerY, radius);
    const verticesInRegion = nearbyVertices.filter(v => 
      v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY
    );
    
    // Similar for segments
    const nearbySegments = spatialIndex.getNearbySegments(centerX, centerY, radius);
    const segmentsInRegion = nearbySegments.filter(seg => {
      // Check if segment intersects with selection box
      return (seg.x1 >= minX && seg.x1 <= maxX && seg.y1 >= minY && seg.y1 <= maxY) ||
             (seg.x2 >= minX && seg.x2 <= maxX && seg.y2 >= minY && seg.y2 <= maxY);
    });
    
    return {
      vertices: verticesInRegion,
      segments: segmentsInRegion
    };
  }, [spatialIndex]);
  
  return {
    spatialIndex,
    renderer: renderer.current,
    updateSpatialIndex,
    handleMouseMoveOptimized: handleMouseMoveThrottled,
    renderOptimized,
    detectRingsDebounced,
    analyzeGridBreakingDebounced,
    findElementsInRegion
  };
}

/**
 * Example usage in main component:
 * 
 * const {
 *   updateSpatialIndex,
 *   handleMouseMoveOptimized,
 *   renderOptimized,
 *   detectRingsDebounced,
 *   analyzeGridBreakingDebounced
 * } = useOptimizedRendering(canvasRef, hexRadius);
 * 
 * // Update spatial index when vertices/segments change
 * useEffect(() => {
 *   updateSpatialIndex(vertices, segments);
 * }, [vertices, segments, updateSpatialIndex]);
 * 
 * // Use optimized mouse handler
 * const handleMouseMove = useCallback((event) => {
 *   const result = handleMouseMoveOptimized(event, vertices, segments, offset, {
 *     vertex: vertexThreshold,
 *     line: lineThreshold
 *   });
 *   
 *   if (result.closestVertex) {
 *     setHoverVertex(result.closestVertex);
 *   }
 * }, [handleMouseMoveOptimized, vertices, segments, offset]);
 * 
 * // Use optimized rendering
 * useEffect(() => {
 *   renderOptimized({
 *     segments,
 *     vertices,
 *     vertexAtoms,
 *     offset,
 *     // ... other render data
 *   });
 * }, [segments, vertices, vertexAtoms, offset, renderOptimized]);
 * 
 * // Use debounced expensive operations
 * useEffect(() => {
 *   detectRingsDebounced(() => detectRings());
 * }, [segments, vertices, detectRingsDebounced]);
 */ 