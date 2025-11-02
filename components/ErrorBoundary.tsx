import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using a logging service
    logger.error(error, errorInfo);
  }

  // FIX: Changed to a standard class method to ensure `this` is correctly bound and props are accessible.
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-red-500">Oops! Something went wrong.</h1>
                <p className="mt-4 text-lg text-text-secondary">We're sorry for the inconvenience. Please try refreshing the page.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-accent-primary text-white font-semibold rounded-lg hover:bg-accent-primary-hover transition-colors"
                >
                    Refresh Page
                </button>
                 {/* FIX: Use import.meta.env.DEV for environment checking in Vite, as process.env is not available in the browser. */}
                 {import.meta.env.DEV && (
                    <details className="mt-6 text-left bg-bg-secondary p-4 rounded-lg border border-border-primary">
                        <summary className="font-semibold cursor-pointer">Error Details</summary>
                        <pre className="mt-2 text-sm whitespace-pre-wrap">
                            {this.state.error?.toString()}
                        </pre>
                    </details>
                )}
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}