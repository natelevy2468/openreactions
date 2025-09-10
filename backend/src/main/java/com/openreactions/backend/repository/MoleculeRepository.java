package com.openreactions.backend.repository;

import com.openreactions.backend.model.Molecule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MoleculeRepository extends JpaRepository<Molecule, Long> {
    
    // Find molecules by name (case insensitive)
    List<Molecule> findByNameContainingIgnoreCase(String name);
    
    // Find molecules by molecular formula
    List<Molecule> findByMolecularFormula(String formula);
    
    // Find molecules created after a certain date
    List<Molecule> findByCreatedAtAfter(LocalDateTime date);
    
    // Find molecules updated after a certain date
    List<Molecule> findByUpdatedAtAfter(LocalDateTime date);
    
    // Find molecules ordered by creation date (newest first)
    List<Molecule> findAllByOrderByCreatedAtDesc();
    
    // Find molecules by atom count (using custom query)
    @Query("SELECT m FROM Molecule m WHERE SIZE(m.vertices) = :atomCount")
    List<Molecule> findByAtomCount(@Param("atomCount") int atomCount);
    
    // Find molecules by bond count (using custom query)  
    @Query("SELECT m FROM Molecule m WHERE SIZE(m.segments) = :bondCount")
    List<Molecule> findByBondCount(@Param("bondCount") int bondCount);
    
    // Find molecules containing specific elements
    @Query("SELECT DISTINCT m FROM Molecule m JOIN m.vertices v WHERE v.element = :element")
    List<Molecule> findByElement(@Param("element") String element);
    
    // Find molecules with specific canvas dimensions
    List<Molecule> findByCanvasWidthAndCanvasHeight(Integer width, Integer height);
} 