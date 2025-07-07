# Performance Optimization Plan for Chemical Drawing Application

## Critical Performance Issues Identified

### 1. **drawGrid() Function**
- Called on every state change
- Redraws entire canvas from scratch
- Loops through ALL segments and vertices multiple times
- Complex double bond rendering calculations for every bond

### 2. **Mouse Event Handlers**
- `handleMouseMove` checks ALL vertices/segments on every pixel movement
- No spatial filtering - checking elements far from mouse position
- Multiple nested loops in hover detection

### 3. **generateGrid() Function**
- Recreates entire grid structure on every change
- No incremental updates
- Expensive breaking zone calculations

### 4. **Ring Detection**
- Runs on every vertex/segment change
- No caching of results
- Expensive graph traversal algorithms

## Optimization Implementation Plan

### Phase 1: Spatial Indexing (Highest Priority)

#### 1.1 Create Spatial Index Structure
```javascript
// New file: utils/SpatialIndex.js
class SpatialIndex {
  constructor(cellSize = 60) {
    this.cellSize = cellSize;
    this.vertexGrid = new Map();
    this.segmentGrid = new Map();
  }
  
  // Add vertex to spatial grid
  addVertex(vertex, index) {
    const cellKey = this.getCellKey(vertex.x, vertex.y);
    if (!this.vertexGrid.has(cellKey)) {
      this.vertexGrid.set(cellKey, []);
    }
    this.vertexGrid.get(cellKey).push({ ...vertex, index });
  }
  
  // Get vertices near a point
  getNearbyVertices(x, y, radius) {
    const cells = this.getNearbyCells(x, y, radius);
    const vertices = [];
    for (const cell of cells) {
      const cellVertices = this.vertexGrid.get(cell) || [];
      vertices.push(...cellVertices);
    }
    return vertices;
  }
}
```

#### 1.2 Update Mouse Handlers to Use Spatial Index
- Replace full vertex loops with `spatialIndex.getNearbyVertices(x, y, threshold)`
- Reduce checks from O(n) to O(1) average case

### Phase 2: Canvas Rendering Optimization

#### 2.1 Implement Dirty Rectangle System
```javascript
// Track which regions need redrawing
const dirtyRegions = new Set();

// Mark region as dirty when something changes
function markDirty(x, y, width, height) {
  dirtyRegions.add({ x, y, width, height });
}

// Only redraw dirty regions
function drawGrid() {
  if (dirtyRegions.size === 0) return; // Nothing to redraw
  
  ctx.save();
  dirtyRegions.forEach(region => {
    ctx.clearRect(region.x, region.y, region.width, region.height);
    // Redraw only elements in this region
  });
  ctx.restore();
}
```

#### 2.2 Implement Viewport Culling
- Only render elements visible on screen
- Skip elements outside current viewport bounds

#### 2.3 Cache Rendered Elements
- Pre-render complex shapes (arrows, special bonds) to offscreen canvases
- Reuse cached renders instead of recalculating

### Phase 3: State Management Optimization

#### 3.1 Debounce Expensive Operations
```javascript
// Debounce ring detection
const debouncedDetectRings = useMemo(
  () => debounce(detectRings, 100),
  [detectRings]
);

// Debounce grid breaking analysis
const debouncedAnalyzeGridBreaking = useMemo(
  () => debounce(analyzeGridBreakingState, 150),
  [analyzeGridBreakingState]
);
```

#### 3.2 Memoize Expensive Calculations
```javascript
// Memoize bond direction calculations
const bondDirections = useMemo(() => {
  const directions = new Map();
  segments.forEach((seg, idx) => {
    if (seg.bondOrder > 0) {
      const key = `${seg.x1},${seg.y1},${seg.x2},${seg.y2}`;
      directions.set(key, calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2));
    }
  });
  return directions;
}, [segments]);
```

### Phase 4: Function Optimization

#### 4.1 Split Large Functions
- Break `drawGrid()` into smaller, focused functions:
  - `drawGridLines()`
  - `drawBonds()`
  - `drawAtoms()`
  - `drawArrows()`

#### 4.2 Early Exit Conditions
```javascript
function handleMouseMove(event) {
  // Early exit if nothing will change
  if (!isInteractiveMode && bondPreviews.length === 0) return;
  
  const { x, y } = getMousePosition(event);
  
  // Only check elements within interaction radius
  const nearbyVertices = spatialIndex.getNearbyVertices(x, y, vertexThreshold);
  const nearbySegments = spatialIndex.getNearbySegments(x, y, lineThreshold);
  
  // Process only nearby elements...
}
```

### Phase 5: Grid Generation Optimization

#### 5.1 Incremental Grid Updates
```javascript
// Instead of regenerating entire grid:
function updateGridIncremental(changes) {
  // Only update affected grid cells
  changes.forEach(change => {
    if (change.type === 'vertex_added') {
      updateGridAroundVertex(change.vertex);
    }
  });
}
```

#### 5.2 Cache Grid Structure
- Store base grid pattern
- Apply transformations instead of regenerating

### Phase 6: Web Workers for Heavy Computation

#### 6.1 Move Ring Detection to Worker
```javascript
// ringDetectionWorker.js
self.onmessage = function(e) {
  const { vertices, segments } = e.data;
  const rings = detectAllRings(vertices, segments);
  self.postMessage({ rings });
};
```

### Phase 7: React Performance Optimization

#### 7.1 Use React.memo for Components
```javascript
const MolecularProperties = React.memo(({ molecule }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for re-render decision
  return prevProps.molecule.id === nextProps.molecule.id;
});
```

#### 7.2 Optimize State Updates
```javascript
// Batch multiple state updates
unstable_batchedUpdates(() => {
  setVertices(newVertices);
  setSegments(newSegments);
  setVertexAtoms(newAtoms);
});
```

## Implementation Priority

1. **Spatial Indexing** (Week 1)
   - Biggest performance gain
   - Affects all interactions

2. **Canvas Rendering Optimization** (Week 2)
   - Dirty rectangles
   - Viewport culling

3. **Debouncing & Memoization** (Week 3)
   - Quick wins
   - Minimal code changes

4. **Function Splitting** (Week 4)
   - Improves maintainability
   - Enables further optimization

5. **Web Workers** (Week 5)
   - For CPU-intensive tasks
   - Non-blocking UI

## Expected Performance Improvements

- Mouse hover: **10-50x faster** (spatial indexing)
- Canvas rendering: **5-10x faster** (dirty rectangles)
- Grid generation: **3-5x faster** (incremental updates)
- Overall responsiveness: **10-20x improvement**

## Measurement & Monitoring

```javascript
// Add performance monitoring
const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  if (duration > 16) { // Longer than one frame
    console.warn(`${name} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
};

// Use in critical paths
const drawGrid = useCallback(() => {
  measurePerformance('drawGrid', () => {
    // Drawing logic
  });
}, [dependencies]);
``` 