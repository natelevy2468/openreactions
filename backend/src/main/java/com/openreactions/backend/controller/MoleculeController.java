package com.openreactions.backend.controller;

import com.openreactions.backend.model.Molecule;
import com.openreactions.backend.model.Vertex;
import com.openreactions.backend.model.Segment;
import com.openreactions.backend.repository.MoleculeRepository;
import com.openreactions.backend.repository.VertexRepository;
import com.openreactions.backend.repository.SegmentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/molecules")
@CrossOrigin(origins = "*")
public class MoleculeController {

    @Autowired
    private MoleculeRepository moleculeRepository;

    @Autowired
    private VertexRepository vertexRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    // Get all molecules
    @GetMapping
    public List<Molecule> getAllMolecules() {
        return moleculeRepository.findAllByOrderByCreatedAtDesc();
    }

    // Get molecule by ID
    @GetMapping("/{id}")
    public ResponseEntity<Molecule> getMoleculeById(@PathVariable Long id) {
        Optional<Molecule> molecule = moleculeRepository.findById(id);
        return molecule.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Create new molecule
    @PostMapping
    public ResponseEntity<Molecule> createMolecule(@Valid @RequestBody Molecule molecule) {
        try {
            Molecule savedMolecule = moleculeRepository.save(molecule);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedMolecule);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Update molecule
    @PutMapping("/{id}")
    public ResponseEntity<Molecule> updateMolecule(@PathVariable Long id, 
                                                  @Valid @RequestBody Molecule moleculeDetails) {
        Optional<Molecule> optionalMolecule = moleculeRepository.findById(id);
        
        if (!optionalMolecule.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Molecule molecule = optionalMolecule.get();
        molecule.setName(moleculeDetails.getName());
        molecule.setDescription(moleculeDetails.getDescription());
        molecule.setMolecularFormula(moleculeDetails.getMolecularFormula());
        molecule.setMolecularWeight(moleculeDetails.getMolecularWeight());
        molecule.setCanvasWidth(moleculeDetails.getCanvasWidth());
        molecule.setCanvasHeight(moleculeDetails.getCanvasHeight());

        try {
            Molecule updatedMolecule = moleculeRepository.save(molecule);
            return ResponseEntity.ok(updatedMolecule);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Delete molecule
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMolecule(@PathVariable Long id) {
        if (!moleculeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        try {
            moleculeRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Add vertex to molecule
    @PostMapping("/{id}/vertices")
    public ResponseEntity<Vertex> addVertexToMolecule(@PathVariable Long id, 
                                                     @Valid @RequestBody Vertex vertex) {
        Optional<Molecule> optionalMolecule = moleculeRepository.findById(id);
        
        if (!optionalMolecule.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Molecule molecule = optionalMolecule.get();
        vertex.setMolecule(molecule);
        
        try {
            Vertex savedVertex = vertexRepository.save(vertex);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedVertex);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Get all vertices for a molecule
    @GetMapping("/{id}/vertices")
    public ResponseEntity<List<Vertex>> getMoleculeVertices(@PathVariable Long id) {
        if (!moleculeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        List<Vertex> vertices = vertexRepository.findByMoleculeId(id);
        return ResponseEntity.ok(vertices);
    }

    // Add segment to molecule
    @PostMapping("/{id}/segments")
    public ResponseEntity<Segment> addSegmentToMolecule(@PathVariable Long id, 
                                                       @Valid @RequestBody Segment segment) {
        Optional<Molecule> optionalMolecule = moleculeRepository.findById(id);
        
        if (!optionalMolecule.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Molecule molecule = optionalMolecule.get();
        segment.setMolecule(molecule);
        
        try {
            Segment savedSegment = segmentRepository.save(segment);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedSegment);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Get all segments for a molecule
    @GetMapping("/{id}/segments")
    public ResponseEntity<List<Segment>> getMoleculeSegments(@PathVariable Long id) {
        if (!moleculeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        List<Segment> segments = segmentRepository.findByMoleculeId(id);
        return ResponseEntity.ok(segments);
    }

    // Get molecule bounds
    @GetMapping("/{id}/bounds")
    public ResponseEntity<Molecule.MoleculeBounds> getMoleculeBounds(@PathVariable Long id) {
        Optional<Molecule> optionalMolecule = moleculeRepository.findById(id);
        
        if (!optionalMolecule.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Molecule molecule = optionalMolecule.get();
        return ResponseEntity.ok(molecule.getBounds());
    }

    // Search molecules by name
    @GetMapping("/search")
    public List<Molecule> searchMoleculesByName(@RequestParam String name) {
        return moleculeRepository.findByNameContainingIgnoreCase(name);
    }

    // Get molecules by element
    @GetMapping("/element/{element}")
    public List<Molecule> getMoleculesByElement(@PathVariable String element) {
        return moleculeRepository.findByElement(element);
    }

    // Get molecules by atom count
    @GetMapping("/atoms/{count}")
    public List<Molecule> getMoleculesByAtomCount(@PathVariable int count) {
        return moleculeRepository.findByAtomCount(count);
    }

    // Get molecules by bond count
    @GetMapping("/bonds/{count}")
    public List<Molecule> getMoleculesByBondCount(@PathVariable int count) {
        return moleculeRepository.findByBondCount(count);
    }
} 