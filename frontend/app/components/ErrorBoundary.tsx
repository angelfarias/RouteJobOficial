"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { ErrorInfo } from '../../lib/services/errorHandling.service';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: ErrorInfo; retry: () => void }>;
  onError?: (error: any, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={{
              code: 'COMPONENT_ERROR',
              message: this.state.error?.message || 'Component error',
              userMessage: 'Ha ocurrido un error en la aplicación',
              retryable: true,
              severity: 'medium',
              timestamp: new Date()
            }}
            retry={this.retry}
          />
        );
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: any;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          ¡Ups! Algo salió mal
        </h1>
        
        <p className="text-zinc-600 mb-6">
          Ha ocurrido un error inesperado. Puedes intentar recargar la página o volver al inicio.
        </p>

        {isDevelopment && (
          <div className="mb-6 p-3 bg-zinc-100 rounded-lg text-left">
            <p className="text-xs font-mono text-zinc-700 break-all">
              {error?.message || 'Unknown error'}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={retry}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>

        {isDevelopment && (
          <button
            onClick={() => {
              console.error('Full error details:', error);
              alert('Error details logged to console');
            }}
            className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <Bug className="w-4 h-4" />
            Ver detalles técnicos
          </button>
        )}
      </div>
    </div>
  );
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: ErrorInfo; retry: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;