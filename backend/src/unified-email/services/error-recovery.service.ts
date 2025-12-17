// backend/src/unified-email/services/error-recovery.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { 
  UnifiedEmailException,
  ProfileNotFoundException,
  ProfileCreationFailedException,
  AuthenticationFailedException,
  SessionExpiredException,
  FirestoreConnectionException,
  isRetryableError,
  getUserFriendlyMessage
} from '../exceptions/unified-email.exceptions';
import { RetryUtil, RetryOptions } from '../utils/retry.util';
import { ProfileType } from '../interfaces';

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'redirect' | 'manual' | 'ignore';
  description: string;
  action?: () => Promise<any>;
  redirectUrl?: string;
  userMessage?: string;
  requiresUserInput?: boolean;
}

export interface RecoveryPlan {
  canRecover: boolean;
  actions: RecoveryAction[];
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedRecoveryTime?: number;
}

export interface ErrorContext {
  userId?: string;
  operation: string;
  profileType?: ProfileType;
  sessionId?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  additionalData?: Record<string, any>;
}

@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);
  
  // Track error patterns for intelligent recovery
  private errorPatterns = new Map<string, {
    count: number;
    lastOccurrence: Date;
    successfulRecoveries: number;
    failedRecoveries: number;
  }>();

  /**
   * Analyze error and create recovery plan
   */
  async createRecoveryPlan(error: any, context: ErrorContext): Promise<RecoveryPlan> {
    this.logger.debug(`Creating recovery plan for error: ${error.message}`);
    
    // Update error patterns
    this.updateErrorPatterns(error, context);

    // Determine recovery strategy based on error type
    if (error instanceof AuthenticationFailedException) {
      return this.createAuthRecoveryPlan(error, context);
    }

    if (error instanceof ProfileNotFoundException) {
      return this.createProfileNotFoundRecoveryPlan(error, context);
    }

    if (error instanceof ProfileCreationFailedException) {
      return this.createProfileCreationRecoveryPlan(error, context);
    }

    if (error instanceof SessionExpiredException) {
      return this.createSessionRecoveryPlan(error, context);
    }

    if (error instanceof FirestoreConnectionException) {
      return this.createNetworkRecoveryPlan(error, context);
    }

    if (isRetryableError(error)) {
      return this.createRetryRecoveryPlan(error, context);
    }

    // Default recovery plan for unknown errors
    return this.createDefaultRecoveryPlan(error, context);
  }

  /**
   * Execute recovery plan
   */
  async executeRecovery(
    recoveryPlan: RecoveryPlan,
    context: ErrorContext
  ): Promise<{
    success: boolean;
    result?: any;
    error?: any;
    executedActions: string[];
  }> {
    const executedActions: string[] = [];
    
    this.logger.debug(`Executing recovery plan with ${recoveryPlan.actions.length} actions`);

    for (const action of recoveryPlan.actions) {
      try {
        executedActions.push(action.type);
        
        switch (action.type) {
          case 'retry':
            if (action.action) {
              const result = await this.executeRetryAction(action.action, context);
              if (result.success) {
                this.recordSuccessfulRecovery(context);
                return { success: true, result: result.result, executedActions };
              }
            }
            break;

          case 'fallback':
            if (action.action) {
              const result = await action.action();
              this.recordSuccessfulRecovery(context);
              return { success: true, result, executedActions };
            }
            break;

          case 'redirect':
            // Return redirect instruction for client to handle
            return { 
              success: true, 
              result: { redirect: action.redirectUrl }, 
              executedActions 
            };

          case 'manual':
            // Return manual intervention required
            return { 
              success: false, 
              error: new Error('Manual intervention required'), 
              executedActions 
            };

          case 'ignore':
            // Log and continue
            this.logger.warn(`Ignoring error as per recovery plan: ${context.operation}`);
            return { success: true, result: null, executedActions };
        }
      } catch (recoveryError) {
        this.logger.error(`Recovery action ${action.type} failed: ${recoveryError.message}`);
        // Continue to next action
      }
    }

    this.recordFailedRecovery(context);
    return { 
      success: false, 
      error: new Error('All recovery actions failed'), 
      executedActions 
    };
  }

  /**
   * Create authentication recovery plan
   */
  private createAuthRecoveryPlan(error: AuthenticationFailedException, context: ErrorContext): RecoveryPlan {
    return {
      canRecover: true,
      actions: [
        {
          type: 'redirect',
          description: 'Redirect to login page',
          redirectUrl: '/auth/login',
          userMessage: 'Por favor, inicia sesión nuevamente.'
        }
      ],
      userMessage: error.userMessage,
      severity: 'medium'
    };
  }

  /**
   * Create profile not found recovery plan
   */
  private createProfileNotFoundRecoveryPlan(error: ProfileNotFoundException, context: ErrorContext): RecoveryPlan {
    const actions: RecoveryAction[] = [];

    // If we know the profile type, offer to create it
    if (context.profileType) {
      actions.push({
        type: 'redirect',
        description: `Redirect to create ${context.profileType} profile`,
        redirectUrl: `/profile/create/${context.profileType}`,
        userMessage: `Crear perfil de ${context.profileType}`
      });
    }

    // Fallback to profile selection
    actions.push({
      type: 'redirect',
      description: 'Redirect to profile selection',
      redirectUrl: '/profile/select',
      userMessage: 'Seleccionar tipo de perfil'
    });

    return {
      canRecover: true,
      actions,
      userMessage: error.userMessage,
      severity: 'medium'
    };
  }

  /**
   * Create profile creation recovery plan
   */
  private createProfileCreationRecoveryPlan(error: ProfileCreationFailedException, context: ErrorContext): RecoveryPlan {
    return {
      canRecover: true,
      actions: [
        {
          type: 'retry',
          description: 'Retry profile creation with exponential backoff',
          userMessage: 'Intentar nuevamente',
          action: async () => {
            // The actual retry will be handled by the calling service
            throw new Error('Retry action placeholder');
          }
        },
        {
          type: 'manual',
          description: 'Manual intervention required',
          userMessage: 'Si el problema persiste, contacta al soporte técnico.',
          requiresUserInput: true
        }
      ],
      userMessage: error.userMessage,
      severity: 'high',
      estimatedRecoveryTime: 30000 // 30 seconds
    };
  }

  /**
   * Create session recovery plan
   */
  private createSessionRecoveryPlan(error: SessionExpiredException, context: ErrorContext): RecoveryPlan {
    return {
      canRecover: true,
      actions: [
        {
          type: 'redirect',
          description: 'Redirect to login with return URL',
          redirectUrl: `/auth/login?returnTo=${encodeURIComponent(context.additionalData?.currentUrl || '/')}`,
          userMessage: 'Iniciar sesión nuevamente'
        }
      ],
      userMessage: error.userMessage,
      severity: 'medium'
    };
  }

  /**
   * Create network recovery plan
   */
  private createNetworkRecoveryPlan(error: FirestoreConnectionException, context: ErrorContext): RecoveryPlan {
    return {
      canRecover: true,
      actions: [
        {
          type: 'retry',
          description: 'Retry with exponential backoff',
          userMessage: 'Reintentando conexión...',
          action: async () => {
            // Placeholder for retry logic
            throw new Error('Network retry placeholder');
          }
        },
        {
          type: 'fallback',
          description: 'Use cached data if available',
          userMessage: 'Usando datos almacenados localmente',
          action: async () => {
            // Return cached data or simplified functionality
            return { cached: true, data: null };
          }
        }
      ],
      userMessage: error.userMessage,
      severity: 'high',
      estimatedRecoveryTime: 15000 // 15 seconds
    };
  }

  /**
   * Create retry recovery plan
   */
  private createRetryRecoveryPlan(error: any, context: ErrorContext): RecoveryPlan {
    const pattern = this.getErrorPattern(error, context);
    const maxRetries = pattern && pattern.failedRecoveries > 3 ? 1 : 3;

    return {
      canRecover: true,
      actions: [
        {
          type: 'retry',
          description: `Retry operation up to ${maxRetries} times`,
          userMessage: 'Reintentando operación...',
          action: async () => {
            throw new Error('Retry placeholder');
          }
        }
      ],
      userMessage: getUserFriendlyMessage(error),
      severity: 'medium',
      estimatedRecoveryTime: 10000 // 10 seconds
    };
  }

  /**
   * Create default recovery plan
   */
  private createDefaultRecoveryPlan(error: any, context: ErrorContext): RecoveryPlan {
    return {
      canRecover: false,
      actions: [
        {
          type: 'manual',
          description: 'Manual intervention required',
          userMessage: 'Contactar soporte técnico',
          requiresUserInput: true
        }
      ],
      userMessage: getUserFriendlyMessage(error),
      severity: 'critical'
    };
  }

  /**
   * Execute retry action with proper configuration
   */
  private async executeRetryAction(
    action: () => Promise<any>,
    context: ErrorContext
  ): Promise<{ success: boolean; result?: any; error?: any }> {
    const retryOptions: Partial<RetryOptions> = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      onRetry: (attempt, error) => {
        this.logger.debug(`Retry attempt ${attempt} for ${context.operation}: ${error.message}`);
      }
    };

    return await RetryUtil.executeWithRetry(action, retryOptions, context.operation);
  }

  /**
   * Update error patterns for intelligent recovery
   */
  private updateErrorPatterns(error: any, context: ErrorContext): void {
    const patternKey = this.getPatternKey(error, context);
    const existing = this.errorPatterns.get(patternKey);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
    } else {
      this.errorPatterns.set(patternKey, {
        count: 1,
        lastOccurrence: new Date(),
        successfulRecoveries: 0,
        failedRecoveries: 0
      });
    }
  }

  /**
   * Record successful recovery
   */
  private recordSuccessfulRecovery(context: ErrorContext): void {
    // This would be implemented based on the specific error pattern
    this.logger.debug(`Successful recovery for operation: ${context.operation}`);
  }

  /**
   * Record failed recovery
   */
  private recordFailedRecovery(context: ErrorContext): void {
    // This would be implemented based on the specific error pattern
    this.logger.warn(`Failed recovery for operation: ${context.operation}`);
  }

  /**
   * Get error pattern for analysis
   */
  private getErrorPattern(error: any, context: ErrorContext) {
    const patternKey = this.getPatternKey(error, context);
    return this.errorPatterns.get(patternKey);
  }

  /**
   * Generate pattern key for error tracking
   */
  private getPatternKey(error: any, context: ErrorContext): string {
    const errorType = error.constructor.name;
    const operation = context.operation;
    const profileType = context.profileType || 'unknown';
    
    return `${errorType}:${operation}:${profileType}`;
  }

  /**
   * Get recovery statistics for monitoring
   */
  getRecoveryStatistics(): {
    totalErrors: number;
    errorPatterns: Array<{
      pattern: string;
      count: number;
      lastOccurrence: Date;
      successRate: number;
    }>;
  } {
    const patterns = Array.from(this.errorPatterns.entries()).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      lastOccurrence: data.lastOccurrence,
      successRate: data.count > 0 ? data.successfulRecoveries / data.count : 0
    }));

    return {
      totalErrors: patterns.reduce((sum, p) => sum + p.count, 0),
      errorPatterns: patterns
    };
  }

  /**
   * Clear error patterns (for testing)
   */
  clearErrorPatterns(): void {
    this.errorPatterns.clear();
  }

  /**
   * Create recovery context from request information
   */
  static createErrorContext(
    operation: string,
    userId?: string,
    profileType?: ProfileType,
    additionalData?: Record<string, any>
  ): ErrorContext {
    return {
      userId,
      operation,
      profileType,
      timestamp: new Date(),
      additionalData
    };
  }
}