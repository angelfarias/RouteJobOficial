// backend/src/unified-email/utils/retry.util.ts
import { Logger } from '@nestjs/common';
import { isRetryableError } from '../exceptions/unified-email.exceptions';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalDuration: number;
}

export class RetryUtil {
  private static readonly logger = new Logger(RetryUtil.name);

  /**
   * Default retry options for different operation types
   */
  static readonly DEFAULT_OPTIONS: Record<string, RetryOptions> = {
    firestore: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: isRetryableError
    },
    firebase_auth: {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: isRetryableError
    },
    profile_operations: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 1.5,
      jitter: true,
      retryCondition: isRetryableError
    },
    network: {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        const message = error?.message || '';
        return /timeout|network|connection|unavailable/i.test(message);
      }
    }
  };

  /**
   * Execute a function with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    operationType: string = 'unknown'
  ): Promise<RetryResult<T>> {
    const config: RetryOptions = {
      ...this.DEFAULT_OPTIONS.firestore,
      ...options
    };

    const startTime = Date.now();
    let lastError: any;
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      attempt++;
      
      try {
        this.logger.debug(`Executing ${operationType}, attempt ${attempt}/${config.maxAttempts}`);
        
        const result = await operation();
        
        const duration = Date.now() - startTime;
        this.logger.debug(`${operationType} succeeded on attempt ${attempt} after ${duration}ms`);
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration
        };
      } catch (error) {
        lastError = error;
        
        this.logger.warn(
          `${operationType} failed on attempt ${attempt}/${config.maxAttempts}: ${error.message}`
        );

        // Check if we should retry
        const shouldRetry = attempt < config.maxAttempts && 
                           (config.retryCondition ? config.retryCondition(error) : isRetryableError(error));

        if (!shouldRetry) {
          this.logger.error(`${operationType} failed permanently after ${attempt} attempts: ${error.message}`);
          break;
        }

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }

        // Calculate delay for next attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          this.logger.debug(`Retrying ${operationType} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.error(`${operationType} failed after ${attempt} attempts and ${totalDuration}ms`);

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDuration
    };
  }

  /**
   * Execute multiple operations with retry, stopping on first success
   */
  static async executeWithFallback<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {},
    operationType: string = 'fallback'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: any;
    let totalAttempts = 0;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const operationName = `${operationType}_fallback_${i + 1}`;
      
      this.logger.debug(`Trying fallback operation ${i + 1}/${operations.length}`);
      
      const result = await this.executeWithRetry(operation, options, operationName);
      totalAttempts += result.attempts;
      
      if (result.success) {
        return {
          success: true,
          result: result.result,
          attempts: totalAttempts,
          totalDuration: Date.now() - startTime
        };
      }
      
      lastError = result.error;
    }

    return {
      success: false,
      error: lastError,
      attempts: totalAttempts,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * Execute operation with circuit breaker pattern
   */
  static async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    options: Partial<RetryOptions> = {},
    operationType: string = 'circuit_breaker'
  ): Promise<RetryResult<T>> {
    const circuitState = this.getCircuitState(circuitBreakerKey);
    
    // Check if circuit is open
    if (circuitState.isOpen && Date.now() - circuitState.lastFailure < circuitState.timeout) {
      this.logger.warn(`Circuit breaker is open for ${circuitBreakerKey}, rejecting request`);
      return {
        success: false,
        error: new Error(`Circuit breaker is open for ${circuitBreakerKey}`),
        attempts: 0,
        totalDuration: 0
      };
    }

    const result = await this.executeWithRetry(operation, options, operationType);
    
    // Update circuit breaker state
    if (result.success) {
      this.resetCircuitBreaker(circuitBreakerKey);
    } else {
      this.recordCircuitFailure(circuitBreakerKey);
    }

    return result;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, options.maxDelay);
    
    // Apply jitter to prevent thundering herd
    if (options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Circuit breaker state management
   */
  private static circuitStates = new Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
    timeout: number;
  }>();

  private static getCircuitState(key: string) {
    if (!this.circuitStates.has(key)) {
      this.circuitStates.set(key, {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        timeout: 60000 // 1 minute default timeout
      });
    }
    return this.circuitStates.get(key)!;
  }

  private static recordCircuitFailure(key: string) {
    const state = this.getCircuitState(key);
    state.failures++;
    state.lastFailure = Date.now();
    
    // Open circuit after 5 failures
    if (state.failures >= 5) {
      state.isOpen = true;
      this.logger.warn(`Circuit breaker opened for ${key} after ${state.failures} failures`);
    }
  }

  private static resetCircuitBreaker(key: string) {
    const state = this.getCircuitState(key);
    state.failures = 0;
    state.isOpen = false;
    this.logger.debug(`Circuit breaker reset for ${key}`);
  }

  /**
   * Batch retry operations with different strategies
   */
  static async executeBatchWithRetry<T>(
    operations: Array<{
      operation: () => Promise<T>;
      key: string;
      options?: Partial<RetryOptions>;
    }>,
    strategy: 'fail_fast' | 'best_effort' | 'all_or_nothing' = 'best_effort'
  ): Promise<{
    results: Array<{ key: string; result: RetryResult<T> }>;
    overallSuccess: boolean;
  }> {
    const results: Array<{ key: string; result: RetryResult<T> }> = [];
    let overallSuccess = true;

    for (const { operation, key, options } of operations) {
      const result = await this.executeWithRetry(operation, options, key);
      results.push({ key, result });

      if (!result.success) {
        overallSuccess = false;
        
        if (strategy === 'fail_fast') {
          this.logger.warn(`Batch operation failed fast at ${key}`);
          break;
        }
      }
    }

    // For all_or_nothing strategy, if any failed, mark all as failed
    if (strategy === 'all_or_nothing' && !overallSuccess) {
      this.logger.warn('Batch operation failed - all or nothing strategy');
      // In a real implementation, you might want to rollback successful operations
    }

    return { results, overallSuccess };
  }

  /**
   * Create a retry decorator for methods
   */
  static createRetryDecorator(
    options: Partial<RetryOptions> = {},
    operationType: string = 'decorated_method'
  ) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const result = await RetryUtil.executeWithRetry(
          () => method.apply(this, args),
          options,
          `${target.constructor.name}.${propertyName}`
        );

        if (result.success) {
          return result.result;
        } else {
          throw result.error;
        }
      };
    };
  }

  /**
   * Get retry statistics for monitoring
   */
  static getRetryStatistics(): {
    circuitBreakers: Array<{
      key: string;
      failures: number;
      isOpen: boolean;
      lastFailure: Date | null;
    }>;
  } {
    const circuitBreakers = Array.from(this.circuitStates.entries()).map(([key, state]) => ({
      key,
      failures: state.failures,
      isOpen: state.isOpen,
      lastFailure: state.lastFailure > 0 ? new Date(state.lastFailure) : null
    }));

    return { circuitBreakers };
  }

  /**
   * Clear all circuit breaker states (for testing)
   */
  static clearCircuitBreakers(): void {
    this.circuitStates.clear();
  }
}

/**
 * Retry decorator for class methods
 */
export function Retry(
  options: Partial<RetryOptions> = {},
  operationType?: string
) {
  return RetryUtil.createRetryDecorator(options, operationType);
}