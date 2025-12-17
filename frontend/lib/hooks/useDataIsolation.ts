// frontend/lib/hooks/useDataIsolation.ts
import { useState, useCallback, useEffect } from 'react';
import { ProfileType } from '../types/unified-email.types';
import { DataIsolationService, ValidationResult } from '../services/dataIsolation.service';
import { ContextValidationMiddleware, RequestContext, ProtectedOperation } from '../middleware/contextValidation.middleware';

export interface UseDataIsolationReturn {
  validateOperation: (operation: string, data?: any) => ValidationResult;
  validateJobApplication: (applicationData: any) => ValidationResult;
  validateJobPosting: (postingData: any) => ValidationResult;
  validateProfileUpdate: (profileData: any) => ValidationResult;
  filterDisplayData: (data: any, audience?: 'self' | 'public' | 'restricted') => any;
  isOperationAllowed: (operation: string) => boolean;
  getAllowedOperations: () => string[];
  getValidationSummary: () => any;
  contextErrors: string[];
  contextWarnings: string[];
  clearErrors: () => void;
}

export function useDataIsolation(
  userId: string,
  activeRole: ProfileType,
  sessionId?: string
): UseDataIsolationReturn {
  const [contextErrors, setContextErrors] = useState<string[]>([]);
  const [contextWarnings, setContextWarnings] = useState<string[]>([]);

  // Create request context
  const requestContext: RequestContext = {
    userId,
    activeRole,
    sessionId,
    timestamp: Date.now()
  };

  const validateOperation = useCallback((operation: string, data?: any): ValidationResult => {
    try {
      const operationContext = {
        userId,
        activeRole,
        operation,
        targetResource: extractResourceFromOperation(operation),
        requestData: data
      };

      const result = DataIsolationService.validateOperation(operationContext);
      
      // Update context state
      setContextErrors(result.errors);
      setContextWarnings(result.warnings);
      
      return result;
    } catch (error) {
      const errorMessage = `Error validating operation: ${error}`;
      setContextErrors([errorMessage]);
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }, [userId, activeRole]);

  const validateJobApplication = useCallback((applicationData: any): ValidationResult => {
    const result = DataIsolationService.validateJobApplication(userId, activeRole, applicationData);
    setContextErrors(result.errors);
    setContextWarnings(result.warnings);
    return result;
  }, [userId, activeRole]);

  const validateJobPosting = useCallback((postingData: any): ValidationResult => {
    const result = DataIsolationService.validateJobPosting(userId, activeRole, postingData);
    setContextErrors(result.errors);
    setContextWarnings(result.warnings);
    return result;
  }, [userId, activeRole]);

  const validateProfileUpdate = useCallback((profileData: any): ValidationResult => {
    const result = DataIsolationService.validateProfileUpdate(userId, activeRole, profileData);
    setContextErrors(result.errors);
    setContextWarnings(result.warnings);
    return result;
  }, [userId, activeRole]);

  const filterDisplayData = useCallback((
    data: any, 
    audience: 'self' | 'public' | 'restricted' = 'self'
  ): any => {
    return DataIsolationService.filterDisplayData(data, activeRole, audience);
  }, [activeRole]);

  const isOperationAllowed = useCallback((operation: string): boolean => {
    return DataIsolationService.isOperationAllowed(operation, activeRole, 'any');
  }, [activeRole]);

  const getAllowedOperations = useCallback((): string[] => {
    return DataIsolationService.getAllowedOperations(activeRole);
  }, [activeRole]);

  const getValidationSummary = useCallback(() => {
    return ContextValidationMiddleware.getValidationSummary(userId);
  }, [userId]);

  const clearErrors = useCallback(() => {
    setContextErrors([]);
    setContextWarnings([]);
  }, []);

  // Clear errors when role changes
  useEffect(() => {
    clearErrors();
  }, [activeRole, clearErrors]);

  return {
    validateOperation,
    validateJobApplication,
    validateJobPosting,
    validateProfileUpdate,
    filterDisplayData,
    isOperationAllowed,
    getAllowedOperations,
    getValidationSummary,
    contextErrors,
    contextWarnings,
    clearErrors
  };
}

// Helper function to extract resource from operation name
function extractResourceFromOperation(operationName: string): string {
  if (operationName.includes('job-application')) return 'job-application';
  if (operationName.includes('job-posting')) return 'job-posting';
  if (operationName.includes('profile')) return 'profile';
  if (operationName.includes('candidate')) return 'candidate';
  if (operationName.includes('company')) return 'company';
  return 'unknown';
}

// Hook for protected operations with middleware validation
export function useProtectedOperation(
  userId: string,
  activeRole: ProfileType,
  sessionId?: string
) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);

  const executeProtectedOperation = useCallback(async (
    operation: ProtectedOperation,
    requestData?: any,
    onSuccess?: (result: any) => void,
    onError?: (errors: string[]) => void
  ) => {
    setIsLoading(true);
    
    try {
      const context: RequestContext = {
        userId,
        activeRole,
        sessionId,
        timestamp: Date.now()
      };

      const { allowed, result } = await ContextValidationMiddleware
        .createProtectionMiddleware(operation)(context, requestData);

      setLastResult(result);

      if (allowed) {
        onSuccess?.(result.sanitizedData || requestData);
      } else {
        onError?.(result.errors);
      }

      return { success: allowed, result };
    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [`Error executing protected operation: ${error}`],
        warnings: []
      };
      
      setLastResult(errorResult);
      onError?.(errorResult.errors);
      
      return { success: false, result: errorResult };
    } finally {
      setIsLoading(false);
    }
  }, [userId, activeRole, sessionId]);

  return {
    executeProtectedOperation,
    isLoading,
    lastResult
  };
}

// Hook for batch validation
export function useBatchValidation(
  userId: string,
  activeRole: ProfileType,
  sessionId?: string
) {
  const [isValidating, setIsValidating] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ operation: string; result: ValidationResult }>>([]);

  const validateBatch = useCallback(async (
    operations: Array<{ operation: ProtectedOperation; data?: any }>
  ) => {
    setIsValidating(true);
    
    try {
      const context: RequestContext = {
        userId,
        activeRole,
        sessionId,
        timestamp: Date.now()
      };

      const { allValid, results } = await ContextValidationMiddleware.validateBatch(context, operations);
      
      setBatchResults(results);
      
      return { allValid, results };
    } catch (error) {
      const errorResults = operations.map(({ operation }) => ({
        operation: operation.name,
        result: {
          isValid: false,
          errors: [`Batch validation error: ${error}`],
          warnings: []
        }
      }));
      
      setBatchResults(errorResults);
      
      return { allValid: false, results: errorResults };
    } finally {
      setIsValidating(false);
    }
  }, [userId, activeRole, sessionId]);

  return {
    validateBatch,
    isValidating,
    batchResults
  };
}