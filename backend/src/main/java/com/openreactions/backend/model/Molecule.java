package com.openreactions.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "molecules")
public class Molecule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Size(min = 1, max = 255)
    @Column(name = "name", nullable = false)
    private String name;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "molecular_formula")
    private String molecularFormula;
    
    @Column(name = "molecular_weight")
    private Double molecularWeight;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "canvas_width")
    private Integer canvasWidth = 800;
    
    @Column(name = "canvas_height")
    private Integer canvasHeight = 600;
    
    @OneToMany(mappedBy = "molecule", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private Set<Vertex> vertices = new HashSet<>();
    
    @OneToMany(mappedBy = "molecule", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private Set<Segment> segments = new HashSet<>();
    
    // Default constructor
    public Molecule() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Constructor with name
    public Molecule(String name) {
        this();
        this.name = name;
    }
    
    // Constructor with name and description
    public Molecule(String name, String description) {
        this(name);
        this.description = description;
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getMolecularFormula() {
        return molecularFormula;
    }
    
    public void setMolecularFormula(String molecularFormula) {
        this.molecularFormula = molecularFormula;
    }
    
    public Double getMolecularWeight() {
        return molecularWeight;
    }
    
    public void setMolecularWeight(Double molecularWeight) {
        this.molecularWeight = molecularWeight;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Integer getCanvasWidth() {
        return canvasWidth;
    }
    
    public void setCanvasWidth(Integer canvasWidth) {
        this.canvasWidth = canvasWidth;
    }
    
    public Integer getCanvasHeight() {
        return canvasHeight;
    }
    
    public void setCanvasHeight(Integer canvasHeight) {
        this.canvasHeight = canvasHeight;
    }
    
    public Set<Vertex> getVertices() {
        return vertices;
    }
    
    public void setVertices(Set<Vertex> vertices) {
        this.vertices = vertices;
        // Ensure bidirectional relationship
        for (Vertex vertex : vertices) {
            vertex.setMolecule(this);
        }
    }
    
    public Set<Segment> getSegments() {
        return segments;
    }
    
    public void setSegments(Set<Segment> segments) {
        this.segments = segments;
        // Ensure bidirectional relationship
        for (Segment segment : segments) {
            segment.setMolecule(this);
        }
    }
    
    // Helper methods
    public void addVertex(Vertex vertex) {
        vertices.add(vertex);
        vertex.setMolecule(this);
    }
    
    public void removeVertex(Vertex vertex) {
        vertices.remove(vertex);
        vertex.setMolecule(null);
    }
    
    public void addSegment(Segment segment) {
        segments.add(segment);
        segment.setMolecule(this);
    }
    
    public void removeSegment(Segment segment) {
        segments.remove(segment);
        segment.setMolecule(null);
    }
    
    // Calculate molecular properties
    public int getAtomCount() {
        return vertices.size();
    }
    
    public int getBondCount() {
        return segments.size();
    }
    
    // Get molecular bounds (for rendering)
    public MoleculeBounds getBounds() {
        if (vertices.isEmpty()) {
            return new MoleculeBounds(0, 0, 0, 0);
        }
        
        double minX = vertices.stream().mapToDouble(Vertex::getX).min().orElse(0);
        double maxX = vertices.stream().mapToDouble(Vertex::getX).max().orElse(0);
        double minY = vertices.stream().mapToDouble(Vertex::getY).min().orElse(0);
        double maxY = vertices.stream().mapToDouble(Vertex::getY).max().orElse(0);
        
        return new MoleculeBounds(minX, minY, maxX, maxY);
    }
    
    @Override
    public String toString() {
        return String.format("Molecule{id=%d, name='%s', vertices=%d, segments=%d}", 
                id, name, vertices.size(), segments.size());
    }
    
    // Inner class for molecule bounds
    public static class MoleculeBounds {
        private final double minX, minY, maxX, maxY;
        
        public MoleculeBounds(double minX, double minY, double maxX, double maxY) {
            this.minX = minX;
            this.minY = minY;
            this.maxX = maxX;
            this.maxY = maxY;
        }
        
        public double getMinX() { return minX; }
        public double getMinY() { return minY; }
        public double getMaxX() { return maxX; }
        public double getMaxY() { return maxY; }
        public double getWidth() { return maxX - minX; }
        public double getHeight() { return maxY - minY; }
    }
} 