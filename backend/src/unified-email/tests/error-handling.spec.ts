// backend/src/unified-email/tests/error-handling.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { 
  AuthenticationFailedException,
  ProfileNotFoundException,
  ProfileCreationFailedException,
  FirestoreConnectionException,
  isRetryableError,
  getUserFriendlyMessage
} from '../exceptions/unified-email.exceptions';
import { RetryUtil } from '../utils/retry.util';
import { ErrorRecoveryService } from '../services/error-recovery.service';

describe('Error Handling System', () => {
  let errorRecoveryService: ErrorRecoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorRecoveryService],
    }).compile();

    errorRecoveryService = module.get<ErrorRecoveryService>(ErrorRecoveryService);
  });

  afterEach(() => {
    RetryUtil.clearCircuitBreakers();
    errorRecoveryService.clearErrorPatterns();
  });

  describe('Exception Classes', () => {
    it('should create authentication exception with correct properties', () => {
      const exception = new AuthenticationFailedException('Test auth failure');
      
      expect(exception.errorCode).toBe('AUTH_FAILED');
      expect(exception.retryable).toBe(false);
      expect(exception.userMessage).toContain('Credenciales inválidas');
      expect(exception.getStatus()).toBe(401);
    });

    it('should create profile not found exception with correct properties', () => {
      const exception = new ProfileNotFoundException('candidate', 'user123');
      
      expect(exception.errorCode).toBe('PROFILE_NOT_FOUND');
      expect(exception.retryable).toBe(false);
      expect(exception.userMessage).toContain('candidato');
    });

    it('should create retryable profile creation exception', () => {
      const originalError = new Error('Network timeout');
      const exception = new ProfileCreationFailedException('candidate', originalError);
      
      expect(exception.errorCode).toBe('PROFILE_CREATION_FAILED');
      expect(exception.retryable).toBe(true);
      expect(exception.message).toContain('Network timeout');
    });

    it('should create retryable Firestore connection exception', () => {
      const exception = new FirestoreConnectionException('profile creation');
      
      expect(exception.errorCode).toBe('FIRESTORE_CONNECTION_ERROR');
      expect(exception.retryable).toBe(true);
      expect(exception.userMessage).toContain('base de datos');
    });
  });

  describe('Error Classification Utilities', () => {
    it('should correctly identify retryable errors', () => {
      const retryableError = new ProfileCreationFailedException('candidate');
      const nonRetryableError = new AuthenticationFailedException();
      
      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should identify retryable errors by message patterns', () => {
      const timeoutError = new Error('Connection timeout');
      const networkError = new Error('Network unavailable');
      const validationError = new Error('Invalid input data');
      
      expect(isRetryableError(timeoutError)).toBe(true);
      expect(isRetryableError(networkError)).toBe(true);
      expect(isRetryableError(validationError)).toBe(false);
    });

    it('should provide user-friendly messages', () => {
      const authError = new AuthenticationFailedException();
      const networkError = new Error('Connection timeout');
      const unknownError = new Error('Something went wrong');
      
      expect(getUserFriendlyMessage(authError)).toContain('Credenciales inválidas');
      expect(getUserFriendlyMessage(networkError)).toContain('tardó demasiado tiempo');
      expect(getUserFriendlyMessage(unknownError)).toContain('error inesperado');
    });
  });

  describe('RetryUtil', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryUtil.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 100
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue('success');
      
      const result = await RetryUtil.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 10,
        retryCondition: (error) => /timeout|connection/i.test(error.message)
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new AuthenticationFailedException());
      
      const result = await RetryUtil.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 10
      });
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum attempts', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Network timeout'));
      
      const result = await RetryUtil.executeWithRetry(mockOperation, {
        maxAttempts: 2,
        baseDelay: 10,
        retryCondition: () => true
      });
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should calculate exponential backoff delay', async () => {
      const delays: number[] = [];
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network timeout'));
      
      const startTime = Date.now();
      await RetryUtil.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitter: false,
        retryCondition: () => true,
        onRetry: (attempt) => {
          if (attempt > 1) {
            delays.push(Date.now() - startTime);
          }
        }
      });
      
      // Should have delays approximately: 100ms, 200ms
      expect(delays).toHaveLength(2);
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[1]).toBeGreaterThanOrEqual(290);
    });

    it('should execute fallback operations', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = jest.fn().mockResolvedValue('fallback success');
      
      const result = await RetryUtil.executeWithFallback([
        primaryOperation,
        fallbackOperation
      ], { maxAttempts: 2, baseDelay: 10 });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback success');
      expect(primaryOperation).toHaveBeenCalled();
      expect(fallbackOperation).toHaveBeenCalled();
    });

    it('should implement circuit breaker pattern', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Trigger circuit breaker by failing multiple times
      for (let i = 0; i < 5; i++) {
        await RetryUtil.executeWithCircuitBreaker(
          mockOperation,
          'test-service',
          { maxAttempts: 1, baseDelay: 10 }
        );
      }
      
      // Circuit should be open now
      const result = await RetryUtil.executeWithCircuitBreaker(
        mockOperation,
        'test-service',
        { maxAttempts: 1, baseDelay: 10 }
      );
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Circuit breaker is open');
      expect(result.attempts).toBe(0);
    });
  });

  describe('ErrorRecoveryService', () => {
    it('should create auth recovery plan', async () => {
      const error = new AuthenticationFailedException();
      const context = ErrorRecoveryService.createErrorContext('login', 'user123');
      
      const plan = await errorRecoveryService.createRecoveryPlan(error, context);
      
      expect(plan.canRecover).toBe(true);
      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0].type).toBe('redirect');
      expect(plan.actions[0].redirectUrl).toContain('/auth/login');
      expect(plan.severity).toBe('medium');
    });

    it('should create profile not found recovery plan', async () => {
      const error = new ProfileNotFoundException('candidate');
      const context = ErrorRecoveryService.createErrorContext('getProfile', 'user123', 'candidate');
      
      const plan = await errorRecoveryService.createRecoveryPlan(error, context);
      
      expect(plan.canRecover).toBe(true);
      expect(plan.actions.length).toBeGreaterThan(0);
      expect(plan.actions.some(a => a.type === 'redirect')).toBe(true);
    });

    it('should create retry recovery plan for retryable errors', async () => {
      const error = new ProfileCreationFailedException('candidate');
      const context = ErrorRecoveryService.createErrorContext('createProfile', 'user123', 'candidate');
      
      const plan = await errorRecoveryService.createRecoveryPlan(error, context);
      
      expect(plan.canRecover).toBe(true);
      expect(plan.actions.some(a => a.type === 'retry')).toBe(true);
      expect(plan.severity).toBe('high');
      expect(plan.estimatedRecoveryTime).toBeDefined();
    });

    it('should create network recovery plan', async () => {
      const error = new FirestoreConnectionException('profile update');
      const context = ErrorRecoveryService.createErrorContext('updateProfile', 'user123');
      
      const plan = await errorRecoveryService.createRecoveryPlan(error, context);
      
      expect(plan.canRecover).toBe(true);
      expect(plan.actions.some(a => a.type === 'retry')).toBe(true);
      expect(plan.actions.some(a => a.type === 'fallback')).toBe(true);
      expect(plan.severity).toBe('high');
    });

    it('should create default recovery plan for unknown errors', async () => {
      const error = new Error('Unknown system error');
      const context = ErrorRecoveryService.createErrorContext('unknownOperation', 'user123');
      
      const plan = await errorRecoveryService.createRecoveryPlan(error, context);
      
      expect(plan.canRecover).toBe(false);
      expect(plan.actions.some(a => a.type === 'manual')).toBe(true);
      expect(plan.severity).toBe('critical');
    });

    it('should execute recovery actions', async () => {
      const mockRetryAction = jest.fn().mockResolvedValue('retry success');
      const error = new ProfileCreationFailedException('candidate');
      const context = ErrorRecoveryService.createErrorContext('createProfile', 'user123', 'candidate');
      
      const plan = await errorRecoveryService.createRecoveryPlan(error, context);
      const retryAction = plan.actions.find(a => a.type === 'retry')!;
      retryAction.action = mockRetryAction;
      
      const result = await errorRecoveryService.executeRecovery(plan, context);
      
      expect(result.success).toBe(true);
      expect(result.executedActions).toContain('retry');
      expect(mockRetryAction).toHaveBeenCalled();
    });

    it('should track error patterns', async () => {
      const error1 = new ProfileCreationFailedException('candidate');
      const error2 = new ProfileCreationFailedException('candidate');
      const context = ErrorRecoveryService.createErrorContext('createProfile', 'user123', 'candidate');
      
      await errorRecoveryService.createRecoveryPlan(error1, context);
      await errorRecoveryService.createRecoveryPlan(error2, context);
      
      const stats = errorRecoveryService.getRecoveryStatistics();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorPatterns.length).toBeGreaterThan(0);
      expect(stats.errorPatterns[0].count).toBe(2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error recovery flow', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new ProfileCreationFailedException('candidate');
        }
        return Promise.resolve('success');
      });

      const result = await RetryUtil.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 10
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(attemptCount).toBe(3);
    });

    it('should handle error recovery with fallback', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new FirestoreConnectionException('write'));
      const fallbackOperation = jest.fn().mockResolvedValue({ cached: true });

      const result = await RetryUtil.executeWithFallback([
        primaryOperation,
        fallbackOperation
      ], { maxAttempts: 2, baseDelay: 10 });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ cached: true });
    });

    it('should provide comprehensive error information', () => {
      const error = new ProfileCreationFailedException('candidate', new Error('Network timeout'));
      const json = error.toJSON();

      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('errorCode', 'PROFILE_CREATION_FAILED');
      expect(json).toHaveProperty('retryable', true);
      expect(json).toHaveProperty('userMessage');
      expect(json).toHaveProperty('statusCode', 500);
      expect(json).toHaveProperty('timestamp');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: unified-email-system, Property 21: Error handling resilience
     * For any error that occurs during unified email operations, the system should provide appropriate error handling, user-friendly messages, and recovery mechanisms
     */
    it('should handle any error with appropriate recovery mechanisms', async () => {
      const errorTypes = [
        () => new AuthenticationFailedException(),
        () => new ProfileNotFoundException('candidate'),
        () => new ProfileCreationFailedException('company'),
        () => new FirestoreConnectionException('operation'),
        () => new Error('Generic error'),
        () => new BadRequestException('Validation failed'),
        () => new ConflictException('Resource conflict'),
        () => new UnauthorizedException('Access denied')
      ];

      for (const createError of errorTypes) {
        const error = createError();
        const context = ErrorRecoveryService.createErrorContext('testOperation', 'user123');
        
        // Should always create a recovery plan
        const plan = await errorRecoveryService.createRecoveryPlan(error, context);
        expect(plan).toBeDefined();
        expect(plan.actions.length).toBeGreaterThan(0);
        expect(plan.userMessage).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(plan.severity);
        
        // Should provide user-friendly message
        const userMessage = getUserFriendlyMessage(error);
        expect(userMessage).toBeTruthy();
        expect(userMessage.length).toBeGreaterThan(10);
        
        // Should correctly identify retryability
        const retryable = isRetryableError(error);
        expect(typeof retryable).toBe('boolean');
      }
    });

    /**
     * Feature: unified-email-system, Property 22: Retry mechanism effectiveness
     * For any retryable operation, the retry mechanism should eventually succeed or exhaust all attempts with proper backoff
     */
    it('should handle retry scenarios effectively', async () => {
      const scenarios = [
        { failCount: 0, maxAttempts: 3, shouldSucceed: true },
        { failCount: 1, maxAttempts: 3, shouldSucceed: true },
        { failCount: 2, maxAttempts: 3, shouldSucceed: true },
        { failCount: 3, maxAttempts: 3, shouldSucceed: false },
        { failCount: 5, maxAttempts: 2, shouldSucceed: false }
      ];

      for (const scenario of scenarios) {
        let attemptCount = 0;
        const mockOperation = jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount <= scenario.failCount) {
            throw new Error('Retryable error');
          }
          return Promise.resolve('success');
        });

        const result = await RetryUtil.executeWithRetry(mockOperation, {
          maxAttempts: scenario.maxAttempts,
          baseDelay: 1,
          retryCondition: () => true
        });

        expect(result.success).toBe(scenario.shouldSucceed);
        expect(result.attempts).toBeLessThanOrEqual(scenario.maxAttempts);
        
        if (scenario.shouldSucceed) {
          expect(result.result).toBe('success');
        } else {
          expect(result.error).toBeDefined();
        }
      }
    });
  });
});