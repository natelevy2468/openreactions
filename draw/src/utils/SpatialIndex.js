/**
 * Spatial Index for Fast Hit Testing
 * 
 * Converts O(n) linear searches to O(1) average case lookups
 * by partitioning space into a grid and only checking nearby elements
 */

export class SpatialIndex {
  constructor(cellSize = 60) {
    this.cellSize = cellSize;
    this.vertexGrid = new Map();
    this.segmentGrid = new Map();
    this.clear();
  }
  
  // Clear all indexed data
  clear() {
    this.vertexGrid.clear();
    this.segmentGrid.clear();
  }
  
  // Get cell key for coordinates
  getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  // Get all cell keys within a radius
  getNearbyCells(x, y, radius) {
    const cells = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(x / this.cellSize);
    const centerY = Math.floor(y / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        cells.push(`${centerX + dx},${centerY + dy}`);
      }
    }
    
    return cells;
  }
  
  // Add vertex to spatial grid
  addVertex(vertex, index) {
    const cellKey = this.getCellKey(vertex.x, vertex.y);
    if (!this.vertexGrid.has(cellKey)) {
      this.vertexGrid.set(cellKey, []);
    }
    this.vertexGrid.get(cellKey).push({ ...vertex, index });
  }
  
  // Add segment to spatial grid (indexed by midpoint and endpoints)
  addSegment(segment, index) {
    // Index by midpoint
    const midX = (segment.x1 + segment.x2) / 2;
    const midY = (segment.y1 + segment.y2) / 2;
    const midCellKey = this.getCellKey(midX, midY);
    
    if (!this.segmentGrid.has(midCellKey)) {
      this.segmentGrid.set(midCellKey, []);
    }
    this.segmentGrid.get(midCellKey).push({ ...segment, index });
    
    // Also index by endpoints to catch segments that span multiple cells
    const startCellKey = this.getCellKey(segment.x1, segment.y1);
    const endCellKey = this.getCellKey(segment.x2, segment.y2);
    
    if (startCellKey !== midCellKey) {
      if (!this.segmentGrid.has(startCellKey)) {
        this.segmentGrid.set(startCellKey, []);
      }
      this.segmentGrid.get(startCellKey).push({ ...segment, index });
    }
    
    if (endCellKey !== midCellKey && endCellKey !== startCellKey) {
      if (!this.segmentGrid.has(endCellKey)) {
        this.segmentGrid.set(endCellKey, []);
      }
      this.segmentGrid.get(endCellKey).push({ ...segment, index });
    }
  }
  
  // Get vertices near a point within radius
  getNearbyVertices(x, y, radius) {
    const cells = this.getNearbyCells(x, y, radius);
    const vertices = [];
    const seen = new Set(); // Prevent duplicates
    
    for (const cellKey of cells) {
      const cellVertices = this.vertexGrid.get(cellKey) || [];
      for (const vertex of cellVertices) {
        if (!seen.has(vertex.index)) {
          const distance = Math.sqrt(
            Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2)
          );
          if (distance <= radius) {
            vertices.push(vertex);
            seen.add(vertex.index);
          }
        }
      }
    }
    
    return vertices;
  }
  
  // Get segments near a point within radius
  getNearbySegments(x, y, radius) {
    const cells = this.getNearbyCells(x, y, radius);
    const segments = [];
    const seen = new Set(); // Prevent duplicates
    
    for (const cellKey of cells) {
      const cellSegments = this.segmentGrid.get(cellKey) || [];
      for (const segment of cellSegments) {
        if (!seen.has(segment.index)) {
          // Calculate distance from point to line segment
          const A = x - segment.x1;
          const B = y - segment.y1;
          const C = segment.x2 - segment.x1;
          const D = segment.y2 - segment.y1;
          const dot = A * C + B * D;
          const len_sq = C * C + D * D;
          let t = dot / len_sq;
          t = Math.max(0, Math.min(1, t));
          const projX = segment.x1 + t * C;
          const projY = segment.y1 + t * D;
          const dx = x - projX;
          const dy = y - projY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= radius) {
            segments.push(segment);
            seen.add(segment.index);
          }
        }
      }
    }
    
    return segments;
  }
  
  // Update the entire index with new data
  update(vertices, segments) {
    this.clear();
    
    // Index all vertices
    vertices.forEach((vertex, index) => {
      this.addVertex(vertex, index);
    });
    
    // Index all segments
    segments.forEach((segment, index) => {
      this.addSegment(segment, index);
    });
  }
  
  // Get statistics about the index
  getStats() {
    return {
      vertexCells: this.vertexGrid.size,
      segmentCells: this.segmentGrid.size,
      totalVertices: Array.from(this.vertexGrid.values()).reduce((sum, arr) => sum + arr.length, 0),
      totalSegments: Array.from(this.segmentGrid.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

// Hook for using spatial index in React components
import { useRef, useMemo, useCallback } from 'react';

export const useSpatialIndex = (vertices, segments, cellSize = 60) => {
  const spatialIndexRef = useRef(new SpatialIndex(cellSize));
  
  // Update index when data changes
  useMemo(() => {
    spatialIndexRef.current.update(vertices, segments);
  }, [vertices, segments]);
  
  // Fast vertex lookup
  const findNearbyVertices = useCallback((x, y, radius) => {
    return spatialIndexRef.current.getNearbyVertices(x, y, radius);
  }, []);
  
  // Fast segment lookup
  const findNearbySegments = useCallback((x, y, radius) => {
    return spatialIndexRef.current.getNearbySegments(x, y, radius);
  }, []);
  
  // Find closest vertex within threshold
  const findClosestVertex = useCallback((x, y, threshold) => {
    const candidates = spatialIndexRef.current.getNearbyVertices(x, y, threshold);
    
    let closestVertex = null;
    let minDistance = threshold;
    
    for (const vertex of candidates) {
      const distance = Math.sqrt(
        Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestVertex = vertex;
      }
    }
    
    return closestVertex;
  }, []);
  
  // Find closest segment within threshold
  const findClosestSegment = useCallback((x, y, threshold) => {
    const candidates = spatialIndexRef.current.getNearbySegments(x, y, threshold);
    
    let closestSegment = null;
    let closestIndex = -1;
    let minDistance = threshold;
    
    for (const segment of candidates) {
      // Calculate distance from point to line segment
      const A = x - segment.x1;
      const B = y - segment.y1;
      const C = segment.x2 - segment.x1;
      const D = segment.y2 - segment.y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let t = dot / len_sq;
      t = Math.max(0, Math.min(1, t));
      const projX = segment.x1 + t * C;
      const projY = segment.y1 + t * D;
      const dx = x - projX;
      const dy = y - projY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSegment = segment;
        closestIndex = segment.index;
      }
    }
    
    return { segment: closestSegment, index: closestIndex };
  }, []);
  
  return {
    findNearbyVertices,
    findNearbySegments,
    findClosestVertex,
    findClosestSegment,
    getStats: () => spatialIndexRef.current.getStats()
  };
};