// A simple logging service that can be expanded later.
// For now, it just logs to the console.
// In a real production app, this could be integrated with a service like Sentry, LogRocket, or Datadog.

interface LogInfo {
  componentStack?: string;
  [key: string]: any;
}

const error = (error: Error, info?: LogInfo) => {
  console.error("Caught an error:", error, info);
  // Example of sending to an external service:
  // Sentry.withScope(scope => {
  //   if (info) {
  //     scope.setExtras(info);
  //   }
  //   Sentry.captureException(error);
  // });
};

export const logger = {
  error,
};
