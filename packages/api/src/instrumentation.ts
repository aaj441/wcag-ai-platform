/**
 * OpenTelemetry Instrumentation
 *
 * Distributed tracing and observability for WCAG AI Platform
 */

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const packageJson = require('../package.json');

export function initializeTracing() {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'wcagaii-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: packageJson.version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
  });

  // Configure Jaeger exporter
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
  provider.register();

  // Auto-instrumentation for common libraries
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingPaths: ['/health', '/metrics'],
      }),
      new ExpressInstrumentation(),
    ],
  });

  console.log('✅ OpenTelemetry tracing initialized');
  return provider;
}

export function getTracer(name: string = 'wcagaii-backend') {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name);
}
