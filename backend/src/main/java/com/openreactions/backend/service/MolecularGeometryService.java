package com.openreactions.backend.service;

import com.openreactions.backend.model.Molecule;
import com.openreactions.backend.model.Vertex;
import com.openreactions.backend.model.Bond;
import org.openscience.cdk.AtomContainer;
import org.openscience.cdk.DefaultChemObjectBuilder;
import org.openscience.cdk.interfaces.IAtom;
import org.openscience.cdk.interfaces.IBond;
import org.openscience.cdk.interfaces.IAtomContainer;
import org.openscience.cdk.geometry.GeometryUtil;
import org.openscience.cdk.layout.StructureDiagramGenerator;
import org.openscience.cdk.smiles.SmilesGenerator;
import org.openscience.cdk.tools.manipulator.AtomContainerManipulator;
import org.springframework.stereotype.Service;

import javax.vecmath.Point3d;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MolecularGeometryService {
    
    private final SmilesGenerator smilesGenerator = SmilesGenerator.unique();
    
    /**
     * Convert 2D molecule structure to 3D coordinates
     */
    public Molecule generate3DCoordinates(Molecule molecule) {
        try {
            // Convert to CDK molecule
            IAtomContainer cdkMolecule = convertToCDK(molecule);
            
            // Generate 3D coordinates using CDK
            if (cdkMolecule.getAtomCount() > 0) {
                generate3DCoordinatesInternal(cdkMolecule);
                
                // Update our molecule with 3D coordinates
                updateMoleculeWith3D(molecule, cdkMolecule);
                molecule.setHas3dCoordinates(true);
            }
            
            return molecule;
        } catch (Exception e) {
            System.err.println("Error generating 3D coordinates: " + e.getMessage());
            return molecule;
        }
    }
    
    /**
     * Calculate molecular properties like formula, weight, SMILES
     */
    public Molecule calculateMolecularProperties(Molecule molecule) {
        try {
            // Calculate molecular formula
            String formula = calculateMolecularFormula(molecule);
            molecule.setMolecularFormula(formula);
            
            // Calculate molecular weight
            double weight = calculateMolecularWeight(molecule);
            molecule.setMolecularWeight(weight);
            
            // Generate SMILES notation
            IAtomContainer cdkMolecule = convertToCDK(molecule);
            if (cdkMolecule.getAtomCount() > 0) {
                AtomContainerManipulator.percieveAtomTypesAndConfigureAtoms(cdkMolecule);
                String smiles = smilesGenerator.create(cdkMolecule);
                molecule.setSmilesNotation(smiles);
            }
            
            return molecule;
        } catch (Exception e) {
            System.err.println("Error calculating molecular properties: " + e.getMessage());
            return molecule;
        }
    }
    
    /**
     * Calculate bond angles for a molecule
     */
    public Map<String, Double> calculateBondAngles(Molecule molecule) {
        Map<String, Double> angles = new HashMap<>();
        
        // Group bonds by vertex
        Map<String, List<Bond>> bondsByVertex = molecule.getBonds().stream()
            .collect(Collectors.groupingBy(Bond::getFromVertexId));
        
        molecule.getBonds().stream()
            .collect(Collectors.groupingBy(Bond::getToVertexId))
            .forEach((vertexId, bonds) -> {
                bondsByVertex.computeIfAbsent(vertexId, k -> new ArrayList<>()).addAll(bonds);
            });
        
        // Calculate angles for each vertex with multiple bonds
        for (Map.Entry<String, List<Bond>> entry : bondsByVertex.entrySet()) {
            String centralVertex = entry.getKey();
            List<Bond> bonds = entry.getValue();
            
            if (bonds.size() >= 2) {
                Vertex center = findVertexById(molecule, centralVertex);
                if (center == null) continue;
                
                for (int i = 0; i < bonds.size(); i++) {
                    for (int j = i + 1; j < bonds.size(); j++) {
                        Bond bond1 = bonds.get(i);
                        Bond bond2 = bonds.get(j);
                        
                        Vertex v1 = getOtherVertex(molecule, bond1, centralVertex);
                        Vertex v2 = getOtherVertex(molecule, bond2, centralVertex);
                        
                        if (v1 != null && v2 != null) {
                            double angle = calculateAngle(center, v1, v2);
                            angles.put(centralVertex + "-" + v1.getVertexId() + "-" + v2.getVertexId(), angle);
                        }
                    }
                }
            }
        }
        
        return angles;
    }
    
    /**
     * Calculate bond lengths
     */
    public void calculateBondLengths(Molecule molecule) {
        for (Bond bond : molecule.getBonds()) {
            Vertex from = findVertexById(molecule, bond.getFromVertexId());
            Vertex to = findVertexById(molecule, bond.getToVertexId());
            
            if (from != null && to != null) {
                // 2D distance
                double dx2d = from.getX2d() - to.getX2d();
                double dy2d = from.getY2d() - to.getY2d();
                double length2d = Math.sqrt(dx2d * dx2d + dy2d * dy2d);
                bond.setLength2d(length2d);
                
                // 3D distance (if available)
                if (from.getX3d() != null && to.getX3d() != null) {
                    double dx3d = from.getX3d() - to.getX3d();
                    double dy3d = from.getY3d() - to.getY3d();
                    double dz3d = (from.getZ3d() != null ? from.getZ3d() : 0.0) - 
                                 (to.getZ3d() != null ? to.getZ3d() : 0.0);
                    double length3d = Math.sqrt(dx3d * dx3d + dy3d * dy3d + dz3d * dz3d);
                    bond.setLength3d(length3d);
                }
            }
        }
    }
    
    // Private helper methods
    
    private IAtomContainer convertToCDK(Molecule molecule) throws Exception {
        IAtomContainer container = new AtomContainer();
        Map<String, IAtom> atomMap = new HashMap<>();
        
        // Add atoms
        for (Vertex vertex : molecule.getVertices()) {
            IAtom atom = DefaultChemObjectBuilder.getInstance().newInstance(IAtom.class, vertex.getElement());
            if (vertex.getX2d() != null && vertex.getY2d() != null) {
                atom.setPoint2d(new javax.vecmath.Point2d(vertex.getX2d(), vertex.getY2d()));
            }
            if (vertex.getFormalCharge() != null) {
                atom.setFormalCharge(vertex.getFormalCharge());
            }
            container.addAtom(atom);
            atomMap.put(vertex.getVertexId(), atom);
        }
        
        // Add bonds
        for (Bond bond : molecule.getBonds()) {
            IAtom fromAtom = atomMap.get(bond.getFromVertexId());
            IAtom toAtom = atomMap.get(bond.getToVertexId());
            
            if (fromAtom != null && toAtom != null) {
                IBond.Order order = switch (bond.getBondType()) {
                    case SINGLE -> IBond.Order.SINGLE;
                    case DOUBLE -> IBond.Order.DOUBLE;
                    case TRIPLE -> IBond.Order.TRIPLE;
                    case AROMATIC -> IBond.Order.SINGLE; // Handle aromatic separately
                };
                
                IBond cdkBond = DefaultChemObjectBuilder.getInstance().newInstance(IBond.class, fromAtom, toAtom, order);
                container.addBond(cdkBond);
            }
        }
        
        return container;
    }
    
    private void generate3DCoordinatesInternal(IAtomContainer molecule) {
        try {
            // Simple 3D coordinate generation - in a real implementation,
            // you'd use more sophisticated algorithms or external libraries
            for (int i = 0; i < molecule.getAtomCount(); i++) {
                IAtom atom = molecule.getAtom(i);
                if (atom.getPoint2d() != null) {
                    // Simple projection to 3D with some random Z variation
                    double x = atom.getPoint2d().x;
                    double y = atom.getPoint2d().y;
                    double z = (Math.random() - 0.5) * 2.0; // Random Z between -1 and 1
                    
                    atom.setPoint3d(new Point3d(x, y, z));
                }
            }
        } catch (Exception e) {
            System.err.println("Error in 3D coordinate generation: " + e.getMessage());
        }
    }
    
    private void updateMoleculeWith3D(Molecule molecule, IAtomContainer cdkMolecule) {
        Map<String, Vertex> vertexMap = molecule.getVertices().stream()
            .collect(Collectors.toMap(Vertex::getVertexId, v -> v));
        
        for (int i = 0; i < cdkMolecule.getAtomCount() && i < molecule.getVertices().size(); i++) {
            IAtom atom = cdkMolecule.getAtom(i);
            Vertex vertex = molecule.getVertices().get(i);
            
            if (atom.getPoint3d() != null) {
                vertex.setX3d(atom.getPoint3d().x);
                vertex.setY3d(atom.getPoint3d().y);
                vertex.setZ3d(atom.getPoint3d().z);
            }
        }
    }
    
    private String calculateMolecularFormula(Molecule molecule) {
        Map<String, Integer> elementCount = new HashMap<>();
        
        for (Vertex vertex : molecule.getVertices()) {
            elementCount.merge(vertex.getElement(), 1, Integer::sum);
        }
        
        // Build formula string (C first, then H, then alphabetically)
        StringBuilder formula = new StringBuilder();
        
        if (elementCount.containsKey("C")) {
            formula.append("C");
            if (elementCount.get("C") > 1) {
                formula.append(elementCount.get("C"));
            }
            elementCount.remove("C");
        }
        
        if (elementCount.containsKey("H")) {
            formula.append("H");
            if (elementCount.get("H") > 1) {
                formula.append(elementCount.get("H"));
            }
            elementCount.remove("H");
        }
        
        elementCount.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                formula.append(entry.getKey());
                if (entry.getValue() > 1) {
                    formula.append(entry.getValue());
                }
            });
        
        return formula.toString();
    }
    
    private double calculateMolecularWeight(Molecule molecule) {
        Map<String, Double> atomicWeights = Map.of(
            "H", 1.008, "C", 12.011, "N", 14.007, "O", 15.999,
            "F", 18.998, "P", 30.974, "S", 32.065, "Cl", 35.453,
            "Br", 79.904, "I", 126.904
        );
        
        return molecule.getVertices().stream()
            .mapToDouble(vertex -> atomicWeights.getOrDefault(vertex.getElement(), 0.0))
            .sum();
    }
    
    private Vertex findVertexById(Molecule molecule, String vertexId) {
        return molecule.getVertices().stream()
            .filter(v -> v.getVertexId().equals(vertexId))
            .findFirst()
            .orElse(null);
    }
    
    private Vertex getOtherVertex(Molecule molecule, Bond bond, String centralVertexId) {
        String otherId = bond.getFromVertexId().equals(centralVertexId) ? 
            bond.getToVertexId() : bond.getFromVertexId();
        return findVertexById(molecule, otherId);
    }
    
    private double calculateAngle(Vertex center, Vertex v1, Vertex v2) {
        double dx1 = v1.getX2d() - center.getX2d();
        double dy1 = v1.getY2d() - center.getY2d();
        double dx2 = v2.getX2d() - center.getX2d();
        double dy2 = v2.getY2d() - center.getY2d();
        
        double dot = dx1 * dx2 + dy1 * dy2;
        double mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        double mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        
        if (mag1 == 0 || mag2 == 0) return 0;
        
        double cosAngle = dot / (mag1 * mag2);
        cosAngle = Math.max(-1.0, Math.min(1.0, cosAngle)); // Clamp to [-1, 1]
        
        return Math.toDegrees(Math.acos(cosAngle));
    }
} 