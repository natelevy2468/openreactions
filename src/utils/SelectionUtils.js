// Selection and copy/paste utility functions

// Helper functions for selection box intersection
export const isPointInRect = (px, py, x1, y1, x2, y2) => {
  return px >= x1 && px <= x2 && py >= y1 && py <= y2;
};

export const isLineIntersectingRect = (lx1, ly1, lx2, ly2, rx1, ry1, rx2, ry2) => {
  // Check if either endpoint is inside the rectangle
  if (isPointInRect(lx1, ly1, rx1, ry1, rx2, ry2) || 
      isPointInRect(lx2, ly2, rx1, ry1, rx2, ry2)) {
    return true;
  }
  
  // Check if line intersects with any edge of the rectangle
  const intersectsEdge = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // parallel lines
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  
  // Check intersection with all four edges of rectangle
  return intersectsEdge(lx1, ly1, lx2, ly2, rx1, ry1, rx2, ry1) || // top edge
         intersectsEdge(lx1, ly1, lx2, ly2, rx2, ry1, rx2, ry2) || // right edge
         intersectsEdge(lx1, ly1, lx2, ly2, rx2, ry2, rx1, ry2) || // bottom edge
         intersectsEdge(lx1, ly1, lx2, ly2, rx1, ry2, rx1, ry1);   // left edge
};

// Function to update selection based on current selection box
export const updateSelection = (
  isSelecting,
  selectionStart,
  selectionEnd,
  segments,
  vertices,
  arrows,
  offset,
  setSelectedSegments,
  setSelectedVertices,
  setSelectedArrows,
  setSelectionBounds
) => {
  if (!isSelecting) return;
  
  const x1 = Math.min(selectionStart.x, selectionEnd.x);
  const y1 = Math.min(selectionStart.y, selectionEnd.y);
  const x2 = Math.max(selectionStart.x, selectionEnd.x);
  const y2 = Math.max(selectionStart.y, selectionEnd.y);
  
  const newSelectedSegments = new Set();
  const newSelectedVertices = new Set();
  const newSelectedArrows = new Set();
  
  // Check segments
  segments.forEach((segment, index) => {
    const sx1 = segment.x1 + offset.x;
    const sy1 = segment.y1 + offset.y;
    const sx2 = segment.x2 + offset.x;
    const sy2 = segment.y2 + offset.y;
    
    if (isLineIntersectingRect(sx1, sy1, sx2, sy2, x1, y1, x2, y2)) {
      newSelectedSegments.add(index);
    }
  });
  
  // Check vertices
  vertices.forEach((vertex, index) => {
    const vx = vertex.x + offset.x;
    const vy = vertex.y + offset.y;
    
    if (isPointInRect(vx, vy, x1, y1, x2, y2)) {
      newSelectedVertices.add(index);
    }
  });
  
  // Check arrows
  arrows.forEach((arrow, index) => {
    const ax1 = arrow.x1 + offset.x;
    const ay1 = arrow.y1 + offset.y;
    const ax2 = arrow.x2 + offset.x;
    const ay2 = arrow.y2 + offset.y;
    
    if (isLineIntersectingRect(ax1, ay1, ax2, ay2, x1, y1, x2, y2)) {
      newSelectedArrows.add(index);
    }
  });
  
  setSelectedSegments(newSelectedSegments);
  setSelectedVertices(newSelectedVertices);
  setSelectedArrows(newSelectedArrows);
  
  // Store selection bounds if any items are selected
  if (newSelectedSegments.size > 0 || newSelectedVertices.size > 0 || newSelectedArrows.size > 0) {
    setSelectionBounds({ x1, y1, x2, y2 });
  } else {
    setSelectionBounds(null);
  }
};

// Clear all selections
export const clearSelection = (
  setSelectedSegments,
  setSelectedVertices,
  setSelectedArrows,
  setSelectionBounds
) => {
  setSelectedSegments(new Set());
  setSelectedVertices(new Set());
  setSelectedArrows(new Set());
  setSelectionBounds(null);
};

// Copy selected items to clipboard
export const copySelection = (
  selectedSegments,
  selectedVertices,
  selectedArrows,
  segments,
  vertices,
  vertexAtoms,
  vertexTypes,
  arrows,
  getIfTop,
  setClipboard,
  setIsPasteMode,
  clearSelectionFn
) => {
  if (selectedSegments.size === 0 && selectedVertices.size === 0 && selectedArrows.size === 0) {
    return; // Nothing to copy
  }
  
  // Calculate bounds of selected items
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  // Include selected vertices in bounds
  selectedVertices.forEach(vertexIndex => {
    const vertex = vertices[vertexIndex];
    if (vertex) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }
  });
  
  // Include vertices of selected segments in bounds
  selectedSegments.forEach(segmentIndex => {
    const segment = segments[segmentIndex];
    if (segment) {
      minX = Math.min(minX, segment.x1);
      maxX = Math.max(maxX, segment.x1);
      minY = Math.min(minY, segment.y1);
      maxY = Math.max(maxY, segment.y1);
      minX = Math.min(minX, segment.x2);
      maxX = Math.max(maxX, segment.x2);
      minY = Math.min(minY, segment.y2);
      maxY = Math.max(maxY, segment.y2);
    }
  });
  
  // Include arrows in bounds
  selectedArrows.forEach(arrowIndex => {
    const arrow = arrows[arrowIndex];
    if (arrow) {
      minX = Math.min(minX, arrow.x1, arrow.x2);
      maxX = Math.max(maxX, arrow.x1, arrow.x2);
      minY = Math.min(minY, arrow.y1, arrow.y2);
      maxY = Math.max(maxY, arrow.y1, arrow.y2);
      
      // Include peak positions for curved arrows
      if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
        minX = Math.min(minX, arrow.peakX);
        maxX = Math.max(maxX, arrow.peakX);
        minY = Math.min(minY, arrow.peakY);
        maxY = Math.max(maxY, arrow.peakY);
      }
    }
  });
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Create a map of vertices that need to be copied (either selected or part of selected segments)
  const verticesToCopy = new Map(); // Map from old vertex ID to new index in copied array
  const copiedVertices = [];
  
  // Add selected vertices
  selectedVertices.forEach(vertexIndex => {
    const vertex = vertices[vertexIndex];
    if (vertex) {
      const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
      if (!verticesToCopy.has(vertexKey)) {
        verticesToCopy.set(vertexKey, copiedVertices.length);
        copiedVertices.push({
          x: vertex.x - centerX,
          y: vertex.y - centerY,
          atom: vertexAtoms[vertexKey] || null,
          type: vertexTypes[vertexKey] || null,
          isTop: getIfTop(vertex, segments) // Preserve orientation information
        });
      }
    }
  });
  
  // Add vertices from selected segments
  selectedSegments.forEach(segmentIndex => {
    const segment = segments[segmentIndex];
    if (segment) {
      // Find vertices at segment endpoints
      const v1 = vertices.find(v => Math.abs(v.x - segment.x1) < 0.01 && Math.abs(v.y - segment.y1) < 0.01);
      const v2 = vertices.find(v => Math.abs(v.x - segment.x2) < 0.01 && Math.abs(v.y - segment.y2) < 0.01);
      
      if (v1) {
        const v1Key = `${v1.x.toFixed(2)},${v1.y.toFixed(2)}`;
        if (!verticesToCopy.has(v1Key)) {
          verticesToCopy.set(v1Key, copiedVertices.length);
          copiedVertices.push({
            x: v1.x - centerX,
            y: v1.y - centerY,
            atom: vertexAtoms[v1Key] || null,
            type: vertexTypes[v1Key] || null,
            isTop: getIfTop(v1, segments) // Preserve orientation information
          });
        }
      }
      
      if (v2) {
        const v2Key = `${v2.x.toFixed(2)},${v2.y.toFixed(2)}`;
        if (!verticesToCopy.has(v2Key)) {
          verticesToCopy.set(v2Key, copiedVertices.length);
          copiedVertices.push({
            x: v2.x - centerX,
            y: v2.y - centerY,
            atom: vertexAtoms[v2Key] || null,
            type: vertexTypes[v2Key] || null,
            isTop: getIfTop(v2, segments) // Preserve orientation information
          });
        }
      }
    }
  });
  
  // Copy segments with updated vertex references
  const copiedSegments = [];
  selectedSegments.forEach(segmentIndex => {
    const segment = segments[segmentIndex];
    if (segment && segment.bondOrder > 0) {
      // Find vertex indices for segment endpoints
      const v1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
      const v2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
      
      if (verticesToCopy.has(v1Key) && verticesToCopy.has(v2Key)) {
        copiedSegments.push({
          vertex1Index: verticesToCopy.get(v1Key),
          vertex2Index: verticesToCopy.get(v2Key),
          bondType: segment.bondType,
          bondOrder: segment.bondOrder,
          bondDirection: segment.bondDirection,
          direction: segment.direction,
          upperVertex: segment.upperVertex,
          lowerVertex: segment.lowerVertex,
          flipSmallerLine: segment.flipSmallerLine
        });
      }
    }
  });
  
  // Copy arrows with relative positions
  const copiedArrows = [];
  selectedArrows.forEach(arrowIndex => {
    const arrow = arrows[arrowIndex];
    if (arrow) {
      const copiedArrow = {
        x1: arrow.x1 - centerX,
        y1: arrow.y1 - centerY,
        x2: arrow.x2 - centerX,
        y2: arrow.y2 - centerY,
        type: arrow.type
      };
      
      // Copy additional properties for different arrow types
      if (arrow.type === 'equilibrium') {
        if (arrow.topX1 !== undefined) copiedArrow.topX1 = arrow.topX1 - centerX;
        if (arrow.topX2 !== undefined) copiedArrow.topX2 = arrow.topX2 - centerX;
        if (arrow.bottomX1 !== undefined) copiedArrow.bottomX1 = arrow.bottomX1 - centerX;
        if (arrow.bottomX2 !== undefined) copiedArrow.bottomX2 = arrow.bottomX2 - centerX;
      } else if (arrow.type && arrow.type.startsWith('curve')) {
        if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
          copiedArrow.peakX = arrow.peakX - centerX;
          copiedArrow.peakY = arrow.peakY - centerY;
        }
      }
      
      copiedArrows.push(copiedArrow);
    }
  });
  
  setClipboard({
    vertices: copiedVertices,
    segments: copiedSegments,
    arrows: copiedArrows,
    bounds: {
      minX: minX - centerX,
      maxX: maxX - centerX,
      minY: minY - centerY,
      maxY: maxY - centerY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: 0,
      centerY: 0
    }
  });
  
  // Immediately enter paste mode after copying
  setIsPasteMode(true);
  clearSelectionFn();
};

// Cancel paste mode
export const cancelPasteMode = (setIsPasteMode, setSnapAlignment) => {
  setIsPasteMode(false);
  setSnapAlignment(null);
};

// Paste clipboard contents at given position
export const pasteAtPosition = (
  x,
  y,
  clipboard,
  snapAlignment,
  showSnapPreview,
  offset,
  vertices,
  vertexAtoms,
  vertexTypes,
  segments,
  arrows,
  calculateDoubleBondVertices,
  setVertices,
  setVertexAtoms,
  setVertexTypes,
  setSegments,
  setArrows,
  setIsPasteMode,
  setSnapAlignment
) => {
  if (!clipboard) return;
  
  // Use grid snapping if available and enabled
  const useSnapping = snapAlignment && showSnapPreview && snapAlignment.snappedCount > 0; // Use snapping if any vertices can snap
  let offsetX, offsetY;
  
  if (useSnapping) {
    offsetX = x - offset.x + snapAlignment.translation.x;
    offsetY = y - offset.y + snapAlignment.translation.y;
  } else {
    offsetX = x - offset.x;
    offsetY = y - offset.y;
  }
  
  // Create new vertices (or map to existing grid vertices)
  const newVertexMap = new Map(); // Map from clipboard index to new vertex
  const newVertices = [...vertices];
  const newVertexAtoms = { ...vertexAtoms };
  const newVertexTypes = { ...vertexTypes };
  
  clipboard.vertices.forEach((clipVertex, index) => {
    let targetVertex;
    
    if (useSnapping && snapAlignment.vertexMappings.has(index)) {
      // Use existing grid vertex
      targetVertex = snapAlignment.vertexMappings.get(index);
      newVertexMap.set(index, targetVertex);
      
      // Update existing grid vertex with pasted atom data
      const vertexKey = `${targetVertex.x.toFixed(2)},${targetVertex.y.toFixed(2)}`;
      if (clipVertex.atom) {
        newVertexAtoms[vertexKey] = clipVertex.atom;
      }
      if (clipVertex.type) {
        newVertexTypes[vertexKey] = clipVertex.type;
      }
    } else {
      // Create new vertex at pasted position
      const newVertex = {
        x: offsetX + clipVertex.x,
        y: offsetY + clipVertex.y
      };
      
      newVertices.push(newVertex);
      newVertexMap.set(index, newVertex);
      
      // Create vertex key for atoms/types
      const vertexKey = `${newVertex.x.toFixed(2)},${newVertex.y.toFixed(2)}`;
      
      if (clipVertex.atom) {
        newVertexAtoms[vertexKey] = clipVertex.atom;
      }
      if (clipVertex.type) {
        newVertexTypes[vertexKey] = clipVertex.type;
      }
    }
  });
  
  // Create new segments
  const newSegments = [...segments];
  clipboard.segments.forEach(clipSegment => {
    const vertex1 = newVertexMap.get(clipSegment.vertex1Index);
    const vertex2 = newVertexMap.get(clipSegment.vertex2Index);
    
    if (vertex1 && vertex2) {
      const newSegment = {
        x1: vertex1.x,
        y1: vertex1.y,
        x2: vertex2.x,
        y2: vertex2.y,
        bondOrder: clipSegment.bondOrder || 1,
        bondType: clipSegment.bondType || null,
        bondDirection: clipSegment.bondDirection,
        direction: clipSegment.direction,
        flipSmallerLine: clipSegment.flipSmallerLine
      };
      
      // For double bonds, recalculate upperVertex and lowerVertex properties
      if (newSegment.bondOrder === 2 && newSegment.direction) {
        const vertices = calculateDoubleBondVertices(
          newSegment.x1, newSegment.y1, 
          newSegment.x2, newSegment.y2, 
          newSegment.direction
        );
        newSegment.upperVertex = vertices.upperVertex;
        newSegment.lowerVertex = vertices.lowerVertex;
      } else {
        newSegment.upperVertex = clipSegment.upperVertex;
        newSegment.lowerVertex = clipSegment.lowerVertex;
      }
      
      newSegments.push(newSegment);
    }
  });
  
  // Create new arrows
  const newArrows = [...arrows];
  clipboard.arrows.forEach(clipArrow => {
    const newArrow = {
      x1: offsetX + clipArrow.x1,
      y1: offsetY + clipArrow.y1,
      x2: offsetX + clipArrow.x2,
      y2: offsetY + clipArrow.y2,
      type: clipArrow.type
    };
    
    // Copy additional properties
    if (clipArrow.type === 'equilibrium') {
      if (clipArrow.topX1 !== undefined) newArrow.topX1 = offsetX + clipArrow.topX1;
      if (clipArrow.topX2 !== undefined) newArrow.topX2 = offsetX + clipArrow.topX2;
      if (clipArrow.bottomX1 !== undefined) newArrow.bottomX1 = offsetX + clipArrow.bottomX1;
      if (clipArrow.bottomX2 !== undefined) newArrow.bottomX2 = offsetX + clipArrow.bottomX2;
    } else if (clipArrow.type && clipArrow.type.startsWith('curve')) {
      if (clipArrow.peakX !== undefined && clipArrow.peakY !== undefined) {
        newArrow.peakX = offsetX + clipArrow.peakX;
        newArrow.peakY = offsetY + clipArrow.peakY;
      }
    }
    
    newArrows.push(newArrow);
  });
  
  // Remove overlapping grid lines (bondOrder === 0) where new bonds were placed
  // This mimics the behavior when drawing bonds over grid lines
  const finalSegments = newSegments.map(segment => {
    if (segment.bondOrder > 0) {
      // This is a real bond - check if there's a grid line at the same position
      const gridLineIndex = newSegments.findIndex(gridSeg => 
        gridSeg.bondOrder === 0 &&
        Math.abs(gridSeg.x1 - segment.x1) < 0.01 &&
        Math.abs(gridSeg.y1 - segment.y1) < 0.01 &&
        Math.abs(gridSeg.x2 - segment.x2) < 0.01 &&
        Math.abs(gridSeg.y2 - segment.y2) < 0.01
      );
      
      if (gridLineIndex !== -1) {
        // Remove the grid line by filtering it out
        return segment; // Keep the real bond
      }
    }
    return segment;
  }).filter((segment, index, array) => {
    // Remove grid lines that have been replaced by real bonds
    if (segment.bondOrder === 0) {
      const hasOverlappingBond = array.some(otherSeg => 
        otherSeg !== segment &&
        otherSeg.bondOrder > 0 &&
        Math.abs(otherSeg.x1 - segment.x1) < 0.01 &&
        Math.abs(otherSeg.y1 - segment.y1) < 0.01 &&
        Math.abs(otherSeg.x2 - segment.x2) < 0.01 &&
        Math.abs(otherSeg.y2 - segment.y2) < 0.01
      );
      return !hasOverlappingBond; // Remove grid line if there's an overlapping bond
    }
    return true; // Keep all real bonds
  });
  
  // Update state
  setVertices(newVertices);
  setVertexAtoms(newVertexAtoms);
  setVertexTypes(newVertexTypes);
  setSegments(finalSegments);
  setArrows(newArrows);
  
  // Exit paste mode
  setIsPasteMode(false);
  setSnapAlignment(null);
}; 