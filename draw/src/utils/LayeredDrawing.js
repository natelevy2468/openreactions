/**
 * Layered Drawing Utilities
 * 
 * Separates drawing functions by layer type for optimal performance
 */

// Static layer drawing functions (bonds, atoms - rarely change)
export const drawStaticLayer = (ctx, {
  segments,
  vertices,
  vertexAtoms,
  vertexTypes,
  detectedRings,
  offset,
  hexRadius,
  colors,
  mode
}) => {
  if (!ctx) return;
  
  // Draw bonds
  segments.forEach((segment, index) => {
    if (segment.bondOrder > 0) {
      drawBond(ctx, segment, index, segments, vertices, vertexAtoms, detectedRings, offset, colors, mode);
    }
  });
  
  // Draw atoms
  Object.entries(vertexAtoms).forEach(([key, atom]) => {
    const [x, y] = key.split(',').map(parseFloat);
    const vertex = vertices.find(v => 
      Math.abs(v.x - x) < 0.01 && Math.abs(v.y - y) < 0.01
    );
    if (vertex) {
      drawAtom(ctx, vertex, atom, offset, colors, hexRadius);
    }
  });
  
  // Draw vertex types (lone pairs, etc.)
  Object.entries(vertexTypes).forEach(([key, type]) => {
    const [x, y] = key.split(',').map(parseFloat);
    const vertex = vertices.find(v => 
      Math.abs(v.x - x) < 0.01 && Math.abs(v.y - y) < 0.01
    );
    if (vertex && type.lonePairs > 0) {
      drawLonePairs(ctx, vertex, type, offset, colors, hexRadius);
    }
  });
};

// Dynamic layer drawing functions (hover effects, previews - change frequently)
export const drawDynamicLayer = (ctx, {
  hoverVertex,
  hoverSegmentIndex,
  hoverBondPreview,
  bondPreviews,
  arrowPreview,
  fourthBondPreview,
  offset,
  hexRadius,
  colors,
  segments,
  mode
}) => {
  if (!ctx) return;
  
  // Draw hover effects
  if (hoverVertex) {
    drawHoverVertex(ctx, hoverVertex, offset, colors, hexRadius);
  }
  
  if (hoverSegmentIndex !== null && segments[hoverSegmentIndex]) {
    drawHoverSegment(ctx, segments[hoverSegmentIndex], offset, colors);
  }
  
  // Draw bond previews
  if (bondPreviews && bondPreviews.length > 0) {
    bondPreviews.forEach(preview => {
      drawBondPreview(ctx, preview, offset, colors, hoverBondPreview === preview);
    });
  }
  
  // Draw hover bond preview highlight
  if (hoverBondPreview) {
    drawBondPreviewHighlight(ctx, hoverBondPreview, offset, colors);
  }
  
  // Draw arrow preview
  if (arrowPreview) {
    drawArrowPreview(ctx, arrowPreview, offset, colors);
  }
  
  // Draw fourth bond preview
  if (fourthBondPreview) {
    drawFourthBondPreview(ctx, fourthBondPreview, offset, colors, mode);
  }
};

// UI layer drawing functions (grid, selections - UI elements)
export const drawUILayer = (ctx, {
  segments,
  vertices,
  vertexAtoms,
  offset,
  hexRadius,
  colors,
  gridBreakingAnalysis,
  isSelecting,
  selectionStart,
  selectionEnd,
  selectedSegments,
  selectedVertices,
  showGrid = true
}) => {
  if (!ctx) return;
  
  // Fill canvas background
  ctx.fillStyle = colors.canvasBackground;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  if (showGrid) {
    // Draw grid lines (skip around atoms and in breaking zones)
    const atomPositions = new Set(Object.keys(vertexAtoms));
    
    ctx.lineWidth = 1.5;
    segments.forEach((seg, i) => {
      if (seg.bondOrder === 0) { // Only grid lines
        // Check if should be suppressed
        let shouldSuppress = false;
        
        // Check atom masking
        for (const key of atomPositions) {
          const [ax, ay] = key.split(',').map(parseFloat);
          const vx = ax + offset.x;
          const vy = ay + offset.y;
          const x1 = seg.x1 + offset.x, y1 = seg.y1 + offset.y;
          const x2 = seg.x2 + offset.x, y2 = seg.y2 + offset.y;
          const dx = x2 - x1, dy = y2 - y1;
          const lengthSq = dx*dx + dy*dy;
          let t = ((vx-x1)*dx + (vy-y1)*dy) / lengthSq;
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t*dx;
          const projY = y1 + t*dy;
          const dist = Math.sqrt((projX-vx)**2 + (projY-vy)**2);
          if (dist < 20) {
            shouldSuppress = true;
            break;
          }
        }
        
        // Check grid breaking zones
        if (!shouldSuppress && gridBreakingAnalysis.gridBreakingActive) {
          const segmentMidX = (seg.x1 + seg.x2) / 2;
          const segmentMidY = (seg.y1 + seg.y2) / 2;
          
          for (const zone of gridBreakingAnalysis.breakingZones) {
            const distance = Math.sqrt(
              Math.pow(segmentMidX - zone.center.x, 2) + 
              Math.pow(segmentMidY - zone.center.y, 2)
            );
            if (distance < zone.suppressionRadius) {
              shouldSuppress = true;
              break;
            }
          }
        }
        
        if (!shouldSuppress) {
          drawGridLine(ctx, seg, offset, colors);
        }
      }
    });
    
    // Draw grid vertices
    vertices.forEach(vertex => {
      if (!vertexAtoms[`${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`]) {
        drawGridVertex(ctx, vertex, offset, colors, hexRadius);
      }
    });
  }
  
  // Draw selection box
  if (isSelecting && selectionStart && selectionEnd) {
    drawSelectionBox(ctx, selectionStart, selectionEnd, colors);
  }
  
  // Draw selection highlights
  selectedSegments.forEach(index => {
    if (segments[index]) {
      drawSelectedSegment(ctx, segments[index], offset, colors);
    }
  });
  
  selectedVertices.forEach(vertex => {
    drawSelectedVertex(ctx, vertex, offset, colors, hexRadius);
  });
};

// Individual drawing functions (extracted from existing code)
const drawBond = (ctx, segment, index, segments, vertices, vertexAtoms, detectedRings, offset, colors, mode) => {
  // Implementation would be extracted from existing drawGrid function
  // This is a placeholder - actual implementation would be moved from HexGridWithToolbar.jsx
  ctx.strokeStyle = colors.bondColor || '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
  ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
  ctx.stroke();
};

const drawAtom = (ctx, vertex, atom, offset, colors, hexRadius) => {
  // Implementation would be extracted from existing drawGrid function
  ctx.fillStyle = colors.atomColor || '#000';
  ctx.font = `${hexRadius * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(atom.symbol, vertex.x + offset.x, vertex.y + offset.y);
};

const drawLonePairs = (ctx, vertex, type, offset, colors, hexRadius) => {
  // Implementation for lone pairs
  ctx.fillStyle = colors.lonePairColor || '#666';
  // Draw lone pair dots
};

const drawHoverVertex = (ctx, vertex, offset, colors, hexRadius) => {
  ctx.strokeStyle = colors.hoverColor || '#007bff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(vertex.x + offset.x, vertex.y + offset.y, hexRadius * 0.3, 0, 2 * Math.PI);
  ctx.stroke();
};

const drawHoverSegment = (ctx, segment, offset, colors) => {
  ctx.strokeStyle = colors.hoverColor || '#007bff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
  ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
  ctx.stroke();
};

const drawBondPreview = (ctx, preview, offset, colors, isHovered) => {
  ctx.strokeStyle = isHovered ? colors.hoverColor : colors.previewColor || '#999';
  ctx.lineWidth = isHovered ? 3 : 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(preview.x1 + offset.x, preview.y1 + offset.y);
  ctx.lineTo(preview.x2 + offset.x, preview.y2 + offset.y);
  ctx.stroke();
  ctx.setLineDash([]);
};

const drawBondPreviewHighlight = (ctx, preview, offset, colors) => {
  ctx.strokeStyle = colors.hoverColor || '#007bff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(preview.x1 + offset.x, preview.y1 + offset.y);
  ctx.lineTo(preview.x2 + offset.x, preview.y2 + offset.y);
  ctx.stroke();
};

const drawArrowPreview = (ctx, preview, offset, colors) => {
  // Arrow preview drawing implementation
  ctx.strokeStyle = colors.arrowColor || '#666';
  ctx.lineWidth = 2;
  // Draw arrow
};

const drawFourthBondPreview = (ctx, preview, offset, colors, mode) => {
  // Fourth bond preview implementation
  ctx.strokeStyle = colors.previewColor || '#999';
  ctx.lineWidth = 2;
  // Draw spinning bond preview
};

const drawGridLine = (ctx, segment, offset, colors) => {
  ctx.strokeStyle = colors.gridColor || '#e0e0e0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
  ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
  ctx.stroke();
};

const drawGridVertex = (ctx, vertex, offset, colors, hexRadius) => {
  ctx.fillStyle = colors.gridVertexColor || '#ccc';
  ctx.beginPath();
  ctx.arc(vertex.x + offset.x, vertex.y + offset.y, 2, 0, 2 * Math.PI);
  ctx.fill();
};

const drawSelectionBox = (ctx, start, end, colors) => {
  ctx.strokeStyle = colors.selectionColor || '#007bff';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  );
  ctx.setLineDash([]);
};

const drawSelectedSegment = (ctx, segment, offset, colors) => {
  ctx.strokeStyle = colors.selectionColor || '#007bff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
  ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
  ctx.stroke();
};

const drawSelectedVertex = (ctx, vertex, offset, colors, hexRadius) => {
  ctx.strokeStyle = colors.selectionColor || '#007bff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(vertex.x + offset.x, vertex.y + offset.y, hexRadius * 0.4, 0, 2 * Math.PI);
  ctx.stroke();
};
