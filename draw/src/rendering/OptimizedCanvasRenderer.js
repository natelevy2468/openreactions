/**
 * Optimized Canvas Renderer
 * Implements viewport culling, dirty rectangles, and separated rendering functions
 */

import { isInViewport, isSegmentInViewport } from '../utils/PerformanceUtils.js';

export class OptimizedCanvasRenderer {
  constructor(canvas, hexRadius = 60) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hexRadius = hexRadius;
    this.viewport = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
    };
  }

  /**
   * Update viewport dimensions
   */
  updateViewport(offset = { x: 0, y: 0 }) {
    this.viewport = {
      x: -offset.x,
      y: -offset.y,
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  /**
   * Clear the entire canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw only grid lines (gray hexagonal grid)
   */
  drawGridLines(segments, offset, hoverSegmentIndex, breakingZones = []) {
    const ctx = this.ctx;
    ctx.save();
    
    // Filter to only grid lines (bondOrder === 0) and check viewport
    const visibleGridLines = segments.filter((seg, idx) => {
      if (seg.bondOrder !== 0) return false;
      
      // Viewport culling
      const x1 = seg.x1 + offset.x;
      const y1 = seg.y1 + offset.y;
      const x2 = seg.x2 + offset.x;
      const y2 = seg.y2 + offset.y;
      
      return isSegmentInViewport(x1, y1, x2, y2, this.viewport.width, this.viewport.height);
    });
    
    // Draw grid lines
    visibleGridLines.forEach((seg, idx) => {
      const isHovered = idx === hoverSegmentIndex;
      
      // Skip if in breaking zone
      if (breakingZones.length > 0) {
        const midX = (seg.x1 + seg.x2) / 2;
        const midY = (seg.y1 + seg.y2) / 2;
        const inBreakingZone = breakingZones.some(zone => {
          const dist = Math.sqrt((midX - zone.center.x) ** 2 + (midY - zone.center.y) ** 2);
          return dist <= zone.suppressionRadius;
        });
        if (inBreakingZone) return;
      }
      
      const x1 = seg.x1 + offset.x;
      const y1 = seg.y1 + offset.y;
      const x2 = seg.x2 + offset.x;
      const y2 = seg.y2 + offset.y;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isHovered ? '#888' : '#e0e0e0';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.stroke();
    });
    
    ctx.restore();
  }

  /**
   * Draw bond previews for off-grid vertices
   */
  drawBondPreviews(bondPreviews, offset, hoverBondPreview) {
    const ctx = this.ctx;
    ctx.save();
    
    bondPreviews.forEach(preview => {
      if (!preview.isVisible) return;
      
      const x1 = preview.x1 + offset.x;
      const y1 = preview.y1 + offset.y;
      const x2 = preview.x2 + offset.x;
      const y2 = preview.y2 + offset.y;
      
      // Viewport culling
      if (!isSegmentInViewport(x1, y1, x2, y2, this.viewport.width, this.viewport.height)) {
        return;
      }
      
      const isHovered = hoverBondPreview?.id === preview.id;
      ctx.strokeStyle = isHovered ? '#cccccc' : '#ffffff';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    
    ctx.restore();
  }

  /**
   * Draw chemical bonds (single, double, triple, wedge, dash, etc.)
   */
  drawBonds(segments, offset, selectedSegments, hoverSegmentIndex, mode, vertexAtoms) {
    const ctx = this.ctx;
    ctx.save();
    
    // Filter visible bonds
    const visibleBonds = segments.filter(seg => {
      if (seg.bondOrder < 1) return false;
      
      const x1 = seg.x1 + offset.x;
      const y1 = seg.y1 + offset.y;
      const x2 = seg.x2 + offset.x;
      const y2 = seg.y2 + offset.y;
      
      return isSegmentInViewport(x1, y1, x2, y2, this.viewport.width, this.viewport.height);
    });
    
    // Draw each bond type
    visibleBonds.forEach((seg, idx) => {
      this.drawSingleBond(seg, idx, offset, selectedSegments, hoverSegmentIndex, mode, vertexAtoms);
    });
    
    ctx.restore();
  }

  /**
   * Draw a single bond with all its variations
   */
  drawSingleBond(seg, segIdx, offset, selectedSegments, hoverSegmentIndex, mode, vertexAtoms) {
    const ctx = this.ctx;
    const isSelected = mode === 'mouse' && selectedSegments.has(segIdx);
    const isHovered = segIdx === hoverSegmentIndex;
    
    // Set stroke style
    if (isSelected) {
      ctx.strokeStyle = 'rgb(54,98,227)';
    } else if (isHovered && seg.bondOrder === 1) {
      ctx.strokeStyle = 'rgb(8, 167, 61)';
    } else {
      ctx.strokeStyle = '#000000';
    }
    
    const x1 = seg.x1 + offset.x;
    const y1 = seg.y1 + offset.y;
    const x2 = seg.x2 + offset.x;
    const y2 = seg.y2 + offset.y;
    
    // Check for atoms to shrink bonds
    const key1 = `${seg.x1.toFixed(2)},${seg.y1.toFixed(2)}`;
    const key2 = `${seg.x2.toFixed(2)},${seg.y2.toFixed(2)}`;
    const hasAtom1 = !!vertexAtoms[key1];
    const hasAtom2 = !!vertexAtoms[key2];
    
    let sx1 = x1, sy1 = y1, sx2 = x2, sy2 = y2;
    const shrink = 14;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    
    if (length > 0) {
      const ux = dx / length;
      const uy = dy / length;
      
      if (hasAtom1) {
        sx1 += ux * shrink;
        sy1 += uy * shrink;
      }
      if (hasAtom2) {
        sx2 -= ux * shrink;
        sy2 -= uy * shrink;
      }
    }
    
    ctx.lineWidth = 3;
    
    // Draw based on bond type
    if (seg.bondOrder === 1) {
      this.drawSingleBondType(ctx, seg, sx1, sy1, sx2, sy2);
    } else if (seg.bondOrder === 2) {
      this.drawDoubleBond(ctx, seg, sx1, sy1, sx2, sy2);
    } else if (seg.bondOrder === 3) {
      this.drawTripleBond(ctx, sx1, sy1, sx2, sy2);
    }
  }

  /**
   * Draw single bond variations (normal, wedge, dash, ambiguous)
   */
  drawSingleBondType(ctx, seg, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const perpX = -uy;
    const perpY = ux;
    
    if (seg.bondType === 'wedge') {
      // Wedge bond
      ctx.beginPath();
      const wedgeWidth = 8;
      const direction = seg.bondDirection || 1;
      
      if (direction === 1) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2 + perpX * wedgeWidth, y2 + perpY * wedgeWidth);
        ctx.lineTo(x2 - perpX * wedgeWidth, y2 - perpY * wedgeWidth);
      } else {
        ctx.moveTo(x2, y2);
        ctx.lineTo(x1 + perpX * wedgeWidth, y1 + perpY * wedgeWidth);
        ctx.lineTo(x1 - perpX * wedgeWidth, y1 - perpY * wedgeWidth);
      }
      
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
    } else if (seg.bondType === 'dash') {
      // Dashed bond
      const minDashWidth = 4;
      const maxDashWidth = 13;
      const totalDashes = 6;
      const direction = seg.bondDirection || 1;
      
      for (let i = 0; i < totalDashes; i++) {
        const t = i / (totalDashes - 1);
        const effectiveT = direction === 1 ? t : 1 - t;
        const dashX = x1 + dx * t;
        const dashY = y1 + dy * t;
        const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * effectiveT;
        
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
        ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
        ctx.stroke();
      }
    } else if (seg.bondType === 'ambiguous') {
      // Wavy bond
      ctx.beginPath();
      const waveWidth = 4.5;
      const waveFrequency = 4.5;
      const waveSegments = 50;
      const direction = seg.bondDirection || 1;
      const phaseShift = direction === 1 ? 0 : Math.PI;
      
      for (let i = 0; i <= waveSegments; i++) {
        const t = i / waveSegments;
        const x = x1 + dx * t;
        const y = y1 + dy * t;
        const wave = Math.sin(t * Math.PI * 2 * waveFrequency + phaseShift) * waveWidth;
        const waveX = x + perpX * wave;
        const waveY = y + perpY * wave;
        
        if (i === 0) {
          ctx.moveTo(waveX, waveY);
        } else {
          ctx.lineTo(waveX, waveY);
        }
      }
      
      ctx.stroke();
    } else {
      // Regular single bond
      ctx.beginPath();
      ctx.moveTo(x1 - ux, y1 - uy);
      ctx.lineTo(x2 + ux, y2 + uy);
      ctx.stroke();
    }
  }

  /**
   * Draw double bond
   */
  drawDoubleBond(ctx, seg, x1, y1, x2, y2) {
    // Simplified double bond rendering
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const perpX = -uy;
    const perpY = ux;
    const offset = 5;
    
    // Draw two parallel lines
    ctx.beginPath();
    ctx.moveTo(x1 - perpX * offset, y1 - perpY * offset);
    ctx.lineTo(x2 - perpX * offset, y2 - perpY * offset);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x1 + perpX * offset, y1 + perpY * offset);
    ctx.lineTo(x2 + perpX * offset, y2 + perpY * offset);
    ctx.stroke();
  }

  /**
   * Draw triple bond
   */
  drawTripleBond(ctx, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const perpX = -uy;
    const perpY = ux;
    const offset = 6;
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Top line
    ctx.beginPath();
    ctx.moveTo(x1 + perpX * offset, y1 + perpY * offset);
    ctx.lineTo(x2 + perpX * offset, y2 + perpY * offset);
    ctx.stroke();
    
    // Bottom line
    ctx.beginPath();
    ctx.moveTo(x1 - perpX * offset, y1 - perpY * offset);
    ctx.lineTo(x2 - perpX * offset, y2 - perpY * offset);
    ctx.stroke();
  }

  /**
   * Draw atoms and their labels
   */
  drawAtoms(vertices, vertexAtoms, offset, selectedVertices, mode) {
    const ctx = this.ctx;
    ctx.save();
    
    // Filter visible vertices
    const visibleVertices = vertices.filter((v, idx) => {
      const vx = v.x + offset.x;
      const vy = v.y + offset.y;
      return isInViewport(vx, vy, this.viewport.width, this.viewport.height);
    });
    
    visibleVertices.forEach((v, idx) => {
      const vx = v.x + offset.x;
      const vy = v.y + offset.y;
      const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
      const atom = vertexAtoms[key];
      
      if (atom) {
        const isSelected = mode === 'mouse' && selectedVertices.has(idx);
        this.drawAtomLabel(ctx, atom, vx, vy, isSelected);
      }
    });
    
    ctx.restore();
  }

  /**
   * Draw a single atom label
   */
  drawAtomLabel(ctx, atom, x, y, isSelected) {
    const symbol = atom.symbol || atom;
    
    // Simple atom rendering for performance
    ctx.font = '26px "Roboto", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // White background
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, 2 * Math.PI);
    ctx.fill();
    
    // Text
    ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : 'black';
    ctx.fillText(symbol, x, y);
    
    // Draw charge if present
    if (atom.charge) {
      ctx.font = '16px "Roboto", sans-serif';
      const chargeText = atom.charge > 0 ? '+' : '−';
      ctx.fillText(chargeText, x + 12, y - 12);
    }
  }
} 