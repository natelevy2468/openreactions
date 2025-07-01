import React, { useState, useEffect } from 'react';

// Format molecular formula with subscript numbers
const formatMolecularFormula = (formula) => {
  if (!formula) return formula;
  
  // Split the formula into element-number pairs and format with subscripts
  const parts = [];
  let currentPart = '';
  
  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];
    
    if (/[A-Z]/.test(char)) {
      // New element - push previous part and start new one
      if (currentPart) {
        parts.push(formatFormulaPart(currentPart));
        currentPart = '';
      }
      currentPart += char;
    } else {
      currentPart += char;
    }
  }
  
  // Add the last part
  if (currentPart) {
    parts.push(formatFormulaPart(currentPart));
  }
  
  return parts;
};

// Format individual formula part (e.g., "C6" -> "C" + subscript "6")
const formatFormulaPart = (part) => {
  const match = part.match(/([A-Z][a-z]?)(\d*)/);
  if (!match) return part;
  
  const [, element, number] = match;
  
  if (number) {
    return (
      <span key={part}>
        {element}
        <sub style={{ fontSize: '0.8em' }}>{number}</sub>
      </span>
    );
  }
  
  return element;
};

// Parse molecular formula into individual elements and their counts
const parseFormulaString = async (formulaString, useBackend = false) => {
  const elementCount = {};
  
  if (!formulaString || formulaString.trim() === '') {
    return { 'C': 1 }; // Default to carbon for empty/implicit
  }

  const formula = formulaString.trim();
  
  // Client-side fallback parsing
  // Handle simple single elements first
  if (/^[A-Z][a-z]?$/.test(formula)) {
    elementCount[formula] = 1;
    return elementCount;
  }
  
  // Parse complex formulas like H2SO4, CaCl2, etc.
  const pattern = /([A-Z][a-z]?)(\d*)/g;
  let match;
  let hasElements = false;
  
  while ((match = pattern.exec(formula)) !== null) {
    const element = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    elementCount[element] = (elementCount[element] || 0) + count;
    hasElements = true;
  }
  
  // If no valid elements found, treat as carbon
  if (!hasElements) {
    elementCount['C'] = 1;
  }
  
  return elementCount;
};

const MolecularProperties = ({ vertices, bonds, onExpandedChange }) => {
  const [properties, setProperties] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate simple properties client-side with proper formula parsing
  const calculateBasicProperties = async () => {
    if (!vertices || vertices.length === 0) return null;



    // Count all elements from all vertices
    const totalElementCount = {};
    let totalAtoms = 0;
    
    // Process each vertex and parse its formula
    for (const vertex of vertices) {
      // Get the element/formula from vertex.element (which comes from atom labels)
      const elementOrFormula = vertex.element || 'C';
      // Parse the formula to get individual element counts (async)
      const parsedElements = await parseFormulaString(elementOrFormula);
      
      // Add each element to the total count
      Object.entries(parsedElements).forEach(([element, count]) => {
        totalElementCount[element] = (totalElementCount[element] || 0) + count;
        totalAtoms += count;
      });
    }

    // Build molecular formula (C first, then H, then alphabetical)
    let formula = '';
    
    // Make a copy to avoid modeting the original
    const elementCountCopy = { ...totalElementCount };
    
    if (elementCountCopy.C) {
      formula += elementCountCopy.C > 1 ? `C${elementCountCopy.C}` : 'C';
      delete elementCountCopy.C;
    }
    if (elementCountCopy.H) {
      formula += elementCountCopy.H > 1 ? `H${elementCountCopy.H}` : 'H';
      delete elementCountCopy.H;
    }
    
    // Add other elements alphabetically
    Object.keys(elementCountCopy)
      .sort()
      .forEach(element => {
        const count = elementCountCopy[element];
        formula += count > 1 ? `${element}${count}` : element;
      });
    
    // Calculate molecular weight with proper element parsing
    const atomicWeights = {
      'H': 1.008, 'C': 12.011, 'N': 14.007, 'O': 15.999,
      'F': 18.998, 'P': 30.974, 'S': 32.065, 'Cl': 35.453,
      'Ca': 40.078, 'Fe': 55.845, 'Br': 79.904, 'I': 126.904
    };
    
    let totalWeight = 0;
    Object.entries(totalElementCount).forEach(([element, count]) => {
      const atomicWeight = atomicWeights[element] || 12.011; // Default to carbon weight
      const elementWeight = atomicWeight * count;
      totalWeight += elementWeight;
    });

    return {
      formula: formula || 'Unknown',
      molecularWeight: totalWeight.toFixed(1),
      atomCount: totalAtoms,
      bondCount: bonds ? bonds.length : 0
    };
  };

  // Auto-calculate when molecule changes
  useEffect(() => {
    const updateProperties = async () => {
      const basicProps = await calculateBasicProperties();
      setProperties(basicProps);
    };
    
    updateProperties();
  }, [vertices, bonds]);

  // Notify parent when expanded state changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded);
    }
  }, [isExpanded, onExpandedChange]);



  if (!properties) return null;

  if (!isExpanded) {
    // Collapsed state - show just a small indicator
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#e9ecef',
          color: '#333',
          border: '1px solid #e3e7eb',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#dee2e6';
          e.target.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#e9ecef';
          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }}
        title="Click to view molecular properties"
      >
        <span>🧪</span>
        <span>{formatMolecularFormula(properties.formula)}</span>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>▶</span>
      </div>
    );
  }

  // Expanded state - show full panel
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #e3e7eb',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '13px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      minWidth: '220px',
      fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <strong style={{ color: '#333', fontSize: '14px' }}>Molecule Properties</strong>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#666',
            padding: '2px'
          }}
          title="Collapse panel"
        >
          ✕
        </button>
      </div>
      
      <div style={{ color: '#666', lineHeight: '1.5', marginBottom: '12px' }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>Formula:</strong> <span style={{ color: '#333', fontWeight: '500' }}>{formatMolecularFormula(properties.formula)}</span>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <strong>Weight:</strong> <span style={{ color: '#333', fontWeight: '500' }}>{properties.molecularWeight} g/mol</span>
        </div>
        <div>
          <strong>Structure:</strong> {properties.atomCount} atoms, {properties.bondCount} bonds
        </div>
      </div>


    </div>
  );
};

export default MolecularProperties; 