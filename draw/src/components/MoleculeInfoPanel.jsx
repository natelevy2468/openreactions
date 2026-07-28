import React from 'react';

/**
 * Molecule info dropdown (opened from the "Info" button in the top bar).
 * Shows molecular formula, average molecular weight, monoisotopic mass, and
 * atom / ring counts for whatever is currently drawn. Purely presentational —
 * the parent computes `info` (via graphToFormula) and passes it in. Renders
 * nothing unless `show` is true.
 *
 * @param {boolean}  show
 * @param {Object}   colors
 * @param {Object|null} info  { formula, weight, monoisotopic, atomCount, ringCount } or null
 */

// Render a chemical formula with numeric subscripts (C6H6 -> C₆H₆).
const FormulaText = ({ formula, color }) => {
  if (!formula) return null;
  const parts = formula.split(/(\d+)/);
  return (
    <span style={{ color, fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', fontSize: '20px', fontWeight: 600 }}>
      {parts.map((p, i) => (
        /^\d+$/.test(p)
          ? <sub key={i} style={{ fontSize: '13px' }}>{p}</sub>
          : <span key={i}>{p}</span>
      ))}
    </span>
  );
};

const Row = ({ label, value, colors }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0' }}>
    <span style={{ color: colors.textSecondary, fontSize: '13px' }}>{label}</span>
    <span style={{ color: colors.text, fontSize: '14px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

export default function MoleculeInfoPanel({ show, colors, info }) {
  if (!show) return null;

  const hasMolecule = info && info.atomCount > 0;

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '100%',
      backgroundColor: colors.surface,
      minWidth: '250px',
      boxShadow: `0 8px 16px ${colors.shadow}`,
      borderRadius: '8px',
      border: `1px solid ${colors.border}`,
      zIndex: 1000,
      marginTop: '8px',
      padding: '16px',
      fontFamily: 'Roboto, sans-serif',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '20px',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: `8px solid ${colors.surface}`
      }} />
      <div style={{ color: colors.text, fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
        Molecule Info
      </div>

      {!hasMolecule ? (
        <div style={{ color: colors.textSecondary, fontSize: '13px', padding: '4px 0 2px' }}>
          Draw a structure to see its formula and weight.
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center',
            gap: '8px', padding: '4px 0 12px', borderBottom: `1px solid ${colors.border}`, marginBottom: '8px'
          }}>
            <FormulaText formula={info.formula} color={colors.text} />
          </div>
          <Row label="Molecular weight" value={`${info.weight.toFixed(2)} g/mol`} colors={colors} />
          <Row label="Monoisotopic mass" value={info.monoisotopic.toFixed(4)} colors={colors} />
          <Row label="Atoms (heavy)" value={info.atomCount} colors={colors} />
          <Row label="Rings" value={info.ringCount} colors={colors} />
          {info.warnings && info.warnings.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {info.warnings.map((w, i) => (
                <div key={i} style={{ color: '#c77', fontSize: '11.5px', marginTop: '2px' }}>⚠ {w}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
