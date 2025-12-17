// frontend/lib/hooks/useErrorHandling.ts
import { useState, useCallback, useRef } from 'react';
import { ErrorHandlingService, ErrorInfo, ErrorRecoveryPlan, RecoveryAction } from '../services/errorHandling.service';
import { ProfileType } from '../types/unified-email.types';

export interface UseErrorHandlingOptions {
  userId?: string;
  currentRole?: ProfileType;
  currentPath?: string;
  onError?: (error: ErrorInfo) => void;
  onRecovery?: (action: RecoveryAction) => void;
  autoRetry?: boolean;
  maxAutoRetries?: number;
}

export interface ErrorState {
  hasError: boolean;
  errorInfo: ErrorInfo | null;
  recoveryPlan: ErrorRecoveryPlan | null;
  isRecovering: boolean;
  retryCount: number;
}

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorInfo: null,
    recoveryPlan: null,
    isRecovering: false,
    retryCount: 0
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const maxAutoRetries = options.maxAutoRetries || 3;

  /**
   * Handle error and create recovery plan
   */
  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const errorInfo = ErrorHandlingService.processError(error, {
      ...context,
      userId: options.userId,
      currentRole: options.currentRole,
      currentPath: options.currentPath
    });

    const recoveryPlan = ErrorHandlingService.createRecoveryPlan(errorInfo, {
      userId: options.userId,
      currentRole: options.currentRole,
      currentPath: options.currentPath
    });

    setErrorState(prev => ({
      hasError: true,
      errorInfo,
      recoveryPlan,
      isRecovering: false,
      retryCount: prev.retryCount
    }));

    // Call error callback if provided
    if (options.onError) {
      options.onError(errorInfo);
    }

    // Auto-retry for retryable errors if enabled
    if (options.autoRetry && 
        errorInfo.retryable && 
        errorState.retryCount < maxAutoRetries) {
      
      const retryAction = recoveryPlan.actions.find(a => a.type === 'retry');
      if (retryAction) {
        // Delay before auto-retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, errorState.retryCount), 10000);
        
        retryTimeoutRef.current = setTimeout(() => {
          executeRecoveryAction(retryAction);
        }, delay);
      }
    }
  }, [options, errorState.retryCount, maxAutoRetries]);

  /**
   * Execute recovery action
   */
  const executeRecoveryAction = useCallback(async (
    action: RecoveryAction,
    onRetry?: () => Promise<void>
  ) => {
    setErrorState(prev => ({
      ...prev,
      isRecovering: true
    }));

    try {
      const result = await ErrorHandlingService.executeRecoveryAction(action, onRetry);
      
      if (result.success) {
        // Recovery successful
        setErrorState(prev => ({
          hasError: false,
          errorInfo: null,
          recoveryPlan: null,
          isRecovering: false,
          retryCount: action.type === 'retry' ? prev.retryCount + 1 : 0
        }));

        if (options.onRecovery) {
          options.onRecovery(action);
        }
      } else {
        // Recovery failed
        if (result.error) {
          handleError(result.error, { recoveryAttempt: true });
        } else {
          setErrorState(prev => ({
            ...prev,
            isRecovering: false
          }));
        }
      }
    } catch (recoveryError) {
      // Recovery action itself failed
      handleError(recoveryError, { recoveryAttempt: true });
    }
  }, [handleError, options]);

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (onRetry?: () => Promise<void>) => {
    if (!errorState.recoveryPlan) return;

    const retryAction = errorState.recoveryPlan.actions.find(a => a.type === 'retry');
    if (retryAction) {
      await executeRecoveryAction(retryAction, onRetry);
    }
  }, [errorState.recoveryPlan, executeRecoveryAction]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState({
      hasError: false,
      errorInfo: null,
      recoveryPlan: null,
      isRecovering: false,
      retryCount: 0
    });
  }, []);

  /**
   * Wrap async function with error handling
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: Record<string, any>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        clearError();
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        return null;
      }
    };
  }, [handleError, clearError]);

  /**
   * Wrap sync function with error handling
   */
  const withSyncErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    context?: Record<string, any>
  ) => {
    return (...args: T): R | null => {
      try {
        clearError();
        return fn(...args);
      } catch (error) {
        handleError(error, context);
        return null;
      }
    };
  }, [handleError, clearError]);

  /**
   * Create error boundary for components
   */
  const createErrorBoundary = useCallback((fallback?: React.ComponentType<{ error: ErrorInfo }>) => {
    return class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error: any }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
      }

      componentDidCatch(error: any, errorInfo: any) {
        handleError(error, { 
          componentStack: errorInfo.componentStack,
          errorBoundary: true 
        });
      }

      render() {
        if (this.state.hasError) {
          if (fallback) {
            const FallbackComponent = fallback;
            return <FallbackComponent error={errorState.errorInfo!} />;
          }
          
          return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Ha ocurrido un error
              </h3>
              <p className="text-red-600 mb-4">
                {errorState.errorInfo?.userMessage || 'Error inesperado'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Recargar página
              </button>
            </div>
          );
        }

        return this.props.children;
      }
    };
  }, [handleError, errorState.errorInfo]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Error state
    ...errorState,
    
    // Actions
    handleError,
    executeRecoveryAction,
    retry,
    clearError,
    
    // Utilities
    withErrorHandling,
    withSyncErrorHandling,
    createErrorBoundary,
    
    // Computed properties
    canRetry: errorState.recoveryPlan?.actions.some(a => a.type === 'retry') || false,
    isRetryable: errorState.errorInfo?.retryable || false,
    hasReachedMaxRetries: errorState.retryCount >= maxAutoRetries
  };
}