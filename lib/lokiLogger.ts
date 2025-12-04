import {context, trace, ROOT_CONTEXT} from "@opentelemetry/api";

const lokiHost = process.env.GRAFANA_LOKI_HOST?.replace(/\/$/, "");
const lokiUser = process.env.GRAFANA_LOKI_USER;
const lokiApiKey = process.env.GRAFANA_LOKI_API_KEY;

const lokiUrl = lokiHost ? `${lokiHost}/loki/api/v1/push` : null;
const basicAuth =
  lokiUser && lokiApiKey
    ? Buffer.from(`${lokiUser}:${lokiApiKey}`).toString("base64")
    : null;

export type LokiLogLevel = "info" | "warn" | "error";
export type LokiLabels = Record<string, string>;

function getTraceContext() {
  const span = trace.getSpan(context.active());
  if (!span) return null;
  const spanContext = span.spanContext();
  if (!spanContext.traceId || !spanContext.spanId) return null;
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
    trace_flags: spanContext.traceFlags,
  };
}

export async function logToLoki(
  level: LokiLogLevel,
  message: string,
  labels: LokiLabels = {},
  payload?: unknown
) {
  if (!lokiUrl || !basicAuth) return;

  const timestampNs = Date.now() * 1_000_000;
  const traceCtx = getTraceContext() || undefined;
  const stream = {
    app: "next-blog",
    env: process.env.LOG_ENV || process.env.NODE_ENV || "development",
    level,
    ...labels,
  };

  const line = JSON.stringify(
    payload
      ? traceCtx
        ? { level, message, payload, ...traceCtx }
        : { level, message, payload }
      : traceCtx
      ? { level, message, ...traceCtx }
      : { level, message }
  );

  const body = {
    streams: [
      {
        stream,
        values: [[timestampNs.toString(), line]],
      },
    ],
  };

  try {
    await context.with(ROOT_CONTEXT, async () => {
      await fetch(lokiUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    });
  } catch (err) {
    console.error("loki push failed", err);
    try {
      console.error("loki payload", JSON.stringify(body));
    } catch {
    }
  }
}
