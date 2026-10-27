package com.seguridad.controller;

import com.seguridad.security.JwtUtils;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authManager;
    private final JwtUtils jwtUtils;
    // Tracer de OTel para instrumentación manual de eventos de seguridad
    private final Tracer tracer = GlobalOpenTelemetry.getTracer("auth-backend", "1.0.0");

    public AuthController(AuthenticationManager authManager, JwtUtils jwtUtils) {
        this.authManager = authManager;
        this.jwtUtils = jwtUtils;
    }

    // ─── POST /api/auth/login ─────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        // Span OTel: cada intento de login queda trazado con TraceID
        Span span = tracer.spanBuilder("auth.login")
                .setAttribute("auth.username", request.username())
                .setAttribute("auth.method", "password")
                .startSpan();

        try (var scope = span.makeCurrent()) {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            String token = jwtUtils.generateToken(auth);

            // Registrar login exitoso en la traza
            span.setAttribute("auth.success", true);
            span.setAttribute("auth.roles", auth.getAuthorities().toString());
            log.info("Login exitoso: usuario={} traceId={}", request.username(),
                    span.getSpanContext().getTraceId());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "tipo", "Bearer",
                    "usuario", request.username(),
                    "traceId", span.getSpanContext().getTraceId()  // util para correlacionar en Grafana
            ));

        } catch (BadCredentialsException e) {
            span.setAttribute("auth.success", false);
            span.setAttribute("auth.failure_reason", "bad_credentials");
            span.setStatus(StatusCode.ERROR, "Credenciales inválidas");
            log.warn("Login fallido: usuario={} traceId={}", request.username(),
                    span.getSpanContext().getTraceId());

            return ResponseEntity.status(401).body(Map.of(
                    "error", "Credenciales inválidas",
                    "traceId", span.getSpanContext().getTraceId()
            ));
        } finally {
            span.end();
        }
    }

    // ─── Records para request/response ───────────────────────────────────────
    public record LoginRequest(String username, String password) {}
}
