package com.openreactions.backend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "molecules")
public class Molecule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String description;
    
    @OneToMany(mappedBy = "molecule", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Vertex> vertices = new ArrayList<>();
    
    @OneToMany(mappedBy = "molecule", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Bond> bonds = new ArrayList<>();
    
    // Calculated chemical properties
    private String molecularFormula;
    private Double molecularWeight;
    private String smilesNotation;
    private String inchiKey;
    
    // 3D Properties
    private Boolean has3dCoordinates = false;
    private Double totalEnergy; // Calculated energy in kJ/mol
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime lastModified;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastModified = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        lastModified = LocalDateTime.now();
    }
    
    // Constructors
    public Molecule() {}
    
    public Molecule(String name) {
        this.name = name;
    }
    
    // Helper methods
    public void addVertex(Vertex vertex) {
        vertices.add(vertex);
        vertex.setMolecule(this);
    }
    
    public void addBond(Bond bond) {
        bonds.add(bond);
        bond.setMolecule(this);
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public List<Vertex> getVertices() { return vertices; }
    public void setVertices(List<Vertex> vertices) { 
        this.vertices = vertices; 
        for (Vertex vertex : vertices) {
            vertex.setMolecule(this);
        }
    }
    
    public List<Bond> getBonds() { return bonds; }
    public void setBonds(List<Bond> bonds) { 
        this.bonds = bonds; 
        for (Bond bond : bonds) {
            bond.setMolecule(this);
        }
    }
    
    public String getMolecularFormula() { return molecularFormula; }
    public void setMolecularFormula(String molecularFormula) { this.molecularFormula = molecularFormula; }
    
    public Double getMolecularWeight() { return molecularWeight; }
    public void setMolecularWeight(Double molecularWeight) { this.molecularWeight = molecularWeight; }
    
    public String getSmilesNotation() { return smilesNotation; }
    public void setSmilesNotation(String smilesNotation) { this.smilesNotation = smilesNotation; }
    
    public String getInchiKey() { return inchiKey; }
    public void setInchiKey(String inchiKey) { this.inchiKey = inchiKey; }
    
    public Boolean getHas3dCoordinates() { return has3dCoordinates; }
    public void setHas3dCoordinates(Boolean has3dCoordinates) { this.has3dCoordinates = has3dCoordinates; }
    
    public Double getTotalEnergy() { return totalEnergy; }
    public void setTotalEnergy(Double totalEnergy) { this.totalEnergy = totalEnergy; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getLastModified() { return lastModified; }
    public void setLastModified(LocalDateTime lastModified) { this.lastModified = lastModified; }
} 