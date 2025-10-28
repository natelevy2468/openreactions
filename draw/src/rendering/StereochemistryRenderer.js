/**
 * Stereochemistry Bond Rendering System
 * 
 * Handles rendering of specialized stereochemical bonds:
 * - Wedge bonds (solid wedge pointing forward)
 * - Dashed wedge bonds (hashed lines pointing backward)
 * - Ambiguous/Wavy bonds (squiggly line for unknown stereochemistry)
 */

/**
 * Renders a wedge bond (solid triangle getting wider toward the end)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} bond - Bond segment
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderWedgeBond = (ctx, bond, offset, colors) => {
  const x1 = bond.x1 + offset.x;
  const y1 = bond.y1 + offset.y;
  const x2 = bond.x2 + offset.x;
  const y2 = bond.y2 + offset.y;
  
  // Calculate bond angle and perpendicular angle
  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const perpAngle = bondAngle + Math.PI / 2;
  
  // Wedge starts narrow and gets wider
  const startWidth = 2;  // Narrow at start
  const endWidth = 12;   // Wide at end
  
  // Calculate the four corners of the wedge
  const startOffset1X = Math.cos(perpAngle) * startWidth / 2;
  const startOffset1Y = Math.sin(perpAngle) * startWidth / 2;
  const startOffset2X = -startOffset1X;
  const startOffset2Y = -startOffset1Y;
  
  const endOffset1X = Math.cos(perpAngle) * endWidth / 2;
  const endOffset1Y = Math.sin(perpAngle) * endWidth / 2;
  const endOffset2X = -endOffset1X;
  const endOffset2Y = -endOffset1Y;
  
  // Draw filled wedge
  ctx.fillStyle = colors.bonds || '#000000';
  ctx.beginPath();
  ctx.moveTo(x1 + startOffset1X, y1 + startOffset1Y);
  ctx.lineTo(x2 + endOffset1X, y2 + endOffset1Y);
  ctx.lineTo(x2 + endOffset2X, y2 + endOffset2Y);
  ctx.lineTo(x1 + startOffset2X, y1 + startOffset2Y);
  ctx.closePath();
  ctx.fill();
};

/**
 * Renders a dashed wedge bond (hashed lines getting wider toward the end)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} bond - Bond segment
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderDashedWedgeBond = (ctx, bond, offset, colors) => {
  const x1 = bond.x1 + offset.x;
  const y1 = bond.y1 + offset.y;
  const x2 = bond.x2 + offset.x;
  const y2 = bond.y2 + offset.y;
  
  // Calculate bond angle and perpendicular angle
  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const perpAngle = bondAngle + Math.PI / 2;
  
  // Calculate bond length
  const bondLength = Math.sqrt(Math.pow(bond.x2 - bond.x1, 2) + Math.pow(bond.y2 - bond.y1, 2));
  
  // Number of hash lines
  const numLines = 8;
  
  ctx.strokeStyle = colors.bonds || '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  // Draw hash lines that get progressively wider
  for (let i = 0; i <= numLines; i++) {
    const t = i / numLines; // Position along bond (0 to 1)
    
    // Width increases from narrow to wide
    const width = 2 + t * 10; // From 2px to 12px
    
    // Position along the bond
    const lineX = x1 + (x2 - x1) * t;
    const lineY = y1 + (y2 - y1) * t;
    
    // Perpendicular offset for hash line
    const offset1X = Math.cos(perpAngle) * width / 2;
    const offset1Y = Math.sin(perpAngle) * width / 2;
    
    // Draw hash line
    ctx.beginPath();
    ctx.moveTo(lineX + offset1X, lineY + offset1Y);
    ctx.lineTo(lineX - offset1X, lineY - offset1Y);
    ctx.stroke();
  }
};

/**
 * Renders an ambiguous/wavy bond (squiggly line for unknown stereochemistry)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} bond - Bond segment
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderWavyBond = (ctx, bond, offset, colors) => {
  const x1 = bond.x1 + offset.x;
  const y1 = bond.y1 + offset.y;
  const x2 = bond.x2 + offset.x;
  const y2 = bond.y2 + offset.y;
  
  // Calculate bond angle and perpendicular angle
  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const perpAngle = bondAngle + Math.PI / 2;
  
  // Calculate bond length
  const bondLength = Math.sqrt(Math.pow(bond.x2 - bond.x1, 2) + Math.pow(bond.y2 - bond.y1, 2));
  const bondUnitX = (bond.x2 - bond.x1) / bondLength;
  const bondUnitY = (bond.y2 - bond.y1) / bondLength;
  
  // Wave parameters
  const waveAmplitude = 4;  // Height of wave peaks
  const waveFrequency = 5;  // Number of complete waves
  const segments = 50;      // Smoothness of curve
  
  ctx.strokeStyle = colors.bonds || '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw wavy line
  ctx.beginPath();
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // Position along bond (0 to 1)
    
    // Position along the bond
    const baseX = x1 + (x2 - x1) * t;
    const baseY = y1 + (y2 - y1) * t;
    
    // Calculate perpendicular offset for wave
    const waveOffset = Math.sin(t * waveFrequency * 2 * Math.PI) * waveAmplitude;
    const offsetX = Math.cos(perpAngle) * waveOffset;
    const offsetY = Math.sin(perpAngle) * waveOffset;
    
    const finalX = baseX + offsetX;
    const finalY = baseY + offsetY;
    
    if (i === 0) {
      ctx.moveTo(finalX, finalY);
    } else {
      ctx.lineTo(finalX, finalY);
    }
  }
  
  ctx.stroke();
};

/**
 * Main rendering function that dispatches to appropriate stereochemistry renderer
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} bond - Bond segment with bondType property
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderStereochemistryBond = (ctx, bond, offset, colors) => {
  if (!bond.bondType) return false; // Not a stereochemistry bond
  
  switch (bond.bondType) {
    case 'wedge':
      renderWedgeBond(ctx, bond, offset, colors);
      return true;
    case 'dash':
      renderDashedWedgeBond(ctx, bond, offset, colors);
      return true;
    case 'ambiguous':
      renderWavyBond(ctx, bond, offset, colors);
      return true;
    default:
      return false; // Unknown bond type
  }
};

/**
 * Renders all stereochemistry bonds in the molecule
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} segments - All bond segments
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @returns {Set} Set of indices of bonds that were rendered as stereochemistry bonds
 */
export const renderAllStereochemistryBonds = (ctx, segments, offset, colors) => {
  const renderedIndices = new Set();
  
  segments.forEach((segment, index) => {
    if (segment.bondOrder > 0 && segment.bondType) {
      const wasRendered = renderStereochemistryBond(ctx, segment, offset, colors);
      if (wasRendered) {
        renderedIndices.add(index);
      }
    }
  });
  
  return renderedIndices;
};
