package com.seguridad.config;

import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.Span;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

@Component
public class OtelOAuthSuccessHandler implements AuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        
        if (authentication instanceof OAuth2AuthenticationToken) {
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            String provider = token.getAuthorizedClientRegistrationId();
            String login = (String) token.getPrincipal().getAttributes().get("login");
            Object idObj = token.getPrincipal().getAttributes().get("id");
            String id = (idObj != null) ? idObj.toString() : null;
            String email = (String) token.getPrincipal().getAttributes().get("email");
            
            Span span = Span.current();
            
            span.setAttribute("auth.provider", provider);
            if (id != null) {
                span.setAttribute("auth.user.github_id", id);
            }
            if (login != null) {
                span.setAttribute("auth.user.username", login);
            }
            if (email != null) {
                span.setAttribute("auth.user.email", email);
            }
            span.setAttribute("auth.event", "LOGIN_SUCCESS");
            span.setAttribute("auth.timestamp", Instant.now().toString());
            
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty()) {
                ip = request.getRemoteAddr();
            }
            span.setAttribute("auth.ip", ip);
            
            String userAgent = request.getHeader("User-Agent");
            if (userAgent != null) {
                span.setAttribute("auth.user_agent", userAgent);
            }

            span.addEvent("github_login_event", Attributes.builder()
                    .put("username", login != null ? login : "unknown")
                    .put("github_id", id != null ? id : "unknown")
                    .put("login_time", Instant.now().toString())
                    .build());
        }

        // Redirigir al dashboard
        response.sendRedirect("/dashboard");
    }
}
