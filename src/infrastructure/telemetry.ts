import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  getNodeAutoInstrumentations,
} from '@opentelemetry/auto-instrumentations-node';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

const serviceName = process.env.SERVICE_NAME || 'graphql-api';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

// Configure exporters based on environment
const getTracingExporter = () => {
  // Zipkin exporter
  if (process.env.ZIPKIN_URL) {
    return new ZipkinExporter({
      url: process.env.ZIPKIN_URL,
    });
  }

  // Default to console in development
  return new ConsoleSpanExporter();
};

// Initialize OpenTelemetry SDK
export const initializeTracing = () => {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: getTracingExporter(),
    instrumentations: [
      // Auto-instrumentations for common libraries
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation for performance
        },
      }),
    ],
  });

  sdk.start();

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry terminated'))
      .catch(error => console.log('Error terminating OpenTelemetry', error))
      .finally(() => process.exit(0));
  });

  return sdk;
};

// Manual tracing utilities
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer(serviceName, serviceVersion);

// Type aliases for cleaner code
type SpanAttributes = Record<string, string | number | boolean>;

export class TracingUtils {
  /**
   * Create a custom span
   */
  static async withSpan<T>(
    name: string,
    fn: (span: any) => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    const spanOptions = attributes ? { attributes } : {};
    return tracer.startActiveSpan(name, spanOptions, async span => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Add attributes to current span
   */
  static addAttributes(attributes: SpanAttributes) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      for (const [key, value] of Object.entries(attributes)) {
        currentSpan.setAttribute(key, value);
      }
    }
  }

  /**
   * Add event to current span
   */
  static addEvent(name: string, attributes?: SpanAttributes) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  /**
   * Create a database span
   */
  static async withDatabaseSpan<T>(
    operation: string,
    table: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withSpan(`db.${operation}`, fn, {
      'db.operation': operation,
      'db.table': table,
      'span.kind': SpanKind.CLIENT,
    });
  }
}
