package com.openreactions.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.CrossOrigin;

@SpringBootApplication
@CrossOrigin(origins = "http://localhost:5173") // Allow React dev server
public class OpenReactionsBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(OpenReactionsBackendApplication.class, args);
		System.out.println("\n🧪 OpenReactions Backend is running!");
		System.out.println("📡 API available at: http://localhost:8080");
		System.out.println("🔬 Molecular geometry calculations ready!");
	}
} 