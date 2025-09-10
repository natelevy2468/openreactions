package com.openreactions.backend.repository;

import com.openreactions.backend.model.Vertex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VertexRepository extends JpaRepository<Vertex, Long> {
    
    // Find vertices by molecule ID
    List<Vertex> findByMoleculeId(Long moleculeId);
    
    // Find vertices by element
    List<Vertex> findByElement(String element);
    
    // Find vertices by charge
    List<Vertex> findByCharge(Integer charge);
    
    // Find vertices within a coordinate range
    @Query("SELECT v FROM Vertex v WHERE v.x BETWEEN :minX AND :maxX AND v.y BETWEEN :minY AND :maxY")
    List<Vertex> findVerticesInRange(
        @Param("minX") Double minX, 
        @Param("maxX") Double maxX,
        @Param("minY") Double minY, 
        @Param("maxY") Double maxY
    );
    
    // Find vertices by off-grid status
    List<Vertex> findByIsOffGrid(Boolean isOffGrid);
    
    // Find vertices with lone pairs
    List<Vertex> findByLonePairsGreaterThan(Integer lonePairs);
    
    // Find vertices with radical electrons
    List<Vertex> findByRadicalElectronsGreaterThan(Integer radicalElectrons);
    
    // Find vertices by exact coordinates (within tolerance)
    @Query("SELECT v FROM Vertex v WHERE ABS(v.x - :x) < :tolerance AND ABS(v.y - :y) < :tolerance")
    List<Vertex> findNearCoordinates(
        @Param("x") Double x, 
        @Param("y") Double y, 
        @Param("tolerance") Double tolerance
    );
} 