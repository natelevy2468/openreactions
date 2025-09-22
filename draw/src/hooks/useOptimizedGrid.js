/**
 * Optimized Grid Generation Hook
 * 
 * Pre-computes grid and uses viewport culling to only render visible elements
 */

import { useMemo, useRef, useCallback } from 'react';

export const useOptimizedGrid = (hexRadius, gridRadius, canvasWidth, canvasHeight, offset) => {
  const baseGridRef = useRef(null);
  
  // Pre-compute base grid once (expensive operation)
  const baseGrid = useMemo(() => {
    console.log('Grid generation cache miss - recalculating base grid');
    
    const newSegments = [];
    const newVertices = [];
    const seenSeg = new Set();
    const seenVert = new Set();
    const r = hexRadius;
    const hexWidth = Math.sqrt(3) * r;
    const hSpacing = hexWidth;
    const vSpacing = 1.5 * r;
    
    // Calculate grid bounds with extra margin for smooth scrolling
    const margin = r * 4;
    const cols = Math.ceil((canvasWidth + hexWidth * 2 + margin * 2) / hSpacing) + 1;
    const rows = Math.ceil((canvasHeight + r * 2 + margin * 2) / vSpacing) + 1;
    
    // Generate hexagonal grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isEvenRow = row % 2 === 0;
        const x = col * hSpacing + (isEvenRow ? 0 : hSpacing / 2) - margin;
        const y = row * vSpacing - margin;
        
        const vk = `${x.toFixed(2)},${y.toFixed(2)}`;
        if (!seenVert.has(vk)) {
          newVertices.push({ x, y, isOffGrid: false });
          seenVert.add(vk);
        }
        
        // Generate horizontal segments
        if (col < cols - 1) {
          const x2 = (col + 1) * hSpacing + (isEvenRow ? 0 : hSpacing / 2) - margin;
          const sk = `${x.toFixed(2)},${y.toFixed(2)}-${x2.toFixed(2)},${y.toFixed(2)}`;
          if (!seenSeg.has(sk)) {
            newSegments.push({
              x1: x, y1: y, x2: x2, y2: y,
              bondOrder: 0, bondType: null, bondDirection: 1
            });
            seenSeg.add(sk);
          }
        }
        
        // Generate diagonal segments
        if (row < rows - 1) {
          const nextRowIsEven = (row + 1) % 2 === 0;
          const y2 = (row + 1) * vSpacing - margin;
          
          // Left diagonal
          const leftCol = nextRowIsEven ? col - 1 : col;
          if (leftCol >= 0) {
            const x2 = leftCol * hSpacing + (nextRowIsEven ? 0 : hSpacing / 2) - margin;
            const sk = `${x.toFixed(2)},${y.toFixed(2)}-${x2.toFixed(2)},${y2.toFixed(2)}`;
            if (!seenSeg.has(sk)) {
              newSegments.push({
                x1: x, y1: y, x2: x2, y2: y2,
                bondOrder: 0, bondType: null, bondDirection: 1
              });
              seenSeg.add(sk);
            }
          }
          
          // Right diagonal
          const rightCol = nextRowIsEven ? col : col + 1;
          if (rightCol < cols) {
            const x2 = rightCol * hSpacing + (nextRowIsEven ? 0 : hSpacing / 2) - margin;
            const sk = `${x.toFixed(2)},${y.toFixed(2)}-${x2.toFixed(2)},${y2.toFixed(2)}`;
            if (!seenSeg.has(sk)) {
              newSegments.push({
                x1: x, y1: y, x2: x2, y2: y2,
                bondOrder: 0, bondType: null, bondDirection: 1
              });
              seenSeg.add(sk);
            }
          }
        }
      }
    }
    
    baseGridRef.current = { segments: newSegments, vertices: newVertices };
    return { segments: newSegments, vertices: newVertices };
  }, [hexRadius, gridRadius, canvasWidth, canvasHeight]);
  
  // Viewport culling - only return visible grid elements
  const visibleGrid = useMemo(() => {
    if (!baseGrid) return { segments: [], vertices: [] };
    
    // Calculate viewport bounds with offset
    const viewportBounds = {
      left: -offset.x,
      right: -offset.x + canvasWidth,
      top: -offset.y,
      bottom: -offset.y + canvasHeight
    };
    
    // Add margin for smooth scrolling
    const margin = hexRadius * 2;
    const expandedBounds = {
      left: viewportBounds.left - margin,
      right: viewportBounds.right + margin,
      top: viewportBounds.top - margin,
      bottom: viewportBounds.bottom + margin
    };
    
    // Filter vertices within viewport
    const visibleVertices = baseGrid.vertices.filter(vertex => 
      vertex.x >= expandedBounds.left &&
      vertex.x <= expandedBounds.right &&
      vertex.y >= expandedBounds.top &&
      vertex.y <= expandedBounds.bottom
    );
    
    // Filter segments within viewport (check if any part is visible)
    const visibleSegments = baseGrid.segments.filter(segment => {
      const minX = Math.min(segment.x1, segment.x2);
      const maxX = Math.max(segment.x1, segment.x2);
      const minY = Math.min(segment.y1, segment.y2);
      const maxY = Math.max(segment.y1, segment.y2);
      
      return !(maxX < expandedBounds.left || 
               minX > expandedBounds.right ||
               maxY < expandedBounds.top || 
               minY > expandedBounds.bottom);
    });
    
    return { segments: visibleSegments, vertices: visibleVertices };
  }, [baseGrid, offset, canvasWidth, canvasHeight, hexRadius]);
  
  // Merge with existing molecular data
  const mergeWithMolecularData = useCallback((existingVertices, existingVertexAtoms, existingSegments) => {
    const { segments: gridSegments, vertices: gridVertices } = visibleGrid;
    
    // Preserve existing molecular vertices and atoms
    const preservedVertices = [];
    const seenVert = new Set();
    
    existingVertices.forEach(vertex => {
      if (vertex.isOffGrid === true) {
        // Always preserve off-grid vertices
        preservedVertices.push(vertex);
        const vk = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
        seenVert.add(vk);
      } else {
        // Preserve on-grid vertices that have atoms or bonds
        const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
        const hasAtom = existingVertexAtoms[vertexKey];
        const hasBonds = existingSegments.some(seg => 
          seg.bondOrder > 0 && (
            (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
            (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)
          )
        );
        
        if (hasAtom || hasBonds) {
          preservedVertices.push(vertex);
          const vk = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
          seenVert.add(vk);
        }
      }
    });
    
    // Add grid vertices that don't conflict with preserved vertices
    const finalVertices = [...preservedVertices];
    gridVertices.forEach(vertex => {
      const vk = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
      if (!seenVert.has(vk)) {
        finalVertices.push(vertex);
      }
    });
    
    // Preserve existing molecular segments and add grid segments
    const preservedSegments = existingSegments.filter(seg => seg.bondOrder > 0);
    const finalSegments = [...preservedSegments, ...gridSegments];
    
    return {
      newSegments: finalSegments,
      newVertices: finalVertices
    };
  }, [visibleGrid]);
  
  // Get grid statistics for debugging
  const getGridStats = useCallback(() => {
    return {
      baseVertices: baseGrid?.vertices.length || 0,
      baseSegments: baseGrid?.segments.length || 0,
      visibleVertices: visibleGrid.vertices.length,
      visibleSegments: visibleGrid.segments.length,
      cullingRatio: baseGrid ? 
        ((baseGrid.vertices.length - visibleGrid.vertices.length) / baseGrid.vertices.length * 100).toFixed(1) + '%' : 
        '0%'
    };
  }, [baseGrid, visibleGrid]);
  
  return {
    visibleGrid,
    mergeWithMolecularData,
    getGridStats
  };
};
