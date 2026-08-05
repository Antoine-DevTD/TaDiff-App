import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { reportApplicationError } = await import("@/lib/error-reporting");
  const caught = error instanceof Error ? error : new Error(String(error));
  const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : "";
  await reportApplicationError({ message: caught.message, code: digest, route: request.path || context.routePath, source: `next:${context.routeType}` });
};
