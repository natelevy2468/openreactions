
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { moleculeApi } from '../services/api';

const MoleculeCanvas = ({ moleculeId, width = 800, height = 600 }) => {
  const canvasRef = useRef(null);
  const [molecule, setMolecule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Load molecule data from backend
  const loadMolecule = useCallback(async () => {
    if (!moleculeId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await moleculeApi.getMolecule(moleculeId);
      setMolecule(data);
    } catch (err) {
      setError('Failed to load molecule: ' + err.message);
      console.error('Error loading molecule:', err);
    } finally {
      setLoading(false);
    }
  }, [moleculeId]);

  // Canvas drawing functions
  const drawVertex = useCallback((ctx, vertex, scale, offset) => {
    const x = vertex.x * scale + offset.x;
    const y = vertex.y * scale + offset.y;
    
    // Draw vertex circle
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // Draw element label if not carbon
    if (vertex.element && vertex.element !== 'C') {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vertex.element, x, y - 15);
    }
    
    // Draw charge if present
    if (vertex.charge && vertex.charge !== 0) {
      ctx.font = '12px Arial';
      ctx.fillStyle = vertex.charge > 0 ? '#ff4444' : '#4444ff';
      ctx.textAlign = 'left';
      ctx.fillText(
        vertex.charge > 0 ? '+'.repeat(vertex.charge) : '-'.repeat(-vertex.charge),
        x + 8,
        y - 8
      );
    }
    
    // Draw lone pairs
    if (vertex.lonePairs && vertex.lonePairs > 0) {
      const pairAngle = (2 * Math.PI) / vertex.lonePairs;
      for (let i = 0; i < vertex.lonePairs; i++) {
        const angle = i * pairAngle;
        const pairX = x + Math.cos(angle) * 12;
        const pairY = y + Math.sin(angle) * 12;
        
        ctx.beginPath();
        ctx.arc(pairX - 2, pairY, 1.5, 0, 2 * Math.PI);
        ctx.arc(pairX + 2, pairY, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#666';
        ctx.fill();
      }
    }
  }, []);

  const drawSegment = useCallback((ctx, segment, vertices, scale, offset) => {
    const startVertex = vertices.find(v => v.id === segment.startVertex.id);
    const endVertex = vertices.find(v => v.id === segment.endVertex.id);
    
    if (!startVertex || !endVertex) return;
    
    const x1 = startVertex.x * scale + offset.x;
    const y1 = startVertex.y * scale + offset.y;
    const x2 = endVertex.x * scale + offset.x;
    const y2 = endVertex.y * scale + offset.y;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    if (segment.bondType === 'wedge') {
      // Draw wedge bond
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;
      const perpX = -unitY * 3;
      const perpY = unitX * 3;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 + perpX, y2 + perpY);
      ctx.lineTo(x2 - perpX, y2 - perpY);
      ctx.closePath();
      ctx.fillStyle = '#000';
      ctx.fill();
      
    } else if (segment.bondType === 'dash') {
      // Draw dash bond
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;
      const perpX = -unitY;
      const perpY = unitX;
      
      const dashCount = 6;
      const dashLength = length / dashCount;
      
      for (let i = 0; i < dashCount; i++) {
        const t = (i + 0.5) / dashCount;
        const centerX = x1 + dx * t;
        const centerY = y1 + dy * t;
        const dashWidth = (i / (dashCount - 1)) * 4 + 1;
        
        ctx.beginPath();
        ctx.moveTo(centerX - perpX * dashWidth, centerY - perpY * dashWidth);
        ctx.lineTo(centerX + perpX * dashWidth, centerY + perpY * dashWidth);
        ctx.stroke();
      }
      
    } else if (segment.bondOrder === 2) {
      // Draw double bond
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;
      const perpX = -unitY * 3;
      const perpY = unitX * 3;
      
      ctx.beginPath();
      ctx.moveTo(x1 + perpX, y1 + perpY);
      ctx.lineTo(x2 + perpX, y2 + perpY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x1 - perpX, y1 - perpY);
      ctx.lineTo(x2 - perpX, y2 - perpY);
      ctx.stroke();
      
    } else if (segment.bondOrder === 3) {
      // Draw triple bond
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;
      const perpX = -unitY * 3;
      const perpY = unitX * 3;
      
      // Center line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Side lines
      ctx.beginPath();
      ctx.moveTo(x1 + perpX, y1 + perpY);
      ctx.lineTo(x2 + perpX, y2 + perpY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x1 - perpX, y1 - perpY);
      ctx.lineTo(x2 - perpX, y2 - perpY);
      ctx.stroke();
      
    } else {
      // Draw single bond
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }, []);

  const drawMolecule = useCallback(() => {
    if (!molecule || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate bounds and auto-scale
    if (molecule.vertices && molecule.vertices.length > 0) {
      const bounds = molecule.vertices.reduce((acc, vertex) => ({
        minX: Math.min(acc.minX, vertex.x),
        maxX: Math.max(acc.maxX, vertex.x),
        minY: Math.min(acc.minY, vertex.y),
        maxY: Math.max(acc.maxY, vertex.y)
      }), {
        minX: molecule.vertices[0].x,
        maxX: molecule.vertices[0].x,
        minY: molecule.vertices[0].y,
        maxY: molecule.vertices[0].y
      });
      
      const boundsWidth = bounds.maxX - bounds.minX;
      const boundsHeight = bounds.maxY - bounds.minY;
      const padding = 50;
      
      const scaleX = (canvas.width - 2 * padding) / (boundsWidth || 1);
      const scaleY = (canvas.height - 2 * padding) / (boundsHeight || 1);
      const autoScale = Math.min(scaleX, scaleY, 2); // Max scale of 2
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const boundsX = (bounds.minX + bounds.maxX) / 2;
      const boundsY = (bounds.minY + bounds.maxY) / 2;
      
      const autoOffset = {
        x: centerX - boundsX * autoScale,
        y: centerY - boundsY * autoScale
      };
      
      setScale(autoScale);
      setOffset(autoOffset);
      
      // Draw segments first (so they appear behind vertices)
      if (molecule.segments) {
        molecule.segments.forEach(segment => {
          drawSegment(ctx, segment, molecule.vertices, autoScale, autoOffset);
        });
      }
      
      // Draw vertices
      molecule.vertices.forEach(vertex => {
        drawVertex(ctx, vertex, autoScale, autoOffset);
      });
    }
  }, [molecule, drawVertex, drawSegment]);

  // Load molecule on component mount
  useEffect(() => {
    loadMolecule();
  }, [loadMolecule]);

  // Redraw when molecule data changes
  useEffect(() => {
    drawMolecule();
  }, [drawMolecule]);

  if (loading) {
    return (
      <div style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        Loading molecule...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #ff4444',
        borderRadius: '4px',
        color: '#ff4444'
      }}>
        {error}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        background: '#fff'
      }}
    />
  );
};

export default MoleculeCanvas; 