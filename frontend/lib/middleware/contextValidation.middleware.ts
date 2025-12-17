// frontend/lib/middleware/contextValidation.middleware.ts
import { ProfileType } from '../types/unified-email.types';
import { DataIsolationService, OperationContext, ValidationResult } from '../services/dataIsolation.service';

export interface RequestContext {
  userId: string;
  activeRole: ProfileType;
  sessionId?: string;
  timestamp: number;
}

export interface ProtectedOperation {
  name: string;
  requiredRole?: ProfileType;
  allowedRoles?: ProfileType[];
  validateData?: boolean;
  logAccess?: boolean;
}

export class ContextValidationMiddleware {
  private static accessLog: Array<{
    userId: string;
    operation: string;
    role: ProfileType;
    timestamp: number;
    success: boolean;
    errors?: string[];
  }> = [];

  /**
   * Validate request context before allowing operation
   */
  static async validateRequest(
    context: RequestContext,
    operation: ProtectedOperation,
    requestData?: any
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Basic context validation
      const contextValidation = this.validateBasicContext(context, operation);
      if (!contextValidation.isValid) {
        this.logAccess(context, operation, false, contextValidation.errors);
        return contextValidation;
      }

      // Role-based authorization
      const roleValidation = this.validateRoleAuthorization(context, operation);
      if (!roleValidation.isValid) {
        this.logAccess(context, operation, false, roleValidation.errors);
        return roleValidation;
      }

      // Data validation if required
      let dataValidation: ValidationResult = { isValid: true, errors: [], warnings: [] };
      if (operation.validateData && requestData) {
        dataValidation = this.validateOperationData(context, operation, requestData);
        if (!dataValidation.isValid) {
          this.logAccess(context, operation, false, dataValidation.errors);
          return dataValidation;
        }
      }

      // Session validation
      const sessionValidation = this.validateSession(context);
      if (!sessionValidation.isValid) {
        this.logAccess(context, operation, false, sessionValidation.errors);
        return sessionValidation;
      }

      // Log successful validation
      this.logAccess(context, operation, true);

      return {
        isValid: true,
        errors: [],
        warnings: [...roleValidation.warnings, ...dataValidation.warnings],
        sanitizedData: dataValidation.sanitizedData
      };

    } catch (error) {
      const errorMessage = `Error en validación de contexto: ${error}`;
      this.logAccess(context, operation, false, [errorMessage]);
      
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  /**
   * Validate basic request context
   */
  private static validateBasicContext(
    context: RequestContext,
    operation: ProtectedOperation
  ): ValidationResult {
    const errors: string[] = [];

    // Validate user ID
    if (!context.userId || context.userId.trim() === '') {
      errors.push('ID de usuario requerido');
    }

    // Validate active role
    if (!context.activeRole) {
      errors.push('Rol activo requerido');
    }

    if (!['candidate', 'company'].includes(context.activeRole)) {
      errors.push(`Rol inválido: ${context.activeRole}`);
    }

    // Validate timestamp (prevent replay attacks)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (context.timestamp && (now - context.timestamp) > maxAge) {
      errors.push('Contexto de solicitud expirado');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate role-based authorization
   */
  private static validateRoleAuthorization(
    context: RequestContext,
    operation: ProtectedOperation
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check specific required role
    if (operation.requiredRole && context.activeRole !== operation.requiredRole) {
      errors.push(
        `Operación '${operation.name}' requiere rol '${operation.requiredRole}', ` +
        `pero el rol activo es '${context.activeRole}'`
      );
    }

    // Check allowed roles
    if (operation.allowedRoles && !operation.allowedRoles.includes(context.activeRole)) {
      errors.push(
        `Operación '${operation.name}' no permitida para rol '${context.activeRole}'. ` +
        `Roles permitidos: ${operation.allowedRoles.join(', ')}`
      );
    }

    // Check for role-specific warnings
    if (context.activeRole === 'candidate' && operation.name.includes('company')) {
      warnings.push('Operación relacionada con empresa ejecutada en contexto de candidato');
    }

    if (context.activeRole === 'company' && operation.name.includes('candidate')) {
      warnings.push('Operación relacionada con candidato ejecutada en contexto de empresa');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate operation-specific data
   */
  private static validateOperationData(
    context: RequestContext,
    operation: ProtectedOperation,
    requestData: any
  ): ValidationResult {
    const operationContext: OperationContext = {
      userId: context.userId,
      activeRole: context.activeRole,
      operation: operation.name,
      targetResource: this.extractResourceFromOperation(operation.name),
      requestData
    };

    return DataIsolationService.validateOperation(operationContext);
  }

  /**
   * Validate session integrity
   */
  private static validateSession(context: RequestContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check session ID format if provided
    if (context.sessionId) {
      if (context.sessionId.length < 10) {
        errors.push('ID de sesión inválido');
      }
    }

    // Check for suspicious activity patterns
    const recentActivity = this.getRecentActivity(context.userId);
    if (recentActivity.length > 100) { // More than 100 operations in recent history
      warnings.push('Actividad inusualmente alta detectada');
    }

    // Check for role switching frequency
    const roleChanges = recentActivity.filter(log => 
      log.operation.includes('role-switch') && 
      (Date.now() - log.timestamp) < 60000 // Last minute
    );
    
    if (roleChanges.length > 5) {
      warnings.push('Cambios de rol frecuentes detectados');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create middleware function for API protection
   */
  static createProtectionMiddleware(operation: ProtectedOperation) {
    return async (
      context: RequestContext,
      requestData?: any
    ): Promise<{ allowed: boolean; result: ValidationResult }> => {
      const result = await this.validateRequest(context, operation, requestData);
      
      return {
        allowed: result.isValid,
        result
      };
    };
  }

  /**
   * Batch validate multiple operations
   */
  static async validateBatch(
    context: RequestContext,
    operations: Array<{ operation: ProtectedOperation; data?: any }>
  ): Promise<{
    allValid: boolean;
    results: Array<{ operation: string; result: ValidationResult }>;
  }> {
    const results: Array<{ operation: string; result: ValidationResult }> = [];
    let allValid = true;

    for (const { operation, data } of operations) {
      const result = await this.validateRequest(context, operation, data);
      results.push({ operation: operation.name, result });
      
      if (!result.isValid) {
        allValid = false;
      }
    }

    return { allValid, results };
  }

  /**
   * Get validation summary for debugging
   */
  static getValidationSummary(userId: string): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    commonErrors: string[];
    roleDistribution: Record<ProfileType, number>;
  } {
    const userLogs = this.accessLog.filter(log => log.userId === userId);
    
    const successful = userLogs.filter(log => log.success);
    const failed = userLogs.filter(log => !log.success);
    
    // Count role distribution
    const roleDistribution: Record<ProfileType, number> = {
      candidate: userLogs.filter(log => log.role === 'candidate').length,
      company: userLogs.filter(log => log.role === 'company').length
    };

    // Find common errors
    const errorCounts: Record<string, number> = {};
    failed.forEach(log => {
      log.errors?.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);

    return {
      totalRequests: userLogs.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      commonErrors,
      roleDistribution
    };
  }

  /**
   * Log access attempt
   */
  private static logAccess(
    context: RequestContext,
    operation: ProtectedOperation,
    success: boolean,
    errors?: string[]
  ): void {
    if (!operation.logAccess) return;

    this.accessLog.push({
      userId: context.userId,
      operation: operation.name,
      role: context.activeRole,
      timestamp: Date.now(),
      success,
      errors
    });

    // Keep log size manageable
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-5000);
    }
  }

  /**
   * Get recent activity for a user
   */
  private static getRecentActivity(userId: string): typeof this.accessLog {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.accessLog.filter(log => 
      log.userId === userId && log.timestamp > oneHourAgo
    );
  }

  /**
   * Extract resource name from operation name
   */
  private static extractResourceFromOperation(operationName: string): string {
    if (operationName.includes('job-application')) return 'job-application';
    if (operationName.includes('job-posting')) return 'job-posting';
    if (operationName.includes('profile')) return 'profile';
    if (operationName.includes('candidate')) return 'candidate';
    if (operationName.includes('company')) return 'company';
    return 'unknown';
  }

  /**
   * Clear access logs (for testing or privacy)
   */
  static clearLogs(userId?: string): void {
    if (userId) {
      this.accessLog = this.accessLog.filter(log => log.userId !== userId);
    } else {
      this.accessLog = [];
    }
  }

  /**
   * Export access logs for audit
   */
  static exportLogs(userId?: string): typeof this.accessLog {
    if (userId) {
      return this.accessLog.filter(log => log.userId === userId);
    }
    return [...this.accessLog];
  }
}