import { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

export interface UserDataService {
  fetchUserActivity(userId: string): Promise<any>;
  fetchUserProfile(userId: string): Promise<any>;
  handlePermissionError(error: FirebaseError): Promise<void>;
  retryWithBackoff<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>;
}

export interface PermissionErrorHandler {
  isPermissionError(error: Error): boolean;
  getErrorMessage(error: FirebaseError): string;
  suggestRecoveryAction(error: FirebaseError): string;
}

/**
 * Enhanced User Data Service with error handling and retry logic
 */
export class EnhancedUserDataService implements UserDataService, PermissionErrorHandler {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  /**
   * Checks if an error is a Firebase permission error
   */
  isPermissionError(error: Error): boolean {
    if (error instanceof FirebaseError) {
      return error.code === 'permission-denied' || 
             error.code === 'unauthenticated' ||
             error.message.includes('Missing or insufficient permissions');
    }
    return error.message.includes('permission') || 
           error.message.includes('unauthorized') ||
           error.message.includes('Missing or insufficient permissions');
  }

  /**
   * Gets user-friendly error message for Firebase errors
   */
  getErrorMessage(error: FirebaseError): string {
    switch (error.code) {
      case 'permission-denied':
        return 'No tienes permisos para acceder a esta información. Por favor, verifica que hayas iniciado sesión correctamente.';
      case 'unauthenticated':
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      case 'unavailable':
        return 'El servicio no está disponible temporalmente. Por favor, intenta más tarde.';
      case 'deadline-exceeded':
        return 'La operación tardó demasiado tiempo. Por favor, verifica tu conexión a internet.';
      case 'not-found':
        return 'La información solicitada no fue encontrada.';
      default:
        return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
    }
  }

  /**
   * Suggests recovery actions for Firebase errors
   */
  suggestRecoveryAction(error: FirebaseError): string {
    switch (error.code) {
      case 'permission-denied':
        return 'Intenta cerrar sesión y volver a iniciar sesión.';
      case 'unauthenticated':
        return 'Haz clic en "Iniciar sesión" para autenticarte nuevamente.';
      case 'unavailable':
        return 'Espera unos minutos e intenta recargar la página.';
      case 'deadline-exceeded':
        return 'Verifica tu conexión a internet y recarga la página.';
      case 'not-found':
        return 'Contacta al soporte si el problema persiste.';
      default:
        return 'Recarga la página o contacta al soporte técnico.';
    }
  }

  /**
   * Handles permission errors with user-friendly messaging
   */
  async handlePermissionError(error: FirebaseError): Promise<void> {
    const userMessage = this.getErrorMessage(error);
    const recoveryAction = this.suggestRecoveryAction(error);
    
    // Log detailed error for developers
    console.error('Permission error details:', {
      code: error.code,
      message: error.message,
      userMessage,
      recoveryAction,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly notification
    this.showUserNotification(userMessage, recoveryAction, 'error');

    // For authentication errors, redirect to login
    if (error.code === 'unauthenticated') {
      // Delay to allow user to read the message
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
  }

  /**
   * Retries an operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>, 
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry permission errors
        if (this.isPermissionError(lastError)) {
          if (lastError instanceof FirebaseError) {
            await this.handlePermissionError(lastError);
          }
          throw lastError;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Fetches user activity with error handling
   */
  async fetchUserActivity(userId: string): Promise<any> {
    return this.retryWithBackoff(async () => {
      // Import here to avoid circular dependencies
      const { DashboardDataService } = await import('./dashboardDataService');
      const user = { uid: userId } as User;
      return DashboardDataService.getUserActivity(user);
    });
  }

  /**
   * Fetches user profile with error handling
   */
  async fetchUserProfile(userId: string): Promise<any> {
    return this.retryWithBackoff(async () => {
      // Import here to avoid circular dependencies
      const { DashboardDataService } = await import('./dashboardDataService');
      const user = { uid: userId } as User;
      return DashboardDataService.getUserProfile(user);
    });
  }

  /**
   * Shows user notification (can be replaced with your notification system)
   */
  private showUserNotification(message: string, action: string, type: 'error' | 'warning' | 'info') {
    // For now, use console and alert
    // In a real app, this would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message} - ${action}`);
    
    // Create a simple toast notification
    this.createToastNotification(message, action, type);
  }

  /**
   * Creates a simple toast notification
   */
  private createToastNotification(message: string, action: string, type: 'error' | 'warning' | 'info') {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg z-50 ${
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-black' :
      'bg-blue-500 text-white'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <p class="font-medium">${message}</p>
          <p class="text-sm mt-1 opacity-90">${action}</p>
        </div>
        <button class="ml-2 text-current opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 8000);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const userDataService = new EnhancedUserDataService();