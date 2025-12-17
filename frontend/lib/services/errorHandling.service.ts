// frontend/lib/services/errorHandling.service.ts
import { ProfileType } from '../types/unified-email.types';

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'redirect' | 'refresh' | 'logout' | 'manual';
  label: string;
  description: string;
  action?: () => Promise<void> | void;
  url?: string;
  requiresConfirmation?: boolean;
}

export interface ErrorRecoveryPlan {
  canRecover: boolean;
  actions: RecoveryAction[];
  userMessage: string;
  technicalMessage?: string;
  estimatedRecoveryTime?: number;
}

export class ErrorHandlingService {
  private static errorLog: ErrorInfo[] = [];
  private static maxLogSize = 100;

  /**
   * Process and categorize errors
   */
  static processError(error: any, context?: Record<string, any>): ErrorInfo {
    const errorInfo: ErrorInfo = {
      code: this.extractErrorCode(error),
      message: error.message || 'Unknown error',
      userMessage: this.getUserFriendlyMessage(error),
      retryable: this.isRetryable(error),
      severity: this.getSeverity(error),
      timestamp: new Date(),
      context
    };

    this.logError(errorInfo);
    return errorInfo;
  }

  /**
   * Create recovery plan for error
   */
  static createRecoveryPlan(errorInfo: ErrorInfo, currentContext?: {
    userId?: string;
    currentRole?: ProfileType;
    currentPath?: string;
  }): ErrorRecoveryPlan {
    const actions: RecoveryAction[] = [];

    // Authentication errors
    if (this.isAuthError(errorInfo)) {
      actions.push({
        type: 'logout',
        label: 'Iniciar sesión nuevamente',
        description: 'Cerrar sesión e iniciar sesión nuevamente',
        action: () => {
          // Will be implemented by the calling component
          window.location.href = '/auth/login';
        }
      });
    }

    // Network/connection errors
    else if (this.isNetworkError(errorInfo)) {
      if (errorInfo.retryable) {
        actions.push({
          type: 'retry',
          label: 'Reintentar',
          description: 'Intentar la operación nuevamente',
          requiresConfirmation: false
        });
      }

      actions.push({
        type: 'refresh',
        label: 'Recargar página',
        description: 'Recargar la página para restablecer la conexión',
        action: () => window.location.reload()
      });
    }

    // Profile-related errors
    else if (this.isProfileError(errorInfo)) {
      if (errorInfo.code === 'PROFILE_NOT_FOUND') {
        actions.push({
          type: 'redirect',
          label: 'Crear perfil',
          description: 'Ir a la página de creación de perfil',
          url: '/profile/create'
        });
      }

      if (errorInfo.code === 'PROFILE_CREATION_FAILED' && errorInfo.retryable) {
        actions.push({
          type: 'retry',
          label: 'Intentar nuevamente',
          description: 'Reintentar la creación del perfil',
          requiresConfirmation: false
        });
      }
    }

    // Session errors
    else if (this.isSessionError(errorInfo)) {
      actions.push({
        type: 'redirect',
        label: 'Volver al inicio',
        description: 'Ir a la página principal y reiniciar sesión',
        url: currentContext?.currentPath ? `/auth/login?returnTo=${encodeURIComponent(currentContext.currentPath)}` : '/auth/login'
      });
    }

    // Data validation errors
    else if (this.isValidationError(errorInfo)) {
      actions.push({
        type: 'manual',
        label: 'Revisar datos',
        description: 'Verificar y corregir la información ingresada'
      });
    }

    // Generic retryable errors
    else if (errorInfo.retryable) {
      actions.push({
        type: 'retry',
        label: 'Reintentar',
        description: 'Intentar la operación nuevamente'
      });
    }

    // Always provide manual support option for critical errors
    if (errorInfo.severity === 'critical' || actions.length === 0) {
      actions.push({
        type: 'manual',
        label: 'Contactar soporte',
        description: 'Contactar al equipo de soporte técnico para obtener ayuda'
      });
    }

    return {
      canRecover: actions.some(a => a.type !== 'manual'),
      actions,
      userMessage: errorInfo.userMessage,
      technicalMessage: errorInfo.message,
      estimatedRecoveryTime: this.estimateRecoveryTime(errorInfo)
    };
  }

  /**
   * Execute recovery action
   */
  static async executeRecoveryAction(
    action: RecoveryAction,
    onRetry?: () => Promise<void>
  ): Promise<{ success: boolean; error?: any }> {
    try {
      switch (action.type) {
        case 'retry':
          if (onRetry) {
            await onRetry();
          }
          break;

        case 'redirect':
          if (action.url) {
            window.location.href = action.url;
          }
          break;

        case 'refresh':
          window.location.reload();
          break;

        case 'logout':
          // Clear local storage and redirect to login
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/auth/login';
          break;

        case 'manual':
          // Open support contact or show instructions
          break;

        default:
          if (action.action) {
            await action.action();
          }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Extract error code from various error formats
   */
  private static extractErrorCode(error: any): string {
    if (error.errorCode) return error.errorCode;
    if (error.code) return error.code;
    if (error.name) return error.name;
    if (error.status) return `HTTP_${error.status}`;
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: any): string {
    // If error already has a user message, use it
    if (error.userMessage) return error.userMessage;

    const code = this.extractErrorCode(error);
    const message = error.message || '';

    // Authentication errors
    if (code.includes('AUTH') || code.includes('UNAUTHORIZED')) {
      return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    }

    // Network errors
    if (code.includes('NETWORK') || code.includes('CONNECTION') || code.includes('TIMEOUT')) {
      return 'Problemas de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
    }

    // Profile errors
    if (code.includes('PROFILE_NOT_FOUND')) {
      return 'No se encontró tu perfil. Puedes crear uno nuevo desde la configuración.';
    }

    if (code.includes('PROFILE_CREATION_FAILED')) {
      return 'No se pudo crear el perfil. Por favor, intenta nuevamente.';
    }

    if (code.includes('PROFILE_UPDATE_FAILED')) {
      return 'No se pudo actualizar el perfil. Por favor, intenta nuevamente.';
    }

    // Validation errors
    if (code.includes('VALIDATION') || code.includes('INVALID')) {
      return 'Los datos ingresados no son válidos. Por favor, revisa la información.';
    }

    // Rate limiting
    if (code.includes('RATE_LIMIT') || code.includes('TOO_MANY_REQUESTS')) {
      return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.';
    }

    // Server errors
    if (code.includes('SERVER') || code.includes('INTERNAL')) {
      return 'Error del servidor. Por favor, intenta nuevamente en unos momentos.';
    }

    // Default message
    return 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente o contacta al soporte técnico.';
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryable(error: any): boolean {
    if (error.retryable !== undefined) return error.retryable;

    const code = this.extractErrorCode(error);
    const message = error.message || '';

    // Non-retryable errors
    const nonRetryablePatterns = [
      /AUTH.*FAILED/i,
      /UNAUTHORIZED/i,
      /FORBIDDEN/i,
      /NOT_FOUND/i,
      /VALIDATION/i,
      /INVALID.*DATA/i,
      /CONFLICT/i
    ];

    if (nonRetryablePatterns.some(pattern => pattern.test(code) || pattern.test(message))) {
      return false;
    }

    // Retryable errors
    const retryablePatterns = [
      /NETWORK/i,
      /CONNECTION/i,
      /TIMEOUT/i,
      /SERVER.*ERROR/i,
      /UNAVAILABLE/i,
      /RATE.*LIMIT/i,
      /CREATION.*FAILED/i,
      /UPDATE.*FAILED/i
    ];

    return retryablePatterns.some(pattern => pattern.test(code) || pattern.test(message));
  }

  /**
   * Determine error severity
   */
  private static getSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    const code = this.extractErrorCode(error);
    const message = error.message || '';

    // Critical errors
    if (/CRITICAL|FATAL|SECURITY/i.test(code) || /CRITICAL|FATAL|SECURITY/i.test(message)) {
      return 'critical';
    }

    // High severity
    if (/AUTH.*FAILED|UNAUTHORIZED|DATA.*LOSS|CORRUPTION/i.test(code)) {
      return 'high';
    }

    // Medium severity
    if (/PROFILE.*FAILED|SESSION.*EXPIRED|NETWORK/i.test(code)) {
      return 'medium';
    }

    // Low severity (validation, user input errors)
    return 'low';
  }

  /**
   * Check if error is authentication-related
   */
  private static isAuthError(errorInfo: ErrorInfo): boolean {
    return /AUTH|UNAUTHORIZED|SESSION.*EXPIRED|LOGIN.*FAILED/i.test(errorInfo.code);
  }

  /**
   * Check if error is network-related
   */
  private static isNetworkError(errorInfo: ErrorInfo): boolean {
    return /NETWORK|CONNECTION|TIMEOUT|UNAVAILABLE/i.test(errorInfo.code);
  }

  /**
   * Check if error is profile-related
   */
  private static isProfileError(errorInfo: ErrorInfo): boolean {
    return /PROFILE/i.test(errorInfo.code);
  }

  /**
   * Check if error is session-related
   */
  private static isSessionError(errorInfo: ErrorInfo): boolean {
    return /SESSION/i.test(errorInfo.code);
  }

  /**
   * Check if error is validation-related
   */
  private static isValidationError(errorInfo: ErrorInfo): boolean {
    return /VALIDATION|INVALID.*DATA/i.test(errorInfo.code);
  }

  /**
   * Estimate recovery time based on error type
   */
  private static estimateRecoveryTime(errorInfo: ErrorInfo): number {
    switch (errorInfo.severity) {
      case 'low':
        return 5000; // 5 seconds
      case 'medium':
        return 15000; // 15 seconds
      case 'high':
        return 30000; // 30 seconds
      case 'critical':
        return 60000; // 1 minute
      default:
        return 10000; // 10 seconds
    }
  }

  /**
   * Log error for debugging and analytics
   */
  private static logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize / 2);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorInfo);
    }

    // In production, you might want to send to analytics service
    // analytics.track('error_occurred', errorInfo);
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStatistics(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorInfo[];
  } {
    const errorsByCode: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errorLog.forEach(error => {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(error => error.timestamp > oneHourAgo);

    return {
      totalErrors: this.errorLog.length,
      errorsByCode,
      errorsBySeverity,
      recentErrors
    };
  }

  /**
   * Clear error log (for testing)
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log for debugging
   */
  static exportErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }
}