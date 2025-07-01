package com.openreactions.backend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "bonds")
public class Bond {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String bondId; // Original ID from frontend
    private String fromVertexId;
    private String toVertexId;
    
    @Enumerated(EnumType.STRING)
    private BondType bondType = BondType.SINGLE;
    
    // Geometric properties
    private Double length2d; // 2D distance
    private Double length3d; // 3D distance (calculated)
    private Double angle; // Bond angle in degrees
    
    // Chemical properties
    private Boolean isAromatic = false;
    private Boolean isInRing = false;
    private Integer ringSize; // Size of ring this bond belongs to
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "molecule_id")
    @JsonBackReference
    private Molecule molecule;
    
    public enum BondType {
        SINGLE, DOUBLE, TRIPLE, AROMATIC
    }
    
    // Constructors
    public Bond() {}
    
    public Bond(String bondId, String fromVertexId, String toVertexId, BondType bondType) {
        this.bondId = bondId;
        this.fromVertexId = fromVertexId;
        this.toVertexId = toVertexId;
        this.bondType = bondType;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getBondId() { return bondId; }
    public void setBondId(String bondId) { this.bondId = bondId; }
    
    public String getFromVertexId() { return fromVertexId; }
    public void setFromVertexId(String fromVertexId) { this.fromVertexId = fromVertexId; }
    
    public String getToVertexId() { return toVertexId; }
    public void setToVertexId(String toVertexId) { this.toVertexId = toVertexId; }
    
    public BondType getBondType() { return bondType; }
    public void setBondType(BondType bondType) { this.bondType = bondType; }
    
    public Double getLength2d() { return length2d; }
    public void setLength2d(Double length2d) { this.length2d = length2d; }
    
    public Double getLength3d() { return length3d; }
    public void setLength3d(Double length3d) { this.length3d = length3d; }
    
    public Double getAngle() { return angle; }
    public void setAngle(Double angle) { this.angle = angle; }
    
    public Boolean getIsAromatic() { return isAromatic; }
    public void setIsAromatic(Boolean isAromatic) { this.isAromatic = isAromatic; }
    
    public Boolean getIsInRing() { return isInRing; }
    public void setIsInRing(Boolean isInRing) { this.isInRing = isInRing; }
    
    public Integer getRingSize() { return ringSize; }
    public void setRingSize(Integer ringSize) { this.ringSize = ringSize; }
    
    public Molecule getMolecule() { return molecule; }
    public void setMolecule(Molecule molecule) { this.molecule = molecule; }
} 