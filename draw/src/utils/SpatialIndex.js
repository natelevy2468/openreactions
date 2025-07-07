/**
 * SpatialIndex - Efficient spatial indexing for fast element lookups
 * 
 * This class provides O(1) average case lookups for vertices and segments
 * based on their spatial position, dramatically improving performance
 * compared to O(n) linear searches through all elements.
 */

export class SpatialIndex {
  constructor(cellSize = 60) {
    this.cellSize = cellSize;
    this.vertexGrid = new Map();
    this.segmentGrid = new Map();
    this.clear();
  }

  /**
   * Clear all spatial data
   */
  clear() {
    this.vertexGrid.clear();
    this.segmentGrid.clear();
  }

  /**
   * Get the grid cell key for a position
   */
  getCellKey(x, y) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  /**
   * Get all cell keys that intersect with a circle
   */
  getNearbyCells(centerX, centerY, radius) {
    const cells = new Set();
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerGridX = Math.floor(centerX / this.cellSize);
    const centerGridY = Math.floor(centerY / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const gridX = centerGridX + dx;
        const gridY = centerGridY + dy;
        cells.add(`${gridX},${gridY}`);
      }
    }

    return cells;
  }

  /**
   * Get all cell keys that a line segment passes through
   */
  getCellsForSegment(x1, y1, x2, y2) {
    const cells = new Set();
    
    // Get bounding box cells
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    const minGridX = Math.floor(minX / this.cellSize);
    const maxGridX = Math.floor(maxX / this.cellSize);
    const minGridY = Math.floor(minY / this.cellSize);
    const maxGridY = Math.floor(maxY / this.cellSize);
    
    // Add all cells in bounding box (simple but effective for chemical bonds)
    for (let gx = minGridX; gx <= maxGridX; gx++) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        cells.add(`${gx},${gy}`);
      }
    }
    
    return cells;
  }

  /**
   * Add a vertex to the spatial index
   */
  addVertex(vertex, index) {
    const cellKey = this.getCellKey(vertex.x, vertex.y);
    if (!this.vertexGrid.has(cellKey)) {
      this.vertexGrid.set(cellKey, []);
    }
    this.vertexGrid.get(cellKey).push({ ...vertex, index });
  }

  /**
   * Add multiple vertices at once (more efficient)
   */
  addVertices(vertices) {
    this.vertexGrid.clear();
    vertices.forEach((vertex, index) => {
      this.addVertex(vertex, index);
    });
  }

  /**
   * Add a segment to the spatial index
   */
  addSegment(segment, index) {
    const cells = this.getCellsForSegment(segment.x1, segment.y1, segment.x2, segment.y2);
    cells.forEach(cellKey => {
      if (!this.segmentGrid.has(cellKey)) {
        this.segmentGrid.set(cellKey, []);
      }
      this.segmentGrid.get(cellKey).push({ ...segment, index });
    });
  }

  /**
   * Add multiple segments at once (more efficient)
   */
  addSegments(segments) {
    this.segmentGrid.clear();
    segments.forEach((segment, index) => {
      this.addSegment(segment, index);
    });
  }

  /**
   * Get vertices within a radius of a point
   */
  getNearbyVertices(x, y, radius) {
    const cells = this.getNearbyCells(x, y, radius);
    const vertices = [];
    const radiusSq = radius * radius;
    
    for (const cellKey of cells) {
      const cellVertices = this.vertexGrid.get(cellKey) || [];
      for (const vertex of cellVertices) {
        const dx = vertex.x - x;
        const dy = vertex.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= radiusSq) {
          vertices.push({
            ...vertex,
            distance: Math.sqrt(distSq)
          });
        }
      }
    }
    
    return vertices;
  }

  /**
   * Get the closest vertex to a point within a maximum distance
   */
  getClosestVertex(x, y, maxDistance) {
    const nearbyVertices = this.getNearbyVertices(x, y, maxDistance);
    if (nearbyVertices.length === 0) return null;
    
    return nearbyVertices.reduce((closest, vertex) => {
      return vertex.distance < closest.distance ? vertex : closest;
    });
  }

  /**
   * Get segments within a radius of a point
   */
  getNearbySegments(x, y, radius) {
    const cells = this.getNearbyCells(x, y, radius);
    const segments = [];
    const seenIndices = new Set();
    
    for (const cellKey of cells) {
      const cellSegments = this.segmentGrid.get(cellKey) || [];
      for (const segment of cellSegments) {
        // Avoid duplicates
        if (seenIndices.has(segment.index)) continue;
        seenIndices.add(segment.index);
        
        // Calculate distance from point to line segment
        const dist = this.pointToSegmentDistance(x, y, segment.x1, segment.y1, segment.x2, segment.y2);
        if (dist <= radius) {
          segments.push({
            ...segment,
            distance: dist
          });
        }
      }
    }
    
    return segments;
  }

  /**
   * Calculate distance from a point to a line segment
   */
  pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Update the entire spatial index with new data
   */
  update(vertices, segments) {
    this.clear();
    this.addVertices(vertices);
    this.addSegments(segments);
  }

  /**
   * Get statistics about the spatial index
   */
  getStats() {
    let vertexCellCount = 0;
    let maxVerticesPerCell = 0;
    let totalVertices = 0;
    
    this.vertexGrid.forEach(vertices => {
      vertexCellCount++;
      maxVerticesPerCell = Math.max(maxVerticesPerCell, vertices.length);
      totalVertices += vertices.length;
    });
    
    let segmentCellCount = 0;
    let maxSegmentsPerCell = 0;
    let totalSegments = 0;
    
    this.segmentGrid.forEach(segments => {
      segmentCellCount++;
      maxSegmentsPerCell = Math.max(maxSegmentsPerCell, segments.length);
      totalSegments += segments.length;
    });
    
    return {
      vertexCellCount,
      maxVerticesPerCell,
      totalVertices,
      avgVerticesPerCell: totalVertices / vertexCellCount || 0,
      segmentCellCount,
      maxSegmentsPerCell,
      totalSegments,
      avgSegmentsPerCell: totalSegments / segmentCellCount || 0
    };
  }
}

/**
 * Factory function to create and initialize a spatial index
 */
export function createSpatialIndex(vertices = [], segments = [], cellSize = 60) {
  const index = new SpatialIndex(cellSize);
  index.update(vertices, segments);
  return index;
} 