import { describe, it, expect } from '@jest/globals';
import { ErrorHandler } from '@/lib/utils/errorHandler';

describe('ErrorHandler', () => {
  describe('handleAuthError', () => {
    it('should handle Firebase auth errors correctly', () => {
      const emailInUseError = { code: 'auth/email-already-in-use' };
      const result = ErrorHandler.handleAuthError(emailInUseError);
      
      expect(result.message).toBe('Este correo electrónico ya está registrado');
      expect(result.suggestedAction).toBe('¿Deseas iniciar sesión en su lugar?');
      expect(result.isRetryable).toBe(false);
    });

    it('should handle network errors correctly', () => {
      const networkError = { name: 'TypeError', message: 'Failed to fetch' };
      const result = ErrorHandler.handleAuthError(networkError);
      
      expect(result.message).toBe('Error de conexión con el servidor');
      expect(result.suggestedAction).toBe('Verifica tu internet e intenta más tarde');
      expect(result.isRetryable).toBe(true);
    });

    it('should handle too many requests error', () => {
      const tooManyRequestsError = { code: 'auth/too-many-requests' };
      const result = ErrorHandler.handleAuthError(tooManyRequestsError);
      
      expect(result.message).toBe('Demasiados intentos fallidos');
      expect(result.suggestedAction).toBe('Espera unos minutos e intenta de nuevo');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with suggested action', () => {
      const result = {
        message: 'Test error',
        isRetryable: true,
        suggestedAction: 'Try again'
      };
      
      const formatted = ErrorHandler.formatErrorMessage(result);
      expect(formatted).toBe('Test error. Try again');
    });

    it('should format error message without suggested action', () => {
      const result = {
        message: 'Test error',
        isRetryable: false
      };
      
      const formatted = ErrorHandler.formatErrorMessage(result);
      expect(formatted).toBe('Test error');
    });
  });

  describe('shouldShowRetryButton', () => {
    it('should return true for retryable errors', () => {
      const result = { message: 'Error', isRetryable: true };
      expect(ErrorHandler.shouldShowRetryButton(result)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const result = { message: 'Error', isRetryable: false };
      expect(ErrorHandler.shouldShowRetryButton(result)).toBe(false);
    });
  });
});