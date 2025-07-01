package com.openreactions.backend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "vertices")
public class Vertex {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String vertexId; // Original ID from frontend
    private String element;
    
    // 2D coordinates (from frontend)
    private Double x2d;
    private Double y2d;
    
    // 3D coordinates (calculated)
    private Double x3d;
    private Double y3d;
    private Double z3d;
    
    // Chemical properties
    private Integer formalCharge = 0;
    private Integer implicitHydrogens = 0;
    private Boolean isAromatic = false;
    private Boolean isOffGrid = false;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "molecule_id")
    @JsonBackReference
    private Molecule molecule;
    
    // Constructors
    public Vertex() {}
    
    public Vertex(String vertexId, String element, Double x2d, Double y2d) {
        this.vertexId = vertexId;
        this.element = element;
        this.x2d = x2d;
        this.y2d = y2d;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getVertexId() { return vertexId; }
    public void setVertexId(String vertexId) { this.vertexId = vertexId; }
    
    public String getElement() { return element; }
    public void setElement(String element) { this.element = element; }
    
    public Double getX2d() { return x2d; }
    public void setX2d(Double x2d) { this.x2d = x2d; }
    
    public Double getY2d() { return y2d; }
    public void setY2d(Double y2d) { this.y2d = y2d; }
    
    public Double getX3d() { return x3d; }
    public void setX3d(Double x3d) { this.x3d = x3d; }
    
    public Double getY3d() { return y3d; }
    public void setY3d(Double y3d) { this.y3d = y3d; }
    
    public Double getZ3d() { return z3d; }
    public void setZ3d(Double z3d) { this.z3d = z3d; }
    
    public Integer getFormalCharge() { return formalCharge; }
    public void setFormalCharge(Integer formalCharge) { this.formalCharge = formalCharge; }
    
    public Integer getImplicitHydrogens() { return implicitHydrogens; }
    public void setImplicitHydrogens(Integer implicitHydrogens) { this.implicitHydrogens = implicitHydrogens; }
    
    public Boolean getIsAromatic() { return isAromatic; }
    public void setIsAromatic(Boolean isAromatic) { this.isAromatic = isAromatic; }
    
    public Boolean getIsOffGrid() { return isOffGrid; }
    public void setIsOffGrid(Boolean isOffGrid) { this.isOffGrid = isOffGrid; }
    
    public Molecule getMolecule() { return molecule; }
    public void setMolecule(Molecule molecule) { this.molecule = molecule; }
} 