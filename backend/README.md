# OpenReactions Backend

🧪 **Molecular Geometry & Chemical Calculations Backend**

A Spring Boot backend service that provides molecular geometry calculations, 3D coordinate generation, and chemical property analysis for the OpenReactions molecular drawing application.

## 🚀 Features

- **Molecular Property Calculations**: Automatic calculation of molecular formula, weight, and SMILES notation
- **3D Coordinate Generation**: Convert 2D molecular drawings to 3D structures
- **Bond Analysis**: Calculate bond lengths and angles
- **Chemical Database**: Store and retrieve molecular structures
- **REST API**: Full RESTful API for frontend integration
- **Chemistry Development Kit (CDK)**: Powered by the industry-standard CDK library

## 🛠️ Technologies Used

- **Java 17** - Modern Java with record types and enhanced features
- **Spring Boot 3.2** - Enterprise-grade web framework
- **Spring Data JPA** - Database abstraction layer
- **H2 Database** - In-memory database for development
- **Chemistry Development Kit (CDK)** - Molecular calculations and SMILES generation
- **Maven** - Dependency management and build tool

## 📋 Prerequisites

- **Java 17** or higher
- **Maven 3.6+** 
- Your React frontend running on `http://localhost:5173`

## 🏃‍♀️ Quick Start

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
mvn clean install
```

### 3. Run the Application
```bash
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 4. Verify It's Working
Visit: `http://localhost:8080/api/molecules/health`

You should see:
```json
{
  "status": "OK",
  "service": "Molecular Geometry Backend",
  "message": "🧪 Ready for chemical calculations!"
}
```

## 📡 API Endpoints

### Molecule Management
- `GET /api/molecules` - Get all molecules
- `POST /api/molecules` - Save a new molecule
- `GET /api/molecules/{id}` - Get molecule by ID
- `DELETE /api/molecules/{id}` - Delete a molecule

### Molecular Calculations
- `POST /api/molecules/{id}/generate3d` - Generate 3D coordinates
- `GET /api/molecules/{id}/angles` - Calculate bond angles

### Search & Filter
- `GET /api/molecules/search?query={name}` - Search by name
- `GET /api/molecules/formula/{formula}` - Find by molecular formula
- `GET /api/molecules/weight?minWeight={min}&maxWeight={max}` - Filter by molecular weight
- `GET /api/molecules/recent` - Get recently created molecules

### System
- `GET /api/molecules/health` - Health check

## 🧪 Example Usage

### Save a Molecule from Frontend
```javascript
const moleculeData = {
  name: "Ethanol",
  vertices: [
    { vertexId: "v1", element: "C", x2d: 100, y2d: 100 },
    { vertexId: "v2", element: "C", x2d: 150, y2d: 100 },
    { vertexId: "v3", element: "O", x2d: 200, y2d: 100 }
  ],
  bonds: [
    { bondId: "b1", fromVertexId: "v1", toVertexId: "v2", bondType: "SINGLE" },
    { bondId: "b2", fromVertexId: "v2", toVertexId: "v3", bondType: "SINGLE" }
  ]
};

fetch('http://localhost:8080/api/molecules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(moleculeData)
})
.then(response => response.json())
.then(data => {
  console.log('Saved molecule:', data);
  // Backend automatically calculates:
  // - molecularFormula: "C2H6O"
  // - molecularWeight: 46.068
  // - smilesNotation: "CCO"
});
```

### Generate 3D Coordinates
```javascript
fetch('http://localhost:8080/api/molecules/1/generate3d', {
  method: 'POST'
})
.then(response => response.json())
.then(molecule => {
  console.log('3D coordinates generated:', molecule.vertices);
  // Each vertex now has x3d, y3d, z3d properties
});
```

## 🗄️ Database

### Development Database (H2)
- **Console**: http://localhost:8080/h2-console
- **JDBC URL**: `jdbc:h2:mem:openreactions`
- **Username**: `sa`
- **Password**: *(empty)*

### Data Model
```
Molecule
├── id (Long)
├── name (String)
├── description (String)
├── molecularFormula (String) - Calculated
├── molecularWeight (Double) - Calculated
├── smilesNotation (String) - Calculated
├── has3dCoordinates (Boolean)
├── vertices (List<Vertex>)
└── bonds (List<Bond>)

Vertex
├── id (Long)
├── vertexId (String) - Frontend ID
├── element (String)
├── x2d, y2d (Double) - 2D coordinates
├── x3d, y3d, z3d (Double) - 3D coordinates
├── formalCharge (Integer)
├── isAromatic (Boolean)
└── isOffGrid (Boolean)

Bond
├── id (Long)
├── bondId (String) - Frontend ID
├── fromVertexId, toVertexId (String)
├── bondType (SINGLE, DOUBLE, TRIPLE, AROMATIC)
├── length2d, length3d (Double) - Calculated
├── isAromatic (Boolean)
└── ringSize (Integer)
```

## 🔧 Configuration

### Key Configuration Files
- `application.properties` - Database, server, and logging configuration
- `WebConfig.java` - CORS configuration for frontend communication
- `pom.xml` - Dependencies and build configuration

### Environment Variables
You can override configuration with environment variables:
- `SERVER_PORT` - Change server port (default: 8080)
- `SPRING_DATASOURCE_URL` - Use different database
- `CORS_ALLOWED_ORIGINS` - Configure allowed origins

## 🧪 Chemical Calculations

### Supported Features
- **Molecular Formula Generation**: Automatic Hill notation (C, H, then alphabetical)
- **Molecular Weight Calculation**: Sum of atomic weights
- **SMILES Generation**: Using CDK's SMILES generator
- **Bond Length Calculation**: 2D and 3D distances
- **Bond Angle Calculation**: Geometric angles between bonds
- **3D Coordinate Generation**: Basic 3D structure from 2D layout

### Chemistry Development Kit (CDK)
The backend uses CDK 2.8 for:
- Atom type perception
- SMILES notation generation
- Molecular property calculations
- Chemical structure validation

## 🚀 Production Deployment

### Building for Production
```bash
mvn clean package -Pproduction
```

### Docker Deployment
```dockerfile
FROM openjdk:17-jre-slim
COPY target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### Environment Configuration
For production, update `application.properties`:
```properties
# Use PostgreSQL instead of H2
spring.datasource.url=jdbc:postgresql://localhost:5432/openreactions
spring.jpa.hibernate.ddl-auto=validate
spring.h2.console.enabled=false
```

## 🤝 Integration with Frontend

Your React frontend can now:
1. **Save molecules** by posting to `/api/molecules`
2. **Load saved molecules** from `/api/molecules`
3. **Generate 3D structures** for visualization
4. **Calculate molecular properties** automatically
5. **Search and filter** molecules by various criteria

The backend automatically handles:
- Molecular formula calculation
- Molecular weight computation
- SMILES notation generation
- Bond length and angle calculations
- 3D coordinate generation

## 🐛 Troubleshooting

### Common Issues
1. **Port 8080 already in use**: Change port in `application.properties`
2. **CORS errors**: Verify frontend URL in CORS configuration
3. **CDK import errors**: Check Maven dependencies are downloaded
4. **Database connection errors**: Verify H2 console access

### Logging
Enable debug logging in `application.properties`:
```properties
logging.level.com.openreactions=DEBUG
logging.level.org.hibernate.SQL=DEBUG
```

## 📚 Next Steps

### Potential Enhancements
- **Advanced 3D Algorithms**: Implement proper molecular mechanics
- **Reaction Mechanisms**: Add transition state calculations
- **Quantum Chemistry**: Integrate with computational chemistry tools
- **Machine Learning**: Add property prediction models
- **Authentication**: Add user accounts and saved molecule libraries

---

🧪 **Ready to power your molecular drawing application with advanced chemical calculations!** 