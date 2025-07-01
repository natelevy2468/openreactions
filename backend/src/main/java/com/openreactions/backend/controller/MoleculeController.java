package com.openreactions.backend.controller;

import com.openreactions.backend.model.Molecule;
import com.openreactions.backend.service.MolecularGeometryService;
import com.openreactions.backend.service.MoleculeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MoleculeController {
    
    @Autowired
    private MoleculeService moleculeService;
    
    @Autowired
    private MolecularGeometryService geometryService;
    
    /**
     * Get all molecules
     */
    @GetMapping("/molecules")
    public List<Molecule> getAllMolecules() {
        return moleculeService.getAllMolecules();
    }
    
    /**
     * Get molecule by ID
     */
    @GetMapping("/molecules/{id}")
    public ResponseEntity<Molecule> getMoleculeById(@PathVariable Long id) {
        Molecule molecule = moleculeService.getMoleculeById(id);
        if (molecule != null) {
            return ResponseEntity.ok(molecule);
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * Save a new molecule from frontend data
     */
    @PostMapping("/molecules")
    public Molecule createMolecule(@RequestBody Molecule molecule) {
        return moleculeService.saveMolecule(molecule);
    }
    
    /**
     * Update an existing molecule
     */
    @PutMapping("/molecules/{id}")
    public ResponseEntity<Molecule> updateMolecule(@PathVariable Long id, @RequestBody Molecule molecule) {
        Molecule existingMolecule = moleculeService.getMoleculeById(id);
        if (existingMolecule != null) {
            molecule.setId(id);
            return ResponseEntity.ok(moleculeService.saveMolecule(molecule));
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * Delete a molecule
     */
    @DeleteMapping("/molecules/{id}")
    public ResponseEntity<Void> deleteMolecule(@PathVariable Long id) {
        Molecule existingMolecule = moleculeService.getMoleculeById(id);
        if (existingMolecule != null) {
            moleculeService.deleteMolecule(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * Generate 3D coordinates for a molecule
     */
    @PostMapping("/molecules/{id}/generate3d")
    public ResponseEntity<Molecule> generate3DCoordinates(@PathVariable Long id) {
        try {
            Molecule molecule = moleculeService.getMoleculeById(id);
            if (molecule == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Generate 3D coordinates
            molecule = geometryService.generate3DCoordinates(molecule);
            
            // Recalculate bond lengths with 3D data
            geometryService.calculateBondLengths(molecule);
            
            // Save updated molecule
            Molecule updatedMolecule = moleculeService.saveMolecule(molecule);
            
            return ResponseEntity.ok(updatedMolecule);
        } catch (Exception e) {
            System.err.println("Error generating 3D coordinates: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Calculate bond angles for a molecule
     */
    @GetMapping("/molecules/{id}/angles")
    public ResponseEntity<Map<String, Double>> calculateBondAngles(@PathVariable Long id) {
        try {
            Molecule molecule = moleculeService.getMoleculeById(id);
            if (molecule == null) {
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Double> angles = geometryService.calculateBondAngles(molecule);
            return ResponseEntity.ok(angles);
        } catch (Exception e) {
            System.err.println("Error calculating bond angles: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Search molecules by name
     */
    @GetMapping("/molecules/search")
    public ResponseEntity<List<Molecule>> searchMolecules(@RequestParam String query) {
        List<Molecule> molecules = moleculeService.searchMoleculesByName(query);
        return ResponseEntity.ok(molecules);
    }
    
    /**
     * Find molecules by molecular formula
     */
    @GetMapping("/molecules/formula/{formula}")
    public ResponseEntity<List<Molecule>> getMoleculesByFormula(@PathVariable String formula) {
        List<Molecule> molecules = moleculeService.getMoleculesByFormula(formula);
        return ResponseEntity.ok(molecules);
    }
    
    /**
     * Find molecules by molecular weight range
     */
    @GetMapping("/molecules/weight")
    public ResponseEntity<List<Molecule>> getMoleculesByWeightRange(
            @RequestParam Double minWeight,
            @RequestParam Double maxWeight) {
        List<Molecule> molecules = moleculeService.getMoleculesByWeightRange(minWeight, maxWeight);
        return ResponseEntity.ok(molecules);
    }
    
    /**
     * Get recent molecules
     */
    @GetMapping("/molecules/recent")
    public ResponseEntity<List<Molecule>> getRecentMolecules() {
        List<Molecule> molecules = moleculeService.getRecentMolecules();
        return ResponseEntity.ok(molecules);
    }
    
    /**
     * Parse a molecular formula string into individual element counts
     * Examples: "H2SO4" -> {"H": 2, "S": 1, "O": 4}
     *          "CaCl2" -> {"Ca": 1, "Cl": 2}
     *          "C6H12O6" -> {"C": 6, "H": 12, "O": 6}
     */
    @PostMapping("/formulas/parse")
    public ResponseEntity<Map<String, Object>> parseFormula(@RequestBody Map<String, String> request) {
        String formula = request.get("formula");
        
        if (formula == null || formula.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("elementCounts", Map.of("C", 1));
            response.put("totalAtoms", 1);
            response.put("parsedSuccessfully", true);
            return ResponseEntity.ok(response);
        }
        
        Map<String, Integer> elementCounts = new HashMap<>();
        
        try {
            // Handle simple single elements first
            if (formula.matches("^[A-Z][a-z]?$")) {
                elementCounts.put(formula, 1);
            } else {
                // Parse complex formulas using regex
                // Pattern matches: Element (capital letter + optional lowercase) + optional number
                Pattern pattern = Pattern.compile("([A-Z][a-z]?)(\\d*)");
                Matcher matcher = pattern.matcher(formula);
                
                boolean foundElements = false;
                while (matcher.find()) {
                    String element = matcher.group(1);
                    String countStr = matcher.group(2);
                    int count = countStr.isEmpty() ? 1 : Integer.parseInt(countStr);
                    
                    elementCounts.put(element, elementCounts.getOrDefault(element, 0) + count);
                    foundElements = true;
                }
                
                // If no valid elements found, default to carbon
                if (!foundElements) {
                    elementCounts.put("C", 1);
                }
            }
            
            // Calculate total atoms
            int totalAtoms = elementCounts.values().stream().mapToInt(Integer::intValue).sum();
            
            Map<String, Object> response = new HashMap<>();
            response.put("elementCounts", elementCounts);
            response.put("totalAtoms", totalAtoms);
            response.put("parsedSuccessfully", true);
            response.put("originalFormula", formula);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            // If parsing fails, return default
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("elementCounts", Map.of("C", 1));
            errorResponse.put("totalAtoms", 1);
            errorResponse.put("parsedSuccessfully", false);
            errorResponse.put("error", "Failed to parse formula: " + e.getMessage());
            errorResponse.put("originalFormula", formula);
            
            return ResponseEntity.ok(errorResponse);
        }
    }
    
    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "OK",
            "service", "Molecular Geometry Backend",
            "message", "🧪 Ready for chemical calculations!"
        ));
    }
} 