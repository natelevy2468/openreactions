package com.openreactions.backend.service;

import com.openreactions.backend.model.Molecule;
import com.openreactions.backend.repository.MoleculeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class MoleculeService {
    
    @Autowired
    private MoleculeRepository moleculeRepository;
    
    /**
     * Get all molecules
     */
    public List<Molecule> getAllMolecules() {
        return moleculeRepository.findAll();
    }
    
    /**
     * Get molecule by ID
     */
    public Molecule getMoleculeById(Long id) {
        Optional<Molecule> molecule = moleculeRepository.findById(id);
        return molecule.orElse(null);
    }
    
    /**
     * Save a molecule
     */
    public Molecule saveMolecule(Molecule molecule) {
        // Ensure proper bidirectional relationships
        if (molecule.getVertices() != null) {
            molecule.getVertices().forEach(vertex -> vertex.setMolecule(molecule));
        }
        if (molecule.getBonds() != null) {
            molecule.getBonds().forEach(bond -> bond.setMolecule(molecule));
        }
        
        return moleculeRepository.save(molecule);
    }
    
    /**
     * Search molecules by name (case-insensitive)
     */
    public List<Molecule> searchMoleculesByName(String name) {
        return moleculeRepository.findByNameContainingIgnoreCase(name);
    }
    
    /**
     * Find molecules by molecular formula
     */
    public List<Molecule> getMoleculesByFormula(String formula) {
        return moleculeRepository.findByMolecularFormula(formula);
    }
    
    /**
     * Find molecules by molecular weight range
     */
    public List<Molecule> getMoleculesByWeightRange(Double minWeight, Double maxWeight) {
        return moleculeRepository.findByMolecularWeightBetween(minWeight, maxWeight);
    }
    
    /**
     * Get molecules with 3D coordinates
     */
    public List<Molecule> getMoleculesWith3D() {
        return moleculeRepository.findByHas3dCoordinatesTrue();
    }
    
    /**
     * Get recent molecules (last 10)
     */
    public List<Molecule> getRecentMolecules() {
        return moleculeRepository.findTop10ByOrderByCreatedAtDesc();
    }
    
    /**
     * Find molecules created after a specific date
     */
    public List<Molecule> getMoleculesAfterDate(LocalDateTime date) {
        return moleculeRepository.findByCreatedAtAfter(date);
    }
    
    /**
     * Search molecules by SMILES pattern
     */
    public List<Molecule> searchMoleculesBySmiles(String pattern) {
        return moleculeRepository.findBySmilePattern(pattern);
    }
    
    /**
     * Delete a molecule
     */
    public boolean deleteMolecule(Long id) {
        if (moleculeRepository.existsById(id)) {
            moleculeRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    /**
     * Count molecules by formula
     */
    public Long countMoleculesByFormula(String formula) {
        return moleculeRepository.countByMolecularFormula(formula);
    }
    
    /**
     * Update molecule with calculated properties
     */
    public Molecule updateMoleculeProperties(Long id, String formula, Double weight, String smiles) {
        Optional<Molecule> optionalMolecule = moleculeRepository.findById(id);
        if (optionalMolecule.isPresent()) {
            Molecule molecule = optionalMolecule.get();
            molecule.setMolecularFormula(formula);
            molecule.setMolecularWeight(weight);
            molecule.setSmilesNotation(smiles);
            return moleculeRepository.save(molecule);
        }
        return null;
    }
    
    /**
     * Check if a molecule exists
     */
    public boolean moleculeExists(Long id) {
        return moleculeRepository.existsById(id);
    }
} 