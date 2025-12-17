// frontend/lib/services/dataIsolation.service.ts
import { ProfileType, CandidateProfile, CompanyProfile } from '../types/unified-email.types';

export interface OperationContext {
  userId: string;
  activeRole: ProfileType;
  operation: string;
  targetResource: string;
  requestData?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

export interface DataAccessPolicy {
  allowedRoles: ProfileType[];
  requiredFields: string[];
  forbiddenFields: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'forbidden' | 'role-specific' | 'format' | 'cross-reference';
  condition?: (context: OperationContext, value: any) => boolean;
  message: string;
}

export class DataIsolationService {
  private static readonly ACCESS_POLICIES: Record<string, DataAccessPolicy> = {
    // Job Application Operations
    'job-application-create': {
      allowedRoles: ['candidate'],
      requiredFields: ['candidateId', 'jobId', 'personalInfo', 'professionalInfo'],
      forbiddenFields: ['companyInfo', 'jobPostings', 'companyId'],
      validationRules: [
        {
          field: 'candidateId',
          rule: 'required',
          message: 'ID de candidato es requerido para aplicar a empleos'
        },
        {
          field: 'companyInfo',
          rule: 'forbidden',
          message: 'Información de empresa no debe incluirse en aplicaciones de empleo'
        },
        {
          field: 'personalInfo',
          rule: 'role-specific',
          condition: (context) => context.activeRole === 'candidate',
          message: 'Información personal solo disponible en contexto de candidato'
        }
      ]
    },

    'job-application-update': {
      allowedRoles: ['candidate'],
      requiredFields: ['applicationId', 'candidateId'],
      forbiddenFields: ['companyInfo', 'jobPostings', 'employerData'],
      validationRules: [
        {
          field: 'applicationId',
          rule: 'required',
          message: 'ID de aplicación es requerido'
        },
        {
          field: 'employerData',
          rule: 'forbidden',
          message: 'Datos de empleador no permitidos en actualizaciones de aplicación'
        }
      ]
    },

    'job-application-view': {
      allowedRoles: ['candidate'],
      requiredFields: ['candidateId'],
      forbiddenFields: ['companyPrivateData', 'internalNotes'],
      validationRules: [
        {
          field: 'candidateId',
          rule: 'cross-reference',
          condition: (context, value) => value === context.userId,
          message: 'Solo puedes ver tus propias aplicaciones'
        }
      ]
    },

    // Job Posting Operations
    'job-posting-create': {
      allowedRoles: ['company'],
      requiredFields: ['companyId', 'companyInfo', 'jobDetails'],
      forbiddenFields: ['personalInfo', 'candidateApplications', 'candidateId'],
      validationRules: [
        {
          field: 'companyId',
          rule: 'required',
          message: 'ID de empresa es requerido para publicar empleos'
        },
        {
          field: 'personalInfo',
          rule: 'forbidden',
          message: 'Información personal de candidato no debe incluirse en publicaciones de empleo'
        },
        {
          field: 'companyInfo',
          rule: 'role-specific',
          condition: (context) => context.activeRole === 'company',
          message: 'Información de empresa solo disponible en contexto de empresa'
        }
      ]
    },

    'job-posting-update': {
      allowedRoles: ['company'],
      requiredFields: ['jobId', 'companyId'],
      forbiddenFields: ['candidateData', 'applicantPersonalInfo'],
      validationRules: [
        {
          field: 'companyId',
          rule: 'cross-reference',
          condition: (context, value) => value === context.userId,
          message: 'Solo puedes editar empleos de tu empresa'
        },
        {
          field: 'candidateData',
          rule: 'forbidden',
          message: 'Datos de candidatos no permitidos en actualizaciones de empleo'
        }
      ]
    },

    'job-posting-view': {
      allowedRoles: ['company'],
      requiredFields: ['companyId'],
      forbiddenFields: ['candidatePrivateData'],
      validationRules: [
        {
          field: 'companyId',
          rule: 'cross-reference',
          condition: (context, value) => value === context.userId,
          message: 'Solo puedes ver empleos de tu empresa'
        }
      ]
    },

    // Candidate Management Operations
    'candidate-review': {
      allowedRoles: ['company'],
      requiredFields: ['companyId', 'applicationId'],
      forbiddenFields: ['candidatePersonalContacts', 'candidatePrivateNotes'],
      validationRules: [
        {
          field: 'companyId',
          rule: 'required',
          message: 'ID de empresa requerido para revisar candidatos'
        },
        {
          field: 'candidatePersonalContacts',
          rule: 'forbidden',
          message: 'Contactos personales de candidatos están protegidos'
        }
      ]
    },

    // Profile Management Operations
    'profile-update-candidate': {
      allowedRoles: ['candidate'],
      requiredFields: ['userId'],
      forbiddenFields: ['companyInfo', 'jobPostings'],
      validationRules: [
        {
          field: 'userId',
          rule: 'cross-reference',
          condition: (context, value) => value === context.userId,
          message: 'Solo puedes actualizar tu propio perfil'
        },
        {
          field: 'companyInfo',
          rule: 'forbidden',
          message: 'Información de empresa no permitida en perfil de candidato'
        }
      ]
    },

    'profile-update-company': {
      allowedRoles: ['company'],
      requiredFields: ['userId'],
      forbiddenFields: ['personalInfo', 'applications'],
      validationRules: [
        {
          field: 'userId',
          rule: 'cross-reference',
          condition: (context, value) => value === context.userId,
          message: 'Solo puedes actualizar tu propio perfil'
        },
        {
          field: 'personalInfo',
          rule: 'forbidden',
          message: 'Información personal no permitida en perfil de empresa'
        }
      ]
    }
  };

  /**
   * Validate operation context and data access
   */
  static validateOperation(context: OperationContext): ValidationResult {
    const policy = this.ACCESS_POLICIES[context.operation];
    
    if (!policy) {
      return {
        isValid: false,
        errors: [`Operación no reconocida: ${context.operation}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check role authorization
    if (!policy.allowedRoles.includes(context.activeRole)) {
      errors.push(
        `Operación '${context.operation}' no permitida para rol '${context.activeRole}'. ` +
        `Roles permitidos: ${policy.allowedRoles.join(', ')}`
      );
    }

    // Validate request data if provided
    if (context.requestData) {
      const dataValidation = this.validateRequestData(context, policy);
      errors.push(...dataValidation.errors);
      warnings.push(...dataValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: context.requestData ? this.sanitizeData(context, policy) : undefined
    };
  }

  /**
   * Validate request data against policy rules
   */
  private static validateRequestData(
    context: OperationContext, 
    policy: DataAccessPolicy
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data = context.requestData;

    // Check required fields
    for (const field of policy.requiredFields) {
      if (!this.hasField(data, field)) {
        errors.push(`Campo requerido faltante: ${field}`);
      }
    }

    // Check forbidden fields
    for (const field of policy.forbiddenFields) {
      if (this.hasField(data, field)) {
        errors.push(`Campo prohibido presente: ${field}`);
      }
    }

    // Apply validation rules
    for (const rule of policy.validationRules) {
      const fieldValue = this.getFieldValue(data, rule.field);
      const ruleResult = this.applyValidationRule(context, rule, fieldValue);
      
      if (!ruleResult.isValid) {
        if (ruleResult.severity === 'error') {
          errors.push(rule.message);
        } else {
          warnings.push(rule.message);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Apply individual validation rule
   */
  private static applyValidationRule(
    context: OperationContext,
    rule: ValidationRule,
    fieldValue: any
  ): { isValid: boolean; severity: 'error' | 'warning' } {
    switch (rule.rule) {
      case 'required':
        return {
          isValid: fieldValue !== undefined && fieldValue !== null && fieldValue !== '',
          severity: 'error'
        };

      case 'forbidden':
        return {
          isValid: fieldValue === undefined || fieldValue === null,
          severity: 'error'
        };

      case 'role-specific':
        return {
          isValid: !rule.condition || rule.condition(context, fieldValue),
          severity: 'error'
        };

      case 'cross-reference':
        return {
          isValid: !rule.condition || rule.condition(context, fieldValue),
          severity: 'error'
        };

      case 'format':
        return {
          isValid: !rule.condition || rule.condition(context, fieldValue),
          severity: 'warning'
        };

      default:
        return { isValid: true, severity: 'warning' };
    }
  }

  /**
   * Sanitize data by removing forbidden fields
   */
  private static sanitizeData(context: OperationContext, policy: DataAccessPolicy): any {
    if (!context.requestData) return null;

    const sanitized = { ...context.requestData };

    // Remove forbidden fields
    for (const field of policy.forbiddenFields) {
      this.removeField(sanitized, field);
    }

    return sanitized;
  }

  /**
   * Check if object has a field (supports nested paths)
   */
  private static hasField(obj: any, fieldPath: string): boolean {
    if (!obj) return false;
    
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current[part] === undefined) return false;
      current = current[part];
    }
    
    return true;
  }

  /**
   * Get field value (supports nested paths)
   */
  private static getFieldValue(obj: any, fieldPath: string): any {
    if (!obj) return undefined;
    
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current[part] === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  }

  /**
   * Remove field from object (supports nested paths)
   */
  private static removeField(obj: any, fieldPath: string): void {
    if (!obj) return;
    
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) return;
      current = current[parts[i]];
    }
    
    delete current[parts[parts.length - 1]];
  }

  /**
   * Validate job application data for candidate context
   */
  static validateJobApplication(
    userId: string,
    activeRole: ProfileType,
    applicationData: any
  ): ValidationResult {
    const context: OperationContext = {
      userId,
      activeRole,
      operation: 'job-application-create',
      targetResource: 'job-application',
      requestData: applicationData
    };

    return this.validateOperation(context);
  }

  /**
   * Validate job posting data for company context
   */
  static validateJobPosting(
    userId: string,
    activeRole: ProfileType,
    postingData: any
  ): ValidationResult {
    const context: OperationContext = {
      userId,
      activeRole,
      operation: 'job-posting-create',
      targetResource: 'job-posting',
      requestData: postingData
    };

    return this.validateOperation(context);
  }

  /**
   * Validate profile update data
   */
  static validateProfileUpdate(
    userId: string,
    activeRole: ProfileType,
    profileData: any
  ): ValidationResult {
    const operation = `profile-update-${activeRole}`;
    
    const context: OperationContext = {
      userId,
      activeRole,
      operation,
      targetResource: 'profile',
      requestData: profileData
    };

    return this.validateOperation(context);
  }

  /**
   * Filter data for display based on current role context
   */
  static filterDisplayData(
    data: any,
    activeRole: ProfileType,
    targetAudience: 'self' | 'public' | 'restricted' = 'self'
  ): any {
    if (!data) return data;

    const filtered = { ...data };

    // Remove role-inappropriate data
    if (activeRole === 'candidate') {
      // Remove company-specific data when in candidate mode
      delete filtered.companyInfo;
      delete filtered.jobPostings;
      delete filtered.employeeCount;
      delete filtered.companyAnalytics;
    } else if (activeRole === 'company') {
      // Remove candidate-specific data when in company mode
      delete filtered.personalInfo;
      delete filtered.applications;
      delete filtered.candidatePreferences;
      delete filtered.skillAssessments;
    }

    // Apply audience-based filtering
    if (targetAudience === 'public') {
      // Remove private information for public display
      delete filtered.email;
      delete filtered.phone;
      delete filtered.address;
      delete filtered.privateNotes;
    } else if (targetAudience === 'restricted') {
      // Remove sensitive information for restricted access
      delete filtered.personalContacts;
      delete filtered.salaryExpectations;
      delete filtered.internalNotes;
    }

    return filtered;
  }

  /**
   * Check if operation is allowed for current role and context
   */
  static isOperationAllowed(
    operation: string,
    activeRole: ProfileType,
    targetResource: string
  ): boolean {
    const policy = this.ACCESS_POLICIES[operation];
    
    if (!policy) {
      return false;
    }

    return policy.allowedRoles.includes(activeRole);
  }

  /**
   * Get allowed operations for current role
   */
  static getAllowedOperations(activeRole: ProfileType): string[] {
    return Object.keys(this.ACCESS_POLICIES).filter(operation => {
      const policy = this.ACCESS_POLICIES[operation];
      return policy.allowedRoles.includes(activeRole);
    });
  }

  /**
   * Validate cross-profile data access attempt
   */
  static validateCrossProfileAccess(
    requestingRole: ProfileType,
    targetProfileType: ProfileType,
    operation: string
  ): ValidationResult {
    const errors: string[] = [];

    // Prevent cross-profile data access
    if (requestingRole !== targetProfileType) {
      errors.push(
        `Acceso cruzado de perfiles no permitido: rol '${requestingRole}' ` +
        `intentando acceder a datos de '${targetProfileType}'`
      );
    }

    // Check for specific cross-profile operations that should be blocked
    const blockedCrossOperations = [
      'candidate-accessing-company-data',
      'company-accessing-candidate-personal-data',
      'role-impersonation'
    ];

    if (blockedCrossOperations.includes(operation)) {
      errors.push(`Operación de acceso cruzado bloqueada: ${operation}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}