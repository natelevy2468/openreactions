# OpenReactions - Molecular Drawing Application

A full-stack molecular drawing application with a React frontend and Java Spring Boot backend.

## Architecture Overview

```
┌─────────────────────┐    HTTP/REST API    ┌─────────────────────┐
│                     │  ←─────────────→    │                     │
│   React Frontend    │                     │ Java Spring Boot   │
│                     │                     │     Backend         │
│  • Canvas Rendering │   WebSocket API     │                     │
│  • User Interface   │  ←─────────────→    │  • REST API         │
│  • API Integration  │                     │  • JPA/Hibernate    │
│                     │                     │  • H2 Database      │
└─────────────────────┘                     │  • WebSocket        │
                                            └─────────────────────┘
```

### Key Components

**Backend (Java Spring Boot)**:
- **Models**: `Molecule`, `Vertex`, `Segment` - Core data structures
- **REST API**: Full CRUD operations for molecular data
- **Database**: H2 in-memory database with JPA/Hibernate
- **WebSocket**: Real-time collaboration support
- **CORS**: Configured for frontend integration

**Frontend (React)**:
- **MoleculeCanvas**: Canvas component for rendering molecules
- **API Service**: HTTP client for backend communication
- **UserInterface**: Main UI with toolbar and drawing tools
- **Real-time Updates**: WebSocket integration ready

### Data Flow

1. **User Interaction**: User clicks toolbar buttons or canvas
2. **API Request**: React app sends HTTP requests to backend
3. **Backend Processing**: Java backend processes and stores data
4. **Database Update**: Data persisted in H2 database
5. **API Response**: Backend returns updated molecular data
6. **Canvas Rendering**: React renders molecules on canvas

## Quick Start

### 1. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080` with:
- REST API endpoints at `/api/*`
- H2 Database console at `/h2-console`
- WebSocket endpoint at `/ws`

### 2. Start the Frontend

```bash
cd draw
npm install
npm run dev
```

The frontend will start on `http://localhost:5173` and automatically connect to the backend.

### 3. Test the Integration

1. Open the React app in your browser
2. Check the status bar - should show "Backend connected" 
3. Click "Create Sample" to create a test methane molecule
4. The molecule should render on the canvas automatically

## Backend API Documentation

### Core Endpoints

#### Molecules
```
GET    /api/molecules           - Get all molecules
POST   /api/molecules           - Create new molecule
GET    /api/molecules/{id}      - Get molecule by ID
PUT    /api/molecules/{id}      - Update molecule
DELETE /api/molecules/{id}      - Delete molecule
```

#### Vertices (Atoms)
```
GET    /api/molecules/{id}/vertices     - Get vertices for molecule
POST   /api/molecules/{id}/vertices     - Add vertex to molecule
GET    /api/vertices/{id}               - Get vertex by ID
PUT    /api/vertices/{id}               - Update vertex
DELETE /api/vertices/{id}               - Delete vertex
```

#### Segments (Bonds)
```
GET    /api/molecules/{id}/segments     - Get segments for molecule
POST   /api/molecules/{id}/segments     - Add segment to molecule
GET    /api/segments/{id}               - Get segment by ID
PUT    /api/segments/{id}               - Update segment
DELETE /api/segments/{id}               - Delete segment
```

#### Search & Analysis
```
GET    /api/molecules/search?name=...   - Search molecules by name
GET    /api/molecules/element/{element} - Get molecules containing element
GET    /api/molecules/atoms/{count}     - Get molecules by atom count
GET    /api/molecules/bonds/{count}     - Get molecules by bond count
GET    /api/molecules/{id}/bounds       - Get molecular bounds for rendering
```

### Sample API Usage

#### Create a New Molecule
```javascript
// Frontend API call
const molecule = await drawingApi.createNewMolecule('Caffeine');
```

```json
// Backend JSON payload
{
  "name": "Caffeine",
  "description": "Created in OpenReactions draw tool",
  "canvasWidth": 800,
  "canvasHeight": 600
}
```

#### Add a Vertex (Atom)
```javascript
// Frontend API call  
const vertex = await drawingApi.addVertex(moleculeId, 100, 150, 'N');
```

```json
// Backend JSON payload
{
  "x": 100,
  "y": 150, 
  "element": "N",
  "charge": 0,
  "radicalElectrons": 0,
  "lonePairs": 0,
  "isOffGrid": false
}
```

#### Connect Two Vertices with a Bond
```javascript
// Frontend API call
const segment = await drawingApi.connectVertices(
  moleculeId, 
  startVertexId, 
  endVertexId, 
  2, // double bond
  'double'
);
```

```json
// Backend JSON payload
{
  "startVertex": { "id": 1 },
  "endVertex": { "id": 2 },
  "bondOrder": 2,
  "bondType": "double"
}
```

## Frontend Integration

### Using the MoleculeCanvas Component

```jsx
import MoleculeCanvas from './components/MoleculeCanvas';

// Render a molecule on canvas
<MoleculeCanvas 
  moleculeId={molecule.id}
  width={800}
  height={600}
/>
```

### API Service Usage

```javascript
import { moleculeApi, drawingApi } from './services/api';

// Create and display a molecule
const createMolecule = async () => {
  // Create new molecule
  const molecule = await drawingApi.createNewMolecule('Benzene');
  
  // Add carbon vertices in a ring
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const x = 300 + Math.cos(angle) * 50;
    const y = 300 + Math.sin(angle) * 50;
    const vertex = await drawingApi.addVertex(molecule.id, x, y, 'C');
    vertices.push(vertex);
  }
  
  // Connect vertices to form ring
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const bondOrder = i % 2 === 0 ? 2 : 1; // Alternating double/single
    await drawingApi.connectVertices(
      molecule.id,
      vertices[i].id, 
      vertices[next].id,
      bondOrder
    );
  }
  
  return molecule;
};
```

## Canvas Rendering

The `MoleculeCanvas` component handles all rendering logic:

### Supported Features
- **Atoms**: Rendered as circles with element labels
- **Bonds**: Single, double, triple bonds with proper geometry
- **Stereochemistry**: Wedge and dash bonds for 3D representation
- **Charges**: Positive/negative charge indicators
- **Lone Pairs**: Electron pair visualization
- **Auto-scaling**: Automatically fits molecules to canvas
- **Real-time Updates**: Reflects backend data changes instantly

### Rendering Process
1. **Fetch Data**: Load molecule data from backend API
2. **Calculate Bounds**: Determine molecular dimensions
3. **Auto-scale**: Scale and center molecule on canvas
4. **Draw Bonds**: Render all segments/bonds first (background)
5. **Draw Atoms**: Render vertices/atoms on top
6. **Add Labels**: Draw element symbols and charges

## Database Schema

The H2 database automatically creates these tables:

```sql
-- Molecules table
CREATE TABLE molecules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  molecular_formula VARCHAR(255),
  molecular_weight DOUBLE,
  canvas_width INTEGER DEFAULT 800,
  canvas_height INTEGER DEFAULT 600,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

-- Vertices table (Atoms)
CREATE TABLE vertices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  molecule_id BIGINT,
  x_position DOUBLE NOT NULL,
  y_position DOUBLE NOT NULL,
  element VARCHAR(10) DEFAULT 'C',
  charge INTEGER DEFAULT 0,
  radical_electrons INTEGER DEFAULT 0,
  lone_pairs INTEGER DEFAULT 0,
  is_off_grid BOOLEAN DEFAULT FALSE,
  vertex_type VARCHAR(50) DEFAULT 'normal',
  FOREIGN KEY (molecule_id) REFERENCES molecules(id)
);

-- Segments table (Bonds)  
CREATE TABLE segments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  molecule_id BIGINT,
  start_vertex_id BIGINT NOT NULL,
  end_vertex_id BIGINT NOT NULL,
  bond_order INTEGER DEFAULT 1,
  bond_type VARCHAR(50) DEFAULT 'single',
  stereochemistry VARCHAR(20),
  FOREIGN KEY (molecule_id) REFERENCES molecules(id),
  FOREIGN KEY (start_vertex_id) REFERENCES vertices(id),
  FOREIGN KEY (end_vertex_id) REFERENCES vertices(id)
);
```

## Development Tools

### Backend Development
- **H2 Console**: Access at `http://localhost:8080/h2-console`
  - JDBC URL: `jdbc:h2:mem:openreactions`
  - Username: `sa`
  - Password: `password`
- **API Testing**: Use Postman or curl with provided endpoints
- **Logging**: Debug-level SQL logging enabled

### Frontend Development
- **React Dev Tools**: Browser extension for component debugging
- **Network Tab**: Monitor API requests to backend
- **Console**: Check for API errors and WebSocket messages

### Sample Backend Queries

```sql
-- View all molecules
SELECT * FROM molecules;

-- View molecule with vertices and segments
SELECT m.name, v.element, v.x_position, v.y_position
FROM molecules m 
JOIN vertices v ON m.id = v.molecule_id 
WHERE m.id = 1;

-- Count bond types in a molecule
SELECT s.bond_type, COUNT(*) 
FROM segments s 
WHERE s.molecule_id = 1 
GROUP BY s.bond_type;
```

## Extending the System

### Adding New Bond Types
1. **Backend**: Update `Segment.java` bond type validation
2. **Frontend**: Add rendering logic in `MoleculeCanvas.jsx`
3. **UI**: Add new toolbar button in `UserInterface.jsx`

### Adding New Atom Properties
1. **Backend**: Add fields to `Vertex.java` model
2. **Database**: Schema updates automatic with JPA
3. **Frontend**: Update rendering in canvas component
4. **API**: Extend endpoint responses

### Adding Real-time Collaboration
1. **Backend**: Use `DrawingWebSocketController` for live updates
2. **Frontend**: Implement WebSocket client connection
3. **UI**: Show live cursors and changes from other users

## Troubleshooting

### Backend Issues
- **Port 8080 in use**: Change port in `application.properties`
- **Database errors**: Check H2 console for schema issues
- **CORS errors**: Verify allowed origins in config

### Frontend Issues
- **API connection failed**: Ensure backend is running on correct port
- **Canvas not rendering**: Check browser console for API errors
- **Status shows disconnected**: Verify backend `/api/molecules` endpoint

### Common Solutions
1. **Restart backend**: `mvn spring-boot:run`
2. **Clear browser cache**: Hard refresh (Ctrl+F5)
3. **Check network tab**: Verify API responses
4. **H2 console**: Inspect database state

## Next Steps

This foundation supports:
- ✅ Full-stack molecule creation and rendering  
- ✅ REST API with comprehensive molecular data
- ✅ Canvas-based molecular visualization
- ✅ Real-time backend data integration
- ✅ WebSocket infrastructure for collaboration

**Future enhancements**:
- Interactive drawing tools (click to add atoms/bonds)
- Real-time multi-user collaboration
- Molecular property calculations
- Export to chemical file formats (MOL, SDF)
- Advanced stereochemistry support
- Reaction mechanism drawing 