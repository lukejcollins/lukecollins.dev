"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
    const payload = {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      path: window.location.pathname,
    };

    fetch("/api/log-client", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
    });
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
