# Demo: JWT + OpenTelemetry + Spring Boot + React + Grafana

Implementación completa del paper de seguridad con observabilidad transversal.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Autenticación | Spring Boot 3 + Spring Security + JWT (JJWT) |
| Frontend | React 18 + Vite |
| Observabilidad | OpenTelemetry (agente Java + SDK Web) |
| Recolección | OTel Collector |
| Trazas | Grafana Tempo |
| Métricas | Prometheus |
| Visualización | Grafana |

---

## Requisitos previos

- Java 21
- Maven 3.9+
- Node.js 20+
- Docker + Docker Compose

---

## Paso 1 — Levantar el stack de observabilidad

```bash
cd observabilidad
docker compose up -d
```

Verifica que todo esté corriendo:
```bash
docker compose ps
```

URLs disponibles:
- Grafana: http://localhost:3001 (admin / admin)
- Prometheus: http://localhost:9090
- Tempo: http://localhost:3200
- OTel Collector (métricas): http://localhost:8888/metrics

---

## Paso 2 — Descargar el agente Java de OTel

```bash
cd backend
curl -L -o opentelemetry-javaagent.jar https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

---

## Paso 3 — Correr el backend

```bash
cd backend
mvn spring-boot:run -D"spring-boot.run.jvmArguments=-javaagent:opentelemetry-javaagent.jar -Dotel.service.name=auth-backend -Dotel.exporter.otlp.endpoint=http://localhost:4317 -Dotel.exporter.otlp.protocol=grpc -Dotel.traces.exporter=otlp -Dotel.metrics.exporter=none -Dotel.logs.exporter=none"
```

El backend queda en: http://localhost:8080

---

## Paso 4 — Correr el frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend queda en: http://localhost:5173

---

## Endpoints del backend

### Públicos (sin JWT)

```bash
# Saludo público
curl http://localhost:8080/api/hello

# Login — devuelve JWT + TraceID
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario","password":"user123"}'
```

### Protegidos (requieren JWT en header Authorization)

```bash
# Guardar el token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario","password":"user123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Endpoint seguro (cualquier usuario autenticado)
curl http://localhost:8080/api/hello/seguro \
  -H "Authorization: Bearer $TOKEN"

# Endpoint admin (solo rol ADMIN)
curl http://localhost:8080/api/admin/hello \
  -H "Authorization: Bearer $TOKEN"
```

Usuarios disponibles:
- `admin` / `admin123` — roles: ADMIN, USER
- `usuario` / `user123` — rol: USER

---

## Cómo ver las trazas en Grafana (demo)

1. Ir a http://localhost:3001
2. Hacer login en el frontend (http://localhost:5173)
3. Copiar el `traceId` que aparece en la respuesta
4. En Grafana: **Explore → Tempo → TraceQL**
5. Pegar: `{resource.service.name="auth-backend"}`
6. O buscar directamente por TraceID

El dashboard de seguridad se carga automáticamente en **Dashboards → Seguridad → Auth & Security**.

---

## Lo que demuestra cada TraceID

Cada acción del usuario genera un span que contiene:
- `auth.username` — quién hizo el login
- `auth.success` — si fue exitoso o fallido
- `auth.method` — método de autenticación usado
- Timestamp exacto de inicio y fin
- Latencia del endpoint

Esto cubre directamente las categorías **Repudiation** y **Denial of Service** del modelo STRIDE del paper.

---

## Autenticación OAuth2 con GitHub (Nueva Funcionalidad)

Se implementó el flujo OAuth2 Login con GitHub para autenticación y auditoría. Al iniciar sesión con éxito, se crea un Span en OpenTelemetry que correlaciona la identidad y huella del usuario asegurando un alto estándar de seguridad y monitorización (compatible con OWASP y NIST SP 800-63-4 AAL2 al gestionar identidad de forma auditable).

**Propiedades capturadas en el Span referenciado de OpenTelemetry:**
- `auth.event`: "LOGIN_SUCCESS"
- `auth.provider`: "github"
- `auth.user.username`: Nombre del usuario de github
- `auth.user.email`: Email proveído
- `auth.user.github_id`: ID de cuenta
- `auth.ip` y `auth.user_agent`: Cabeceras extraídas de HttpServletRequest
- `auth.timestamp` (momento exacto del suceso en Instant ISO)
Además, un evento discreto (`span.addEvent`) es añadido con atributos esenciales de login.

### Configuración del backend (Fragmento docker-compose.yml)

El siguiente fragmento demuestra cómo ejecutar de manera contenida el backend inyectando el agente Java y habilitando el stack de OAuth2 y OpenTelemetry:

```yaml
  # ── Backend: Spring Boot con OpenTelemetry ────────────────────────────────
  backend:
    image: auth-backend:latest    # Asumiendo que has construido la imagen
    container_name: auth-backend
    ports:
      - "8080:8080"
    environment:
      # Credenciales de GitHub Oauth2 Client
      - GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
      - GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
      
      # Agent OpenTelemetry (Adjuntado vía argumento de JVM)
      - JAVA_TOOL_OPTIONS=-javaagent:/app/opentelemetry-javaagent.jar
      - OTEL_SERVICE_NAME=auth-backend
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_TRACES_EXPORTER=otlp
      - OTEL_METRICS_EXPORTER=otlp
      - OTEL_LOGS_EXPORTER=otlp
    depends_on:
      - otel-collector
    networks:
      - observabilidad
```

### Búsqueda Esperada en Grafana (Tempo)

Al buscar en **Grafana → Explore → Tempo**, puedes filtrar por atributos OTLP y observar el span completo y correlacionado con cualquier otra petición posterior.
Búsqueda de TraceQL: `{ .auth.event = "LOGIN_SUCCESS" && .auth.provider = "github" }`

---

## Para producción (AWS)

1. Reemplazar los usuarios en memoria por una BD (PostgreSQL + Spring Data JPA)
2. Cambiar el secreto JWT por una clave RSA (RS256) generada con `keytool`
3. En `otel-collector-config.yaml`, cambiar el exporter de Tempo a la URL del servicio en AWS
4. Añadir HTTPS (TLS 1.3) con un certificado en el Load Balancer de AWS
5. Configurar rate limiting en Spring Security o API Gateway de AWS
