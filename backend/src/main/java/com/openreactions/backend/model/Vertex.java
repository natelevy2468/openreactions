package com.openreactions.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "vertices")
public class Vertex {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(name = "x_position")
    private Double x;
    
    @NotNull
    @Column(name = "y_position")
    private Double y;
    
    @Column(name = "element")
    private String element = "C"; // Default to Carbon
    
    @Column(name = "charge")
    private Integer charge = 0;
    
    @Column(name = "radical_electrons")
    private Integer radicalElectrons = 0;
    
    @Column(name = "lone_pairs")
    private Integer lonePairs = 0;
    
    @Column(name = "is_off_grid")
    private Boolean isOffGrid = false;
    
    @Column(name = "vertex_type")
    private String vertexType = "normal"; // normal, junction, terminal, etc.
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "molecule_id")
    @JsonBackReference
    private Molecule molecule;
    
    @OneToMany(mappedBy = "startVertex", cascade = CascadeType.ALL)
    @JsonManagedReference("vertex-start-segments")
    private Set<Segment> startingSegments = new HashSet<>();
    
    @OneToMany(mappedBy = "endVertex", cascade = CascadeType.ALL)
    @JsonManagedReference("vertex-end-segments")
    private Set<Segment> endingSegments = new HashSet<>();
    
    // Default constructor
    public Vertex() {}
    
    // Constructor with coordinates
    public Vertex(Double x, Double y) {
        this.x = x;
        this.y = y;
    }
    
    // Constructor with coordinates and element
    public Vertex(Double x, Double y, String element) {
        this.x = x;
        this.y = y;
        this.element = element;
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Double getX() {
        return x;
    }
    
    public void setX(Double x) {
        this.x = x;
    }
    
    public Double getY() {
        return y;
    }
    
    public void setY(Double y) {
        this.y = y;
    }
    
    public String getElement() {
        return element;
    }
    
    public void setElement(String element) {
        this.element = element;
    }
    
    public Integer getCharge() {
        return charge;
    }
    
    public void setCharge(Integer charge) {
        this.charge = charge;
    }
    
    public Integer getRadicalElectrons() {
        return radicalElectrons;
    }
    
    public void setRadicalElectrons(Integer radicalElectrons) {
        this.radicalElectrons = radicalElectrons;
    }
    
    public Integer getLonePairs() {
        return lonePairs;
    }
    
    public void setLonePairs(Integer lonePairs) {
        this.lonePairs = lonePairs;
    }
    
    public Boolean getIsOffGrid() {
        return isOffGrid;
    }
    
    public void setIsOffGrid(Boolean isOffGrid) {
        this.isOffGrid = isOffGrid;
    }
    
    public String getVertexType() {
        return vertexType;
    }
    
    public void setVertexType(String vertexType) {
        this.vertexType = vertexType;
    }
    
    public Molecule getMolecule() {
        return molecule;
    }
    
    public void setMolecule(Molecule molecule) {
        this.molecule = molecule;
    }
    
    public Set<Segment> getStartingSegments() {
        return startingSegments;
    }
    
    public void setStartingSegments(Set<Segment> startingSegments) {
        this.startingSegments = startingSegments;
    }
    
    public Set<Segment> getEndingSegments() {
        return endingSegments;
    }
    
    public void setEndingSegments(Set<Segment> endingSegments) {
        this.endingSegments = endingSegments;
    }
    
    // Helper method to get all connected segments
    public Set<Segment> getAllConnectedSegments() {
        Set<Segment> allSegments = new HashSet<>();
        allSegments.addAll(startingSegments);
        allSegments.addAll(endingSegments);
        return allSegments;
    }
    
    // Helper method to get the number of bonds
    public int getBondCount() {
        return getAllConnectedSegments().stream()
                .mapToInt(segment -> segment.getBondOrder())
                .sum();
    }
    
    @Override
    public String toString() {
        return String.format("Vertex{id=%d, x=%.2f, y=%.2f, element='%s', charge=%d}", 
                id, x, y, element, charge);
    }
} 