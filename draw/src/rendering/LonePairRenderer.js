/**
 * Lone Pair and Charge Rendering System
 * 
 * Handles the visual rendering of lone pairs (electron dots) and charges
 * around atoms using the smart positioning system.
 */

import { calculateSmartPositioning } from '../utils/LonePairPositioning.js';

/**
 * Renders lone pairs as dots around a vertex
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} lonePairPositions - Calculated lone pair positions
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderLonePairs = (ctx, lonePairPositions, offset, colors) => {
  if (!lonePairPositions || lonePairPositions.length === 0) return;
  
  lonePairPositions.forEach(position => {
    const screenX = position.x + offset.x;
    const screenY = position.y + offset.y;
    const dotCount = position.dotCount || 1; // How many dots at this position (1 or 2)
    
    // Dot properties
    const dotRadius = 3;
    const dotSpacing = 5; // Distance each dot is offset from center
    
    // Calculate perpendicular angle for offsetting dots
    const perpAngle = position.angle + Math.PI / 2;
    
    // Draw white outline for visibility
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.fillStyle = colors.bonds || '#000000';
    
    if (dotCount === 1) {
      // Single dot - centered at position
      ctx.beginPath();
      ctx.arc(screenX, screenY, dotRadius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
    } else if (dotCount === 2) {
      // Two dots - offset equally from center
      const dot1X = screenX + Math.cos(perpAngle) * dotSpacing;
      const dot1Y = screenY + Math.sin(perpAngle) * dotSpacing;
      const dot2X = screenX - Math.cos(perpAngle) * dotSpacing;
      const dot2Y = screenY - Math.sin(perpAngle) * dotSpacing;
      
      // Draw first dot
      ctx.beginPath();
      ctx.arc(dot1X, dot1Y, dotRadius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      
      // Draw second dot
      ctx.beginPath();
      ctx.arc(dot2X, dot2Y, dotRadius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
    }
  });
};

/**
 * Renders a charge symbol around a vertex with circle background
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} chargePosition - Calculated charge position
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderCharge = (ctx, chargePosition, offset, colors) => {
  if (!chargePosition) return;
  
  const screenX = chargePosition.x + offset.x;
  const screenY = chargePosition.y + offset.y;
  const charge = chargePosition.charge;
  
  // Circle properties (smaller and thinner)
  const circleRadius = 8;
  const circleStrokeWidth = 1.5;
  
  // Determine charge symbol
  let chargeText = '';
  if (charge === 1) {
    chargeText = '+';
  } else if (charge === -1) {
    chargeText = '−'; // Use proper minus sign
  } else if (charge > 1) {
    chargeText = `${charge}+`;
  } else if (charge < -1) {
    chargeText = `${Math.abs(charge)}−`;
  }
  
  if (chargeText) {
    // Draw white circle background with black border
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = colors.text || '#000000';
    ctx.lineWidth = circleStrokeWidth;
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, circleRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw the charge symbol in black with precise centering
    ctx.fillStyle = colors.text || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Arial, sans-serif';
    
    // Adjust Y position for optical centering (fonts render slightly high)
    ctx.fillText(chargeText, screenX, screenY + 1.5);
  }
};

// Cache for lone pair and charge positions to avoid recalculating every frame
const positioningCache = new Map();
let lastSegmentsHash = '';

/**
 * Generates a cache key for positioning calculations
 */
const getPositioningCacheKey = (vertexKey, lonePairCount, charge, connectedBondKeys) => {
  return `${vertexKey}:${lonePairCount}:${charge}:${connectedBondKeys}`;
};

/**
 * Clears the positioning cache (called when bonds change)
 */
export const clearLonePairCache = () => {
  positioningCache.clear();
};

/**
 * Renders all lone pairs and charges for all vertices (with caching)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} vertices - All vertices
 * @param {Array} segments - All bond segments
 * @param {Object} vertexAtoms - Atom data mapping
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderAllLonePairsAndCharges = (ctx, vertices, segments, vertexAtoms, offset, colors) => {
  // Create vertex lookup map for O(1) access instead of O(n) find operations
  const vertexMap = new Map();
  vertices.forEach(v => {
    const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
    vertexMap.set(key, v);
  });
  
  // Process each vertex that has atom data
  Object.entries(vertexAtoms).forEach(([vertexKey, atomData]) => {
    if (!atomData) return;
    
    const vertex = vertexMap.get(vertexKey);
    if (!vertex) return;
    
    const lonePairCount = atomData.lonePairs || 0;
    const charge = atomData.charge || 0;
    
    // Skip if no lone pairs or charges to render
    if (lonePairCount === 0 && charge === 0) return;
    
    // Create cache key based on vertex position and connected bonds
    const connectedBonds = segments.filter(seg => {
      if (!seg.bondOrder || seg.bondOrder <= 0) return false;
      return (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
             (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01);
    });
    const bondKeys = connectedBonds.map(b => `${b.x1.toFixed(2)},${b.y1.toFixed(2)}-${b.x2.toFixed(2)},${b.y2.toFixed(2)}`).sort().join('|');
    const cacheKey = getPositioningCacheKey(vertexKey, lonePairCount, charge, bondKeys);
    
    // Check cache first
    let positioning = positioningCache.get(cacheKey);
    
    if (!positioning) {
      // Calculate smart positioning only if not cached
      positioning = calculateSmartPositioning(
        vertex, 
        segments, 
        vertexAtoms, 
        lonePairCount, 
        charge
      );
      
      // Store in cache
      positioningCache.set(cacheKey, positioning);
      
      // Limit cache size to prevent memory issues
      if (positioningCache.size > 1000) {
        const firstKey = positioningCache.keys().next().value;
        positioningCache.delete(firstKey);
      }
    }
    
    // Render lone pairs
    if (positioning.lonePairPositions.length > 0) {
      renderLonePairs(ctx, positioning.lonePairPositions, offset, colors);
    }
    
    // Render charge
    if (positioning.chargePosition) {
      renderCharge(ctx, positioning.chargePosition, offset, colors);
    }
  });
};

/**
 * Renders lone pairs and charges for a specific vertex (for preview/debugging)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} vertex - The vertex to render for
 * @param {Array} segments - All bond segments
 * @param {Object} vertexAtoms - Atom data mapping
 * @param {number} lonePairCount - Number of lone pairs
 * @param {number} charge - Charge value
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderVertexLonePairsAndCharges = (ctx, vertex, segments, vertexAtoms, lonePairCount, charge, offset, colors) => {
  if (lonePairCount === 0 && charge === 0) return;
  
  // Calculate smart positioning
  const positioning = calculateSmartPositioning(
    vertex, 
    segments, 
    vertexAtoms, 
    lonePairCount, 
    charge
  );
  
  // Render lone pairs
  if (positioning.lonePairPositions.length > 0) {
    renderLonePairs(ctx, positioning.lonePairPositions, offset, colors);
  }
  
  // Render charge
  if (positioning.chargePosition) {
    renderCharge(ctx, positioning.chargePosition, offset, colors);
  }
};

/**
 * Calculates bounds for lone pairs and charges (for collision detection)
 * @param {Object} vertex - The vertex
 * @param {Array} segments - All bond segments
 * @param {Object} vertexAtoms - Atom data mapping
 * @param {number} lonePairCount - Number of lone pairs
 * @param {number} charge - Charge value
 * @returns {Array} Array of bounding boxes
 */
export const calculateLonePairAndChargeBounds = (vertex, segments, vertexAtoms, lonePairCount, charge) => {
  const bounds = [];
  
  if (lonePairCount === 0 && charge === 0) return bounds;
  
  const positioning = calculateSmartPositioning(
    vertex, 
    segments, 
    vertexAtoms, 
    lonePairCount, 
    charge
  );
  
  // Add bounds for lone pairs
  positioning.lonePairPositions.forEach(position => {
    bounds.push({
      x: position.x - 8, // Account for dot spacing and radius
      y: position.y - 8,
      width: 16,
      height: 16,
      type: 'lonePair'
    });
  });
  
  // Add bounds for charge (accounting for smaller circle)
  if (positioning.chargePosition) {
    bounds.push({
      x: positioning.chargePosition.x - 8, // Account for smaller circle radius
      y: positioning.chargePosition.y - 8,
      width: 16,
      height: 16,
      type: 'charge'
    });
  }
  
  return bounds;
};
