// src/services/otel.js
// Este archivo se importa UNA VEZ en main.jsx antes de todo lo demás.
// Instrumenta automáticamente todas las peticiones fetch/XHR y las
// envía al OTel Collector via HTTP OTLP.

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { Resource } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'auth-frontend',
  [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
})

// Exporta trazas al OTel Collector (en prod, cambiar la URL a la del Collector en AWS)
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',  // Puerto HTTP del OTel Collector
})

const provider = new WebTracerProvider({ resource })
provider.addSpanProcessor(new BatchSpanProcessor(exporter))
provider.register()

// Instrumentación automática de fetch y XHR
// Cada llamada al backend quedará trazada sin escribir código adicional
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/localhost:8080/, /\/api\//],
    }),
    new XMLHttpRequestInstrumentation({
      propagateTraceHeaderCorsUrls: [/localhost:8080/, /\/api\//],
    }),
  ],
})

export const tracer = provider.getTracer('auth-frontend')

console.log('[OTel] Instrumentación del frontend iniciada')
