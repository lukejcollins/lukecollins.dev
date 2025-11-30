"use client";

import {useEffect} from "react";

function send(payload: Record<string, unknown>) {
  fetch("/api/log-client", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
  });
}

export function ClientErrorReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      send({
        message: event.message,
        stack: event.error?.stack,
        path: window.location.pathname,
        digest: "window_error",
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled rejection";
      const stack = reason instanceof Error ? reason.stack : undefined;

      send({
        message,
        stack,
        path: window.location.pathname,
        digest: "unhandled_rejection",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
