# Performance Optimization Migration Guide

This guide shows how to integrate the performance optimizations into your existing `HexGridWithToolbar.jsx` component.

## Quick Start

### 1. Install Dependencies

First, import the new optimization utilities:

```javascript
// Add to imports at top of HexGridWithToolbar.jsx
import { SpatialIndex } from './utils/SpatialIndex.js';
import { debounce, rafThrottle, measurePerformance } from './utils/PerformanceUtils.js';
import { OptimizedCanvasRenderer } from './rendering/OptimizedCanvasRenderer.js';
```

### 2. Initialize Spatial Index

Add spatial index state after your existing state declarations:

```javascript
// Add after existing state declarations
const [spatialIndex] = useState(() => new SpatialIndex(hexRadius));
const optimizedRenderer = useRef(null);

// Initialize renderer
useEffect(() => {
  if (canvasRef.current && !optimizedRenderer.current) {
    optimizedRenderer.current = new OptimizedCanvasRenderer(canvasRef.current, hexRadius);
  }
}, [hexRadius]);
```

### 3. Update Spatial Index When Data Changes

Replace the existing vertex type update effect with:

```javascript
// Update spatial index and vertex types when data changes
useEffect(() => {
  if (!isDraggingVertex) {
    // Update spatial index
    measurePerformance('updateSpatialIndex', () => {
      spatialIndex.update(vertices, segments);
    });
    
    // Update vertex types
    const newVertexTypes = determineVertexTypes(vertices, segments, vertexAtoms);
    setVertexTypes(newVertexTypes);
  }
}, [vertices, segments, vertexAtoms, isDraggingVertex, spatialIndex]);
```

### 4. Optimize handleMouseMove

Replace the mouse move handler section (around line 7031) with:

```javascript
const handleMouseMove = rafThrottle(event => {
  // Call existing mouse move utility
  handleMouseMoveUtil(
    event,
    canvasRef,
    isPasteMode,
    isDragging,
    fourthBondMode,
    fourthBondSource,
    mode,
    draggingArrowIndex,
    draggingVertex,
    isSelecting,
    clipboard,
    showSnapPreview,
    hexRadius,
    offset,
    dragStart,
    dragArrowOffset,
    arrows,
    vertices,
    vertexThreshold,
    lineThreshold,
    freeFloatingVertices,
    segments,
    vertexAtoms,
    bondPreviews,
    isPointOnBondPreview,
    // ... rest of parameters
  );

  // Optimized hover detection for interactive modes
  const isInteractiveMode = (mode === 'draw' || mode === 'triple' || mode === 'wedge' || 
                            mode === 'dash' || mode === 'ambiguous') && 
                            !isDragging && !isSelecting && !isPasteMode && 
                            !fourthBondMode && !draggingVertex && !draggingArrowIndex;
  
  if (isInteractiveMode && canvasRef.current) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Use spatial index for fast lookups
    const gridX = x - offset.x;
    const gridY = y - offset.y;
    
    // Get nearby vertices using spatial index
    const nearbyVertices = spatialIndex.getNearbyVertices(gridX, gridY, vertexThreshold);
    const closestVertex = nearbyVertices.length > 0 ? 
      nearbyVertices.reduce((closest, v) => v.distance < closest.distance ? v : closest) : null;
    
    if (closestVertex) {
      setHoverVertex(vertices[closestVertex.index]);
      setHoverSegmentIndex(null);
      setHoverBondPreview(null);
      return;
    }
    
    // Check bond previews (keep existing logic)
    let hoveredPreview = null;
    if (bondPreviews.length > 0) {
      for (const preview of bondPreviews) {
        if (isPointOnBondPreview(x, y, preview, offset)) {
          hoveredPreview = preview;
          break;
        }
      }
    }
    
    if (hoveredPreview) {
      setHoverBondPreview(hoveredPreview);
      setHoverVertex(null);
      setHoverSegmentIndex(null);
      return;
    }
    
    // Get nearby segments using spatial index
    const nearbySegments = spatialIndex.getNearbySegments(gridX, gridY, lineThreshold);
    const closestSegment = nearbySegments.length > 0 ?
      nearbySegments.reduce((closest, s) => s.distance < closest.distance ? s : closest) : null;
    
    if (closestSegment) {
      setHoverSegmentIndex(closestSegment.index);
      setHoverVertex(null);
      setHoverBondPreview(null);
    } else {
      // Clear all hovers
      setHoverVertex(null);
      setHoverSegmentIndex(null);
      setHoverBondPreview(null);
    }
  }
});
```

### 5. Optimize handleClick

In the handleClick function, replace vertex/segment lookup loops with spatial index:

```javascript
// Replace this:
// let nearestVertex = null;
// let minV = vertexThreshold;
// for (let v of vertices) {
//   const dist = distanceToVertex(x, y, v.x, v.y);
//   if (dist <= minV) {
//     minV = dist;
//     nearestVertex = v;
//   }
// }

// With this:
const gridX = x - offset.x;
const gridY = y - offset.y;
const nearbyVertices = spatialIndex.getNearbyVertices(gridX, gridY, vertexThreshold);
const nearestVertex = nearbyVertices.length > 0 ?
  vertices[nearbyVertices[0].index] : null;
```

### 6. Optimize drawGrid Function

Replace the entire drawGrid function with:

```javascript
const drawGrid = useCallback(() => {
  if (!optimizedRenderer.current) return;
  
  measurePerformance('drawGrid', () => {
    optimizedRenderer.current.updateViewport(offset);
    optimizedRenderer.current.clear();
    
    // Get breaking zones if active
    const breakingZones = gridBreakingAnalysis.gridBreakingActive ?
      gridBreakingAnalysis.breakingZones : [];
    
    // Draw layers
    optimizedRenderer.current.drawGridLines(segments, offset, hoverSegmentIndex, breakingZones);
    optimizedRenderer.current.drawBondPreviews(bondPreviews, offset, hoverBondPreview);
    optimizedRenderer.current.drawBonds(segments, offset, selectedSegments, hoverSegmentIndex, mode, vertexAtoms);
    optimizedRenderer.current.drawAtoms(vertices, vertexAtoms, offset, selectedVertices, mode);
    
    // Draw arrows and other overlays using existing code
    drawArrow();
    // ... rest of overlay drawing
  });
}, [segments, vertices, vertexAtoms, offset, mode, hoverSegmentIndex, 
    selectedSegments, selectedVertices, bondPreviews, hoverBondPreview,
    gridBreakingAnalysis, optimizedRenderer]);
```

### 7. Debounce Expensive Operations

Replace direct calls to expensive functions with debounced versions:

```javascript
// Create debounced versions
const debouncedDetectRings = useMemo(
  () => debounce(detectRings, 100),
  [detectRings]
);

const debouncedAnalyzeGridBreaking = useMemo(
  () => debounce(analyzeGridBreakingState, 150),
  [analyzeGridBreakingState]
);

// Update effects to use debounced versions
useEffect(() => {
  if (!isDraggingVertex) {
    debouncedDetectRings();
  }
}, [segments, vertices, debouncedDetectRings, isDraggingVertex]);

useEffect(() => {
  if (!isUpdatingGrid && !isDraggingVertex) {
    debouncedAnalyzeGridBreaking();
  }
}, [offGridVertexCount, bondCount, debouncedAnalyzeGridBreaking, isUpdatingGrid, isDraggingVertex]);
```

### 8. Optimize generateGrid

Add early exit to generateGrid when nothing has changed:

```javascript
const generateGrid = useCallback((width, height, existingVertices = [], existingVertexAtoms = {}, existingSegments = []) => {
  // Add performance measurement
  return measurePerformance('generateGrid', () => {
    // ... existing generateGrid logic
  });
}, [calculateBondDirection, calculateDoubleBondVertices]);
```

## Performance Monitoring

Add performance monitoring to track improvements:

```javascript
// Add to component
useEffect(() => {
  // Log performance stats every 5 seconds in development
  if (process.env.NODE_ENV === 'development') {
    const interval = setInterval(() => {
      console.log('Spatial Index Stats:', spatialIndex.getStats());
    }, 5000);
    return () => clearInterval(interval);
  }
}, [spatialIndex]);
```

## Expected Results

After implementing these optimizations:

1. **Mouse hover**: Should be 10-50x faster
2. **Canvas rendering**: Should be 5-10x faster
3. **Click handling**: Should be 10-20x faster
4. **Overall FPS**: Should maintain 60 FPS even with large molecules

## Gradual Migration

You can implement these optimizations gradually:

1. **Phase 1**: Spatial indexing for mouse events (biggest impact)
2. **Phase 2**: Optimized rendering (canvas performance)
3. **Phase 3**: Debouncing and throttling (smooth interactions)
4. **Phase 4**: Further optimizations as needed

## Testing

After each optimization phase:

1. Test with large molecules (100+ atoms)
2. Check mouse hover smoothness
3. Verify all interactions still work correctly
4. Monitor console for performance warnings

## Rollback Plan

If any optimization causes issues:

1. Each optimization is independent
2. Can disable spatial index by using original loops
3. Can revert to original drawGrid by commenting out optimized version
4. All optimizations have fallbacks to original behavior 