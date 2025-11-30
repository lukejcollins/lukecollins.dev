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

export async function logToLoki(
  level: LokiLogLevel,
  message: string,
  labels: LokiLabels = {},
  payload?: unknown
) {
  if (!lokiUrl || !basicAuth) return;

  const timestampNs = Date.now() * 1_000_000;
  const stream = {
    app: "next-blog",
    env: process.env.LOG_ENV || process.env.NODE_ENV || "development",
    level,
    ...labels,
  };

  const line = JSON.stringify(
    payload ? { level, message, payload } : { level, message }
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
    await fetch(lokiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("loki push failed", err);
    try {
      console.error("loki payload", JSON.stringify(body));
    } catch {
    }
  }
}
