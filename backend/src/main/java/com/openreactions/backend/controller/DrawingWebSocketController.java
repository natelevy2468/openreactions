package com.openreactions.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class DrawingWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Handle vertex addition updates
    @MessageMapping("/drawing.vertexAdded")
    @SendTo("/topic/drawing")
    public Map<String, Object> vertexAdded(@Payload Map<String, Object> message) {
        // Add message type for client handling
        message.put("type", "VERTEX_ADDED");
        return message;
    }

    // Handle segment addition updates  
    @MessageMapping("/drawing.segmentAdded")
    @SendTo("/topic/drawing")
    public Map<String, Object> segmentAdded(@Payload Map<String, Object> message) {
        message.put("type", "SEGMENT_ADDED");
        return message;
    }

    // Handle vertex updates
    @MessageMapping("/drawing.vertexUpdated")
    @SendTo("/topic/drawing")
    public Map<String, Object> vertexUpdated(@Payload Map<String, Object> message) {
        message.put("type", "VERTEX_UPDATED");
        return message;
    }

    // Handle segment updates
    @MessageMapping("/drawing.segmentUpdated") 
    @SendTo("/topic/drawing")
    public Map<String, Object> segmentUpdated(@Payload Map<String, Object> message) {
        message.put("type", "SEGMENT_UPDATED");
        return message;
    }

    // Handle deletion events
    @MessageMapping("/drawing.elementDeleted")
    @SendTo("/topic/drawing")
    public Map<String, Object> elementDeleted(@Payload Map<String, Object> message) {
        message.put("type", "ELEMENT_DELETED");
        return message;
    }

    // Handle cursor position updates for collaboration
    @MessageMapping("/drawing.cursorMoved")
    @SendTo("/topic/drawing")
    public Map<String, Object> cursorMoved(@Payload Map<String, Object> message) {
        message.put("type", "CURSOR_MOVED");
        return message;
    }

    // Send updates to specific molecule room
    public void sendToMolecule(Long moleculeId, String type, Object data) {
        Map<String, Object> message = Map.of(
            "type", type,
            "moleculeId", moleculeId,
            "data", data,
            "timestamp", System.currentTimeMillis()
        );
        
        messagingTemplate.convertAndSend("/topic/molecule/" + moleculeId, message);
    }

    // Send updates to all connected clients
    public void broadcastUpdate(String type, Object data) {
        Map<String, Object> message = Map.of(
            "type", type,
            "data", data,
            "timestamp", System.currentTimeMillis()
        );
        
        messagingTemplate.convertAndSend("/topic/drawing", message);
    }
} 