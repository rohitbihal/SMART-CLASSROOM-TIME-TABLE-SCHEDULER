import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// FIX: Changed to extend named import `Component` from React to resolve a type error where `this.props` was not being recognized.
export class ErrorBoundary extends Component<Props, State> {
  // FIX: Replaced the constructor with a state class property. This is a more modern syntax and resolves the type errors where `this.state` was not being recognized.
  state: State = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using a logging service
    logger.error(error, errorInfo);
  }

  render() {
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
                 {/* FIX: Removed `(import.meta as any)` cast now that vite-env.d.ts provides proper types. */}
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
