// backend/src/unified-email/exceptions/unified-email.exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for unified email system
 */
export abstract class UnifiedEmailException extends HttpException {
  public readonly errorCode: string;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    status: HttpStatus,
    errorCode: string,
    retryable: boolean = false,
    userMessage?: string
  ) {
    super(message, status);
    this.errorCode = errorCode;
    this.retryable = retryable;
    this.userMessage = userMessage || message;
  }

  toJSON() {
    return {
      message: this.message,
      errorCode: this.errorCode,
      retryable: this.retryable,
      userMessage: this.userMessage,
      statusCode: this.getStatus(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Authentication related exceptions
 */
export class AuthenticationFailedException extends UnifiedEmailException {
  constructor(message: string = 'Fallo en la autenticación', userMessage?: string) {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'AUTH_FAILED',
      false,
      userMessage || 'Credenciales inválidas. Por favor, verifica tu email y contraseña.'
    );
  }
}

export class AccountOwnershipValidationException extends UnifiedEmailException {
  constructor(message: string = 'Validación de propiedad de cuenta fallida') {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'ACCOUNT_OWNERSHIP_FAILED',
      true,
      'No se pudo verificar que seas el propietario de esta cuenta. Intenta nuevamente.'
    );
  }
}

export class SessionExpiredException extends UnifiedEmailException {
  constructor(message: string = 'Sesión expirada') {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'SESSION_EXPIRED',
      false,
      'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
    );
  }
}

/**
 * Profile management exceptions
 */
export class ProfileNotFoundException extends UnifiedEmailException {
  constructor(profileType: string, userId?: string) {
    const message = `Perfil de ${profileType} no encontrado${userId ? ` para usuario ${userId}` : ''}`;
    super(
      message,
      HttpStatus.NOT_FOUND,
      'PROFILE_NOT_FOUND',
      false,
      `No se encontró tu perfil de ${profileType}. Puedes crear uno nuevo desde la configuración.`
    );
  }
}

export class ProfileAlreadyExistsException extends UnifiedEmailException {
  constructor(profileType: string) {
    super(
      `El usuario ya tiene un perfil de ${profileType}`,
      HttpStatus.CONFLICT,
      'PROFILE_ALREADY_EXISTS',
      false,
      `Ya tienes un perfil de ${profileType}. Puedes editarlo desde la configuración de tu cuenta.`
    );
  }
}

export class ProfileCreationFailedException extends UnifiedEmailException {
  constructor(profileType: string, originalError?: Error) {
    super(
      `Error al crear perfil de ${profileType}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'PROFILE_CREATION_FAILED',
      true,
      `No se pudo crear tu perfil de ${profileType}. Por favor, intenta nuevamente en unos momentos.`
    );
  }
}

export class ProfileUpdateFailedException extends UnifiedEmailException {
  constructor(profileType: string, originalError?: Error) {
    super(
      `Error al actualizar perfil de ${profileType}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'PROFILE_UPDATE_FAILED',
      true,
      `No se pudo actualizar tu perfil de ${profileType}. Por favor, intenta nuevamente.`
    );
  }
}

export class ProfileDeletionFailedException extends UnifiedEmailException {
  constructor(profileType: string, originalError?: Error) {
    super(
      `Error al eliminar perfil de ${profileType}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'PROFILE_DELETION_FAILED',
      true,
      `No se pudo eliminar tu perfil de ${profileType}. Por favor, intenta nuevamente.`
    );
  }
}

/**
 * Role management exceptions
 */
export class InvalidRoleException extends UnifiedEmailException {
  constructor(role: string, availableRoles: string[]) {
    super(
      `Rol inválido: ${role}. Roles disponibles: ${availableRoles.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_ROLE',
      false,
      `No tienes acceso al rol de ${role}. Roles disponibles: ${availableRoles.join(', ')}.`
    );
  }
}

export class RoleSwitchFailedException extends UnifiedEmailException {
  constructor(fromRole: string, toRole: string, originalError?: Error) {
    super(
      `Error al cambiar de rol ${fromRole} a ${toRole}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ROLE_SWITCH_FAILED',
      true,
      `No se pudo cambiar al rol de ${toRole}. Por favor, intenta nuevamente.`
    );
  }
}

export class SessionCreationFailedException extends UnifiedEmailException {
  constructor(originalError?: Error) {
    super(
      `Error al crear sesión: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SESSION_CREATION_FAILED',
      true,
      'No se pudo crear tu sesión. Por favor, intenta iniciar sesión nuevamente.'
    );
  }
}

/**
 * Data validation exceptions
 */
export class InvalidProfileDataException extends UnifiedEmailException {
  constructor(validationErrors: string[]) {
    super(
      `Datos de perfil inválidos: ${validationErrors.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_PROFILE_DATA',
      false,
      `Los datos del perfil no son válidos: ${validationErrors.join(', ')}`
    );
  }
}

export class DataIsolationViolationException extends UnifiedEmailException {
  constructor(violation: string) {
    super(
      `Violación de aislamiento de datos: ${violation}`,
      HttpStatus.FORBIDDEN,
      'DATA_ISOLATION_VIOLATION',
      false,
      'Acceso no autorizado a datos de perfil. Verifica que estés en el contexto correcto.'
    );
  }
}

export class CrossProfileAccessException extends UnifiedEmailException {
  constructor(requestingRole: string, targetRole: string) {
    super(
      `Acceso cruzado de perfiles no permitido: ${requestingRole} -> ${targetRole}`,
      HttpStatus.FORBIDDEN,
      'CROSS_PROFILE_ACCESS',
      false,
      `No puedes acceder a datos de ${targetRole} mientras estás en modo ${requestingRole}.`
    );
  }
}

/**
 * Network and infrastructure exceptions
 */
export class FirestoreConnectionException extends UnifiedEmailException {
  constructor(operation: string, originalError?: Error) {
    super(
      `Error de conexión a Firestore durante ${operation}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'FIRESTORE_CONNECTION_ERROR',
      true,
      'Problemas de conexión con la base de datos. Por favor, intenta nuevamente en unos momentos.'
    );
  }
}

export class FirebaseAuthException extends UnifiedEmailException {
  constructor(operation: string, originalError?: Error) {
    super(
      `Error de Firebase Auth durante ${operation}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'FIREBASE_AUTH_ERROR',
      true,
      'Problemas con el servicio de autenticación. Por favor, intenta nuevamente.'
    );
  }
}

export class NetworkTimeoutException extends UnifiedEmailException {
  constructor(operation: string, timeout: number) {
    super(
      `Timeout durante ${operation} después de ${timeout}ms`,
      HttpStatus.REQUEST_TIMEOUT,
      'NETWORK_TIMEOUT',
      true,
      'La operación tardó demasiado tiempo. Por favor, verifica tu conexión e intenta nuevamente.'
    );
  }
}

export class RateLimitExceededException extends UnifiedEmailException {
  constructor(operation: string, retryAfter?: number) {
    super(
      `Límite de velocidad excedido para ${operation}`,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      true,
      `Demasiadas solicitudes. Por favor, espera ${retryAfter ? `${retryAfter} segundos` : 'un momento'} antes de intentar nuevamente.`
    );
  }
}

/**
 * Business logic exceptions
 */
export class LastProfileDeletionException extends UnifiedEmailException {
  constructor() {
    super(
      'No se puede eliminar el último perfil sin eliminar la cuenta',
      HttpStatus.BAD_REQUEST,
      'LAST_PROFILE_DELETION',
      false,
      'Este es tu último perfil. Si lo eliminas, también se eliminará tu cuenta completa. ¿Deseas continuar?'
    );
  }
}

export class ProfileLinkingFailedException extends UnifiedEmailException {
  constructor(profileType: string, originalError?: Error) {
    super(
      `Error al vincular perfil de ${profileType}: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'PROFILE_LINKING_FAILED',
      true,
      `No se pudo vincular tu perfil de ${profileType} a la cuenta existente. Por favor, intenta nuevamente.`
    );
  }
}

export class AccountCleanupFailedException extends UnifiedEmailException {
  constructor(originalError?: Error) {
    super(
      `Error durante limpieza de cuenta: ${originalError?.message || 'Error desconocido'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ACCOUNT_CLEANUP_FAILED',
      true,
      'No se pudo completar la limpieza de la cuenta. Por favor, contacta al soporte técnico.'
    );
  }
}

/**
 * Utility function to determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof UnifiedEmailException) {
    return error.retryable;
  }

  // Check for common retryable error patterns
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /unavailable/i,
    /rate.?limit/i,
    /quota.?exceeded/i,
    /internal.?server.?error/i
  ];

  const errorMessage = error?.message || error?.toString() || '';
  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Utility function to extract user-friendly message from error
 */
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof UnifiedEmailException) {
    return error.userMessage;
  }

  // Default user-friendly messages for common error types
  const errorMessage = error?.message || error?.toString() || '';
  
  if (/timeout/i.test(errorMessage)) {
    return 'La operación tardó demasiado tiempo. Por favor, intenta nuevamente.';
  }
  
  if (/network|connection/i.test(errorMessage)) {
    return 'Problemas de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
  }
  
  if (/not.?found/i.test(errorMessage)) {
    return 'El recurso solicitado no fue encontrado.';
  }
  
  if (/unauthorized|forbidden/i.test(errorMessage)) {
    return 'No tienes permisos para realizar esta acción.';
  }
  
  if (/rate.?limit/i.test(errorMessage)) {
    return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.';
  }

  return 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente o contacta al soporte técnico.';
}