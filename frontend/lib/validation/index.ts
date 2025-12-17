// Validation utilities index
import { EmailValidator } from './emailValidator';
import { PasswordValidator } from './passwordValidator';

export { EmailValidator } from './emailValidator';
export type { EmailValidationResult } from './emailValidator';

export { PasswordValidator } from './passwordValidator';
export type { 
  PasswordValidationResult, 
  PasswordRequirement 
} from './passwordValidator';

// Combined validation function for forms
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class FormValidator {
  static validateRegistrationForm(data: {
    name: string;
    email: string;
    password: string;
  }): FormValidationResult {
    const errors: Record<string, string> = {};

    // Handle null/undefined inputs
    const safeName = data?.name || '';
    const safeEmail = data?.email || '';
    const safePassword = data?.password || '';

    // Name validation
    if (!safeName || safeName.trim().length === 0) {
      errors.name = 'El nombre es requerido';
    } else if (safeName.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (safeName.trim().length > 100) {
      errors.name = 'El nombre es demasiado largo';
    }

    // Email validation
    const emailResult = EmailValidator.validateFormat(safeEmail);
    if (!emailResult.isValid) {
      errors.email = emailResult.error || 'Email inválido';
    }

    // Password validation
    if (!safePassword || safePassword.length === 0) {
      errors.password = 'La contraseña es requerida';
    } else {
      const passwordResult = PasswordValidator.validateStrength(safePassword);
      if (!passwordResult.isValid) {
        errors.password = passwordResult.missingRequirements.join(', ');
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  static validateLoginForm(data: {
    email: string;
    password: string;
  }): FormValidationResult {
    const errors: Record<string, string> = {};

    // Handle null/undefined inputs
    const safeEmail = data?.email || '';
    const safePassword = data?.password || '';

    // Email validation (basic for login)
    if (!safeEmail || safeEmail.trim().length === 0) {
      errors.email = 'El correo electrónico es requerido';
    } else {
      const emailResult = EmailValidator.validateFormat(safeEmail);
      if (!emailResult.isValid) {
        errors.email = 'Formato de correo electrónico inválido';
      }
    }

    // Password validation (basic for login)
    if (!safePassword || safePassword.length === 0) {
      errors.password = 'La contraseña es requerida';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
// Profile validation exports
export { ProfileValidation } from './profileValidation';
export type { ValidationResult } from './profileValidation';