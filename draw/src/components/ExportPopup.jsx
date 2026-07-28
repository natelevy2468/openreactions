import React from 'react';

/**
 * Export dialog — shows the rendered PNG preview with Save / Copy actions.
 * Extracted verbatim from HexGridWithToolbar to shrink that file. Renders nothing
 * unless `show` is true and an image URL is present.
 *
 * @param {boolean}  show        Whether the popup is open
 * @param {string}   imageUrl    Data/blob URL of the rendered PNG
 * @param {Object}   metadata    { width, height, scaleFactor } or null
 * @param {Function} onClose     Called to dismiss and clear the export state
 * @param {Object}   colors      Theme colors (uses colors.border)
 */
export default function ExportPopup({ show, imageUrl, metadata, onClose, colors }) {
  if (!show || !imageUrl) return null;

  return (
    <>
      {/* Overlay for dismissing popup by clicking outside */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 15,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 16,
          pointerEvents: 'auto',
          width: '500px',
          maxWidth: '90vw',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '2px solid #e0e0e0',
          padding: '30px',
          textAlign: 'center',
          fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
        }}
      >
        <div style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: '20px',
        }}>
          Export Molecular Structure
        </div>

        {/* Image Preview */}
        <div style={{
          marginBottom: '24px',
          border: '2px solid #e0e0e0',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
        }}>
          <img
            src={imageUrl}
            alt="Molecular structure preview"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              objectFit: 'contain',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <button
            onClick={() => {
              // Create download link with smart filename
              const link = document.createElement('a');
              link.href = imageUrl;

              const date = new Date().toISOString().split('T')[0];
              const sizeInfo = metadata ? `_${metadata.width}x${metadata.height}` : '';
              link.download = `molecule_${date}${sizeInfo}.png`;

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#45a049';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4CAF50';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Save as PNG
          </button>

          <button
            onClick={async (e) => {
              const btn = e.currentTarget;
              try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();

                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]);

                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.style.backgroundColor = '#28a745';
                setTimeout(() => {
                  btn.innerHTML = originalText;
                  btn.style.backgroundColor = '#2196F3';
                }, 1500);
              } catch (error) {
                alert('Clipboard copy failed. Please use "Save as PNG" instead.');
              }
            }}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1976D2';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2196F3';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Image
          </button>
        </div>

        <div style={{
          fontSize: '13px',
          color: '#666',
          marginBottom: '20px',
          lineHeight: '1.4',
        }}>
          {metadata ? (
            <>
              Cropped to drawing: {metadata.width}×{metadata.height}px • {metadata.scaleFactor}× scale (same pixels as canvas)
            </>
          ) : (
            'PNG zoomed to your structure — copied from the canvas'
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            backgroundColor: '#e9ecef',
            color: '#333',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#dee2e6'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#e9ecef'}
        >
          Close
        </button>
      </div>
    </>
  );
}
