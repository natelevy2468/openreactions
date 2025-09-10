// API base URL - adjust this based on your backend deployment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Generic request function with error handling
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle empty responses (like DELETE requests)
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

// Molecule API functions
export const moleculeApi = {
  // Get all molecules
  getAllMolecules: async () => {
    return apiRequest('/molecules');
  },

  // Get molecule by ID
  getMolecule: async (id) => {
    return apiRequest(`/molecules/${id}`);
  },

  // Create new molecule
  createMolecule: async (molecule) => {
    return apiRequest('/molecules', {
      method: 'POST',
      body: JSON.stringify(molecule),
    });
  },

  // Update molecule
  updateMolecule: async (id, molecule) => {
    return apiRequest(`/molecules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(molecule),
    });
  },

  // Delete molecule
  deleteMolecule: async (id) => {
    return apiRequest(`/molecules/${id}`, {
      method: 'DELETE',
    });
  },

  // Get vertices for a molecule
  getMoleculeVertices: async (id) => {
    return apiRequest(`/molecules/${id}/vertices`);
  },

  // Add vertex to molecule
  addVertexToMolecule: async (id, vertex) => {
    return apiRequest(`/molecules/${id}/vertices`, {
      method: 'POST',
      body: JSON.stringify(vertex),
    });
  },

  // Get segments for a molecule
  getMoleculeSegments: async (id) => {
    return apiRequest(`/molecules/${id}/segments`);
  },

  // Add segment to molecule
  addSegmentToMolecule: async (id, segment) => {
    return apiRequest(`/molecules/${id}/segments`, {
      method: 'POST',
      body: JSON.stringify(segment),
    });
  },

  // Get molecule bounds
  getMoleculeBounds: async (id) => {
    return apiRequest(`/molecules/${id}/bounds`);
  },

  // Search molecules by name
  searchMolecules: async (name) => {
    return apiRequest(`/molecules/search?name=${encodeURIComponent(name)}`);
  },

  // Get molecules by element
  getMoleculesByElement: async (element) => {
    return apiRequest(`/molecules/element/${element}`);
  },

  // Get molecules by atom count
  getMoleculesByAtomCount: async (count) => {
    return apiRequest(`/molecules/atoms/${count}`);
  },

  // Get molecules by bond count
  getMoleculesByBondCount: async (count) => {
    return apiRequest(`/molecules/bonds/${count}`);
  },
};

// Vertex API functions
export const vertexApi = {
  // Get vertex by ID
  getVertex: async (id) => {
    return apiRequest(`/vertices/${id}`);
  },

  // Create vertex
  createVertex: async (vertex) => {
    return apiRequest('/vertices', {
      method: 'POST',
      body: JSON.stringify(vertex),
    });
  },

  // Update vertex
  updateVertex: async (id, vertex) => {
    return apiRequest(`/vertices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vertex),
    });
  },

  // Delete vertex
  deleteVertex: async (id) => {
    return apiRequest(`/vertices/${id}`, {
      method: 'DELETE',
    });
  },
};

// Segment API functions
export const segmentApi = {
  // Get segment by ID
  getSegment: async (id) => {
    return apiRequest(`/segments/${id}`);
  },

  // Create segment
  createSegment: async (segment) => {
    return apiRequest('/segments', {
      method: 'POST',
      body: JSON.stringify(segment),
    });
  },

  // Update segment
  updateSegment: async (id, segment) => {
    return apiRequest(`/segments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(segment),
    });
  },

  // Delete segment
  deleteSegment: async (id) => {
    return apiRequest(`/segments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Drawing operations API
export const drawingApi = {
  // Create a new drawing session
  createNewMolecule: async (name = 'New Molecule') => {
    const molecule = {
      name,
      description: 'Created in OpenReactions draw tool',
      canvasWidth: 800,
      canvasHeight: 600,
    };
    return moleculeApi.createMolecule(molecule);
  },

  // Add vertex at specific coordinates
  addVertex: async (moleculeId, x, y, element = 'C') => {
    const vertex = {
      x: x,
      y: y,
      element: element,
      charge: 0,
      radicalElectrons: 0,
      lonePairs: 0,
      isOffGrid: false,
    };
    return moleculeApi.addVertexToMolecule(moleculeId, vertex);
  },

  // Connect two vertices with a bond
  connectVertices: async (moleculeId, startVertexId, endVertexId, bondOrder = 1, bondType = 'single') => {
    const segment = {
      startVertex: { id: startVertexId },
      endVertex: { id: endVertexId },
      bondOrder: bondOrder,
      bondType: bondType,
    };
    return moleculeApi.addSegmentToMolecule(moleculeId, segment);
  },

  // Save current drawing state
  saveDrawing: async (moleculeId, vertices, segments) => {
    try {
      // Update each vertex
      for (const vertex of vertices) {
        if (vertex.id) {
          await vertexApi.updateVertex(vertex.id, vertex);
        } else {
          await moleculeApi.addVertexToMolecule(moleculeId, vertex);
        }
      }

      // Update each segment
      for (const segment of segments) {
        if (segment.id) {
          await segmentApi.updateSegment(segment.id, segment);
        } else {
          await moleculeApi.addSegmentToMolecule(moleculeId, segment);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to save drawing:', error);
      throw error;
    }
  },
};

// Utility functions for common operations
export const apiUtils = {
  // Check if backend is available
  checkConnection: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/molecules`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  },

  // Create sample molecule for testing
  createSampleMolecule: async () => {
    try {
      // Create methane molecule (CH4)
      const molecule = await drawingApi.createNewMolecule('Methane');
      
      // Add carbon atom at center
      const carbonVertex = await drawingApi.addVertex(molecule.id, 400, 300, 'C');
      
      // Add hydrogen atoms around carbon
      const positions = [
        { x: 450, y: 280 },
        { x: 450, y: 320 },
        { x: 350, y: 280 },
        { x: 350, y: 320 },
      ];
      
      for (const pos of positions) {
        const hydrogenVertex = await drawingApi.addVertex(molecule.id, pos.x, pos.y, 'H');
        await drawingApi.connectVertices(molecule.id, carbonVertex.id, hydrogenVertex.id, 1, 'single');
      }
      
      return molecule;
    } catch (error) {
      console.error('Failed to create sample molecule:', error);
      throw error;
    }
  },
};

export default {
  moleculeApi,
  vertexApi,
  segmentApi,
  drawingApi,
  apiUtils,
}; 