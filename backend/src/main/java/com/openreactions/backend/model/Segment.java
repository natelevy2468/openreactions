package com.openreactions.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "segments")
public class Segment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(name = "bond_order")
    private Integer bondOrder = 1; // 1=single, 2=double, 3=triple, 0=no bond
    
    @Column(name = "bond_type")
    private String bondType = "single"; // single, double, triple, aromatic, wedge, dash, ambiguous
    
    @Column(name = "stereochemistry")
    private String stereochemistry; // up, down, either
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "start_vertex_id", nullable = false)
    @JsonBackReference("vertex-start-segments")
    private Vertex startVertex;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "end_vertex_id", nullable = false)
    @JsonBackReference("vertex-end-segments")
    private Vertex endVertex;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "molecule_id")
    @JsonBackReference
    private Molecule molecule;
    
    // Default constructor
    public Segment() {}
    
    // Constructor with vertices and bond order
    public Segment(Vertex startVertex, Vertex endVertex, Integer bondOrder) {
        this.startVertex = startVertex;
        this.endVertex = endVertex;
        this.bondOrder = bondOrder;
        setBondTypeFromOrder(bondOrder);
    }
    
    // Constructor with vertices, bond order and type
    public Segment(Vertex startVertex, Vertex endVertex, Integer bondOrder, String bondType) {
        this.startVertex = startVertex;
        this.endVertex = endVertex;
        this.bondOrder = bondOrder;
        this.bondType = bondType;
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getBondOrder() {
        return bondOrder;
    }
    
    public void setBondOrder(Integer bondOrder) {
        this.bondOrder = bondOrder;
        setBondTypeFromOrder(bondOrder);
    }
    
    public String getBondType() {
        return bondType;
    }
    
    public void setBondType(String bondType) {
        this.bondType = bondType;
    }
    
    public String getStereochemistry() {
        return stereochemistry;
    }
    
    public void setStereochemistry(String stereochemistry) {
        this.stereochemistry = stereochemistry;
    }
    
    public Vertex getStartVertex() {
        return startVertex;
    }
    
    public void setStartVertex(Vertex startVertex) {
        this.startVertex = startVertex;
    }
    
    public Vertex getEndVertex() {
        return endVertex;
    }
    
    public void setEndVertex(Vertex endVertex) {
        this.endVertex = endVertex;
    }
    
    public Molecule getMolecule() {
        return molecule;
    }
    
    public void setMolecule(Molecule molecule) {
        this.molecule = molecule;
    }
    
    // Helper methods
    private void setBondTypeFromOrder(Integer order) {
        switch (order) {
            case 1:
                this.bondType = "single";
                break;
            case 2:
                this.bondType = "double";
                break;
            case 3:
                this.bondType = "triple";
                break;
            case 0:
                this.bondType = "none";
                break;
            default:
                this.bondType = "single";
        }
    }
    
    // Get coordinates for rendering
    public Double getX1() {
        return startVertex != null ? startVertex.getX() : null;
    }
    
    public Double getY1() {
        return startVertex != null ? startVertex.getY() : null;
    }
    
    public Double getX2() {
        return endVertex != null ? endVertex.getX() : null;
    }
    
    public Double getY2() {
        return endVertex != null ? endVertex.getY() : null;
    }
    
    // Calculate bond length
    public Double getBondLength() {
        if (startVertex == null || endVertex == null) {
            return null;
        }
        double dx = endVertex.getX() - startVertex.getX();
        double dy = endVertex.getY() - startVertex.getY();
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Check if this segment connects to a given vertex
    public boolean connectsTo(Vertex vertex) {
        return startVertex.equals(vertex) || endVertex.equals(vertex);
    }
    
    // Get the other vertex (given one end)
    public Vertex getOtherVertex(Vertex vertex) {
        if (startVertex.equals(vertex)) {
            return endVertex;
        } else if (endVertex.equals(vertex)) {
            return startVertex;
        }
        return null;
    }
    
    @Override
    public String toString() {
        return String.format("Segment{id=%d, bondOrder=%d, bondType='%s', length=%.2f}", 
                id, bondOrder, bondType, getBondLength());
    }
} 