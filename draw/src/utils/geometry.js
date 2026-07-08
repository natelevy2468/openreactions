/**
 * Pure geometry / angle helpers.
 *
 * These functions are stateless (they take every input as an argument and
 * touch no React state), which makes them safe to extract from the large
 * HexGridWithToolbar component and unit-test in isolation. This is the first
 * step of gradually modularizing that file: move pure helpers out first, then
 * tackle stateful handlers.
 */

/**
 * Angle (radians) of the vector from (x1,y1) to (x2,y2).
 * @returns {number}
 */
export const calculateBondDirection = (x1, y1, x2, y2) => {
  return Math.atan2(y2 - y1, x2 - x1);
};

/**
 * Normalize an angle to the [0, 2π) range.
 * @param {number} angle
 * @returns {number}
 */
export const normalizeAngle = (angle) => {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
};

/**
 * Snap an angle to the nearest 60° increment, offset by 30°
 * (i.e. 30°, 90°, 150°, 210°, 270°, 330°). Used for the hex-grid bond angles.
 * @param {number} angle
 * @returns {number} the closest increment, in radians
 */
export const normalizeToSixtyDegrees = (angle) => {
  const normalizedAngle = normalizeAngle(angle);
  const sixtyDegreeIncrements = [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (7 * Math.PI) / 6, (3 * Math.PI) / 2, (11 * Math.PI) / 6];

  let closestAngle = sixtyDegreeIncrements[0];
  let minDiff = Math.abs(normalizedAngle - closestAngle);

  for (const increment of sixtyDegreeIncrements) {
    let diff = Math.abs(normalizedAngle - increment);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = increment;
    }
  }

  return closestAngle;
};

/**
 * The two "middle" carbons of a chair projection (indexes 2 and 5), which use a
 * steeper equatorial substituent direction than the corner carbons.
 */
export const CHAIR_MIDDLE_VERTEX_INDEXES = new Set([2, 5]);

/**
 * The six ring-carbon positions of a cyclohexane chair projection, placed
 * around (centerX, centerY) at the given bond length, optionally rotated/flipped.
 * @returns {Array<{x:number, y:number, isOffGrid:boolean}>}
 */
export const getChairVertices = (centerX, centerY, bondLength, rotation = 0, flip = false) => {
  const basePoints = [
    { x: -1.35, y: 0.78 },
    { x: -0.93, y: -0.47 },
    { x: 0.20, y: -0.07 },
    { x: 1.41, y: -0.45 },
    { x: 0.99, y: 0.80 },
    { x: -0.14, y: 0.40 }
  ];
  const averageEdgeLength = 1.26;
  const scale = bondLength / averageEdgeLength;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  return basePoints.map(point => {
    const fx = flip ? -point.x : point.x;
    const scaledX = fx * scale;
    const scaledY = point.y * scale;
    return {
      x: centerX + (scaledX * cosR - scaledY * sinR),
      y: centerY + (scaledX * sinR + scaledY * cosR),
      isOffGrid: true
    };
  });
};

/**
 * Axial and equatorial substituent angles for each chair ring carbon.
 * @returns {Array<{axialAngle:number, equatorialAngle:number}>}
 */
export const getChairSubstituentAngles = (chairVertices, centerX, centerY, flip = false) => {
  const equatorialOffset = 15 * (Math.PI / 180);
  const middleEquatorialAngle = 120 * (Math.PI / 180);
  return chairVertices.map((vertex, i) => {
    const radialX = vertex.x - centerX;
    const axialPolarity = (i % 2 === 0 ? 1 : -1) * (flip ? -1 : 1);
    const horizontalDir = radialX >= 0 ? 1 : -1;

    const axialAngle = axialPolarity < 0 ? (-Math.PI / 2) : (Math.PI / 2);
    const equatorialGoesDown = axialPolarity < 0; // Up axial => down equatorial, and vice versa.

    let equatorialAngle;
    if (CHAIR_MIDDLE_VERTEX_INDEXES.has(i)) {
      // Middle chair carbons use a steeper equatorial direction to keep substituent preview clear.
      equatorialAngle = i === 2
        ? -(Math.PI - middleEquatorialAngle)
        : middleEquatorialAngle;
    } else if (horizontalDir > 0) {
      equatorialAngle = equatorialGoesDown ? equatorialOffset : -equatorialOffset;
    } else {
      equatorialAngle = Math.PI + (equatorialGoesDown ? -equatorialOffset : equatorialOffset);
    }

    return {
      axialAngle: normalizeAngle(axialAngle),
      equatorialAngle: normalizeAngle(equatorialAngle)
    };
  });
};

/**
 * Front/back bond endpoints for a Newman projection.
 * @returns {{frontEndpoints:Array, backStarts:Array, backEndpoints:Array}}
 */
export const getNewmanProjectionGeometry = (
  centerX,
  centerY,
  radius,
  backRotationDeg = 60,
  rotation = 0
) => {
  const frontAnglesBase = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const phaseShift = (backRotationDeg * Math.PI) / 180;
  const frontOutsideBondLength = radius * 1.6;
  const backOutsideBondLength = radius * 0.9;

  const frontAngles = frontAnglesBase.map(angle => normalizeAngle(angle + rotation));
  const backAngles = frontAnglesBase.map(angle => normalizeAngle(angle + phaseShift + rotation));

  const frontEndpoints = frontAngles.map(angle => ({
    x: centerX + Math.cos(angle) * frontOutsideBondLength,
    y: centerY + Math.sin(angle) * frontOutsideBondLength
  }));

  const backStarts = backAngles.map(angle => ({
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  }));

  const backEndpoints = backAngles.map(angle => ({
    x: centerX + Math.cos(angle) * (radius + backOutsideBondLength),
    y: centerY + Math.sin(angle) * (radius + backOutsideBondLength)
  }));

  return { frontEndpoints, backStarts, backEndpoints };
};
