package com.seguridad.controller;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HelloController {

    private final Tracer tracer = GlobalOpenTelemetry.getTracer("auth-backend", "1.0.0");

    // ─── GET /api/hello — público, no requiere JWT ────────────────────────────
    @GetMapping("/hello")
    public ResponseEntity<?> helloPublico() {
        Span span = tracer.spanBuilder("hello.publico").startSpan();
        try (var scope = span.makeCurrent()) {
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Hola! Este endpoint es publico.",
                    "timestamp", Instant.now().toString(),
                    "traceId", span.getSpanContext().getTraceId()
            ));
        } finally {
            span.end();
        }
    }

    // ─── GET /api/hello/seguro — requiere JWT válido ──────────────────────────
    @GetMapping("/hello/seguro")
    public ResponseEntity<?> helloSeguro(Authentication auth) {
        Span span = tracer.spanBuilder("hello.seguro")
                .setAttribute("usuario", auth.getName())
                .setAttribute("roles", auth.getAuthorities().toString())
                .startSpan();
        try (var scope = span.makeCurrent()) {
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Hola " + auth.getName() + "! Estas autenticado.",
                    "roles", auth.getAuthorities().toString(),
                    "timestamp", Instant.now().toString(),
                    "traceId", span.getSpanContext().getTraceId()
            ));
        } finally {
            span.end();
        }
    }

    // ─── GET /api/admin/hello — solo ADMIN (RBAC con @PreAuthorize) ──────────
    @GetMapping("/admin/hello")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> helloAdmin(Authentication auth) {
        Span span = tracer.spanBuilder("hello.admin")
                .setAttribute("usuario", auth.getName())
                .startSpan();
        try (var scope = span.makeCurrent()) {
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Hola admin " + auth.getName() + "! Tienes acceso total.",
                    "traceId", span.getSpanContext().getTraceId()
            ));
        } finally {
            span.end();
        }
    }
}
