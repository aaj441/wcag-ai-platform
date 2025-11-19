/**
 * OpenTelemetry distributed tracing setup
 * Traces all HTTP requests and external API calls
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { config } from '../config';

let sdk: NodeSDK | null = null;

export function initializeTracing() {
  if (!config.otel.enabled) {
    return;
  }

  const jaegerExporter = new JaegerExporter({
    endpoint: config.otel.jaegerEndpoint,
  });

  sdk = new NodeSDK({
    traceExporter: jaegerExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: 'wcag-ai-lab-backend',
  });

  sdk.start();
}

export function shutdownTracing() {
  if (sdk) {
    return sdk.shutdown();
  }
}
