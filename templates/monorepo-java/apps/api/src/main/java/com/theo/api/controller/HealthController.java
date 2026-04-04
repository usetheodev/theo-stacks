package com.theo.api.controller;

import com.theo.shared.AppInfo;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public Map<String, String> index() {
        return Map.of("message", "Hello from {{project-name}} API v" + AppInfo.VERSION);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    // Readiness probe — customize: add database/redis checks for production
    @GetMapping("/ready")
    public Map<String, String> ready() {
        return Map.of("status", "ready");
    }
}
