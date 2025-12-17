// Enhanced error handling utilities for better user experience

export interface ErrorHandlerResult {
  message: string;
  isRetryable: boolean;
  suggestedAction?: string;
}

export class ErrorHandler {
  static handleAuthError(error: any): ErrorHandlerResult {
    let message = "Error inesperado";
    let isRetryable = false;
    let suggestedAction: string | undefined;

    if (error.code) {
      // Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = "Este correo electrónico ya está registrado";
          suggestedAction = "¿Deseas iniciar sesión en su lugar?";
          break;
        case 'auth/weak-password':
          message = "La contraseña es demasiado débil";
          suggestedAction = "Usa al menos 8 caracteres con letras, números y símbolos";
          break;
        case 'auth/invalid-email':
          message = "El formato del correo electrónico no es válido";
          break;
        case 'auth/user-not-found':
          message = "No existe una cuenta con este correo electrónico";
          suggestedAction = "¿Deseas crear una cuenta nueva?";
          break;
        case 'auth/wrong-password':
          message = "Contraseña incorrecta";
          suggestedAction = "¿Olvidaste tu contraseña?";
          break;
        case 'auth/user-disabled':
          message = "Esta cuenta ha sido deshabilitada";
          suggestedAction = "Contacta al soporte para más información";
          break;
        case 'auth/too-many-requests':
          message = "Demasiados intentos fallidos";
          suggestedAction = "Espera unos minutos e intenta de nuevo";
          isRetryable = true;
          break;
        case 'auth/network-request-failed':
          message = "Error de conexión a internet";
          suggestedAction = "Verifica tu conexión e intenta de nuevo";
          isRetryable = true;
          break;
        case 'auth/timeout':
          message = "La solicitud tardó demasiado tiempo";
          suggestedAction = "Intenta de nuevo";
          isRetryable = true;
          break;
        default:
          message = "Error de autenticación";
          isRetryable = true;
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network fetch errors
      message = "Error de conexión con el servidor";
      suggestedAction = "Verifica tu internet e intenta más tarde";
      isRetryable = true;
    } else if (error.message) {
      // Custom error messages
      if (error.message.toLowerCase().includes('failed to fetch')) {
        message = "No se pudo conectar con el servidor";
        suggestedAction = "Verifica tu conexión a internet";
        isRetryable = true;
      } else if (error.message.toLowerCase().includes('network')) {
        message = "Error de red";
        suggestedAction = "Verifica tu conexión e intenta de nuevo";
        isRetryable = true;
      } else if (error.message.includes('domain')) {
        message = error.message; // Keep domain-specific messages
      } else {
        message = error.message.includes('Error') ? error.message : `Error: ${error.message}`;
        isRetryable = true;
      }
    }

    return { message, isRetryable, suggestedAction };
  }

  static handleNetworkError(error: any): ErrorHandlerResult {
    let message = "Error de conexión";
    let isRetryable = true;
    let suggestedAction = "Verifica tu internet e intenta de nuevo";

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      message = "No se pudo conectar con el servidor";
    } else if (error.message && error.message.toLowerCase().includes('timeout')) {
      message = "La conexión tardó demasiado tiempo";
      suggestedAction = "Intenta de nuevo en unos momentos";
    } else if (error.status) {
      // HTTP status errors
      switch (error.status) {
        case 400:
          message = "Datos inválidos enviados al servidor";
          isRetryable = false;
          break;
        case 401:
          message = "No autorizado - verifica tus credenciales";
          isRetryable = false;
          break;
        case 403:
          message = "Acceso denegado";
          isRetryable = false;
          break;
        case 404:
          message = "Servicio no encontrado";
          suggestedAction = "El servicio podría estar temporalmente no disponible";
          break;
        case 429:
          message = "Demasiadas solicitudes";
          suggestedAction = "Espera unos minutos e intenta de nuevo";
          break;
        case 500:
          message = "Error interno del servidor";
          suggestedAction = "Intenta más tarde";
          break;
        case 502:
        case 503:
        case 504:
          message = "Servicio temporalmente no disponible";
          suggestedAction = "Intenta en unos minutos";
          break;
        default:
          message = `Error del servidor (${error.status})`;
      }
    }

    return { message, isRetryable, suggestedAction };
  }

  static formatErrorMessage(result: ErrorHandlerResult): string {
    let fullMessage = result.message;
    
    if (result.suggestedAction) {
      fullMessage += `. ${result.suggestedAction}`;
    }
    
    return fullMessage;
  }

  static shouldShowRetryButton(result: ErrorHandlerResult): boolean {
    return result.isRetryable;
  }
}