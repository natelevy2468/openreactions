package com.openreactions.backend.repository;

import com.openreactions.backend.model.Segment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SegmentRepository extends JpaRepository<Segment, Long> {
    
    // Find segments by molecule ID
    List<Segment> findByMoleculeId(Long moleculeId);
    
    // Find segments by bond order
    List<Segment> findByBondOrder(Integer bondOrder);
    
    // Find segments by bond type
    List<Segment> findByBondType(String bondType);
    
    // Find segments by stereochemistry
    List<Segment> findByStereochemistry(String stereochemistry);
    
    // Find segments connected to a specific vertex
    @Query("SELECT s FROM Segment s WHERE s.startVertex.id = :vertexId OR s.endVertex.id = :vertexId")
    List<Segment> findByVertexId(@Param("vertexId") Long vertexId);
    
    // Find segments between two vertices
    @Query("SELECT s FROM Segment s WHERE (s.startVertex.id = :vertex1Id AND s.endVertex.id = :vertex2Id) OR (s.startVertex.id = :vertex2Id AND s.endVertex.id = :vertex1Id)")
    List<Segment> findBetweenVertices(@Param("vertex1Id") Long vertex1Id, @Param("vertex2Id") Long vertex2Id);
    
    // Find segments with bond length in a range
    @Query("SELECT s FROM Segment s WHERE SQRT(POWER(s.endVertex.x - s.startVertex.x, 2) + POWER(s.endVertex.y - s.startVertex.y, 2)) BETWEEN :minLength AND :maxLength")
    List<Segment> findByBondLengthRange(@Param("minLength") Double minLength, @Param("maxLength") Double maxLength);
    
    // Find segments with specific bond orders greater than
    List<Segment> findByBondOrderGreaterThan(Integer bondOrder);
    
    // Count segments by bond type for a molecule
    @Query("SELECT s.bondType, COUNT(s) FROM Segment s WHERE s.molecule.id = :moleculeId GROUP BY s.bondType")
    List<Object[]> countByBondTypeForMolecule(@Param("moleculeId") Long moleculeId);
} 