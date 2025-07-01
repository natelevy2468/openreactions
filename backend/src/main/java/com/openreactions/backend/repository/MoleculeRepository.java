package com.openreactions.backend.repository;

import com.openreactions.backend.model.Molecule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MoleculeRepository extends JpaRepository<Molecule, Long> {
    
    // Find molecules by name (case-insensitive)
    List<Molecule> findByNameContainingIgnoreCase(String name);
    
    // Find molecules by molecular formula
    List<Molecule> findByMolecularFormula(String formula);
    
    // Find molecules created after a certain date
    List<Molecule> findByCreatedAtAfter(LocalDateTime date);
    
    // Find molecules with 3D coordinates
    List<Molecule> findByHas3dCoordinatesTrue();
    
    // Custom query to find molecules by SMILES pattern
    @Query("SELECT m FROM Molecule m WHERE m.smilesNotation LIKE %:pattern%")
    List<Molecule> findBySmilePattern(@Param("pattern") String pattern);
    
    // Find molecules by molecular weight range
    @Query("SELECT m FROM Molecule m WHERE m.molecularWeight BETWEEN :minWeight AND :maxWeight")
    List<Molecule> findByMolecularWeightBetween(@Param("minWeight") Double minWeight, @Param("maxWeight") Double maxWeight);
    
    // Count molecules by formula
    Long countByMolecularFormula(String formula);
    
    // Find the most recently created molecules
    List<Molecule> findTop10ByOrderByCreatedAtDesc();
} 