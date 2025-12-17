// Enhanced email validation utility
export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export class EmailValidator {
  // RFC 5322 compliant email regex (simplified but robust)
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  static validateFormat(email: string): EmailValidationResult {
    if (!email || email.trim().length === 0) {
      return {
        isValid: false,
        error: "El correo electrónico es requerido"
      };
    }

    const trimmedEmail = email.trim();

    // Check length constraints
    if (trimmedEmail.length > 254) {
      return {
        isValid: false,
        error: "El correo electrónico es demasiado largo"
      };
    }

    // Check basic format
    if (!this.EMAIL_REGEX.test(trimmedEmail)) {
      return {
        isValid: false,
        error: "Formato de correo electrónico inválido"
      };
    }

    // Check for consecutive dots
    if (trimmedEmail.includes('..')) {
      return {
        isValid: false,
        error: "El correo no puede contener puntos consecutivos"
      };
    }

    // Check local part length (before @)
    const [localPart, domain] = trimmedEmail.split('@');
    if (localPart.length > 64) {
      return {
        isValid: false,
        error: "La parte local del correo es demasiado larga"
      };
    }

    // Check domain part
    if (domain.length > 253) {
      return {
        isValid: false,
        error: "El dominio del correo es demasiado largo"
      };
    }

    // Check for valid domain structure
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      return {
        isValid: false,
        error: "El dominio debe contener al menos un punto"
      };
    }

    // Check each domain part
    for (const part of domainParts) {
      if (part.length === 0 || part.length > 63) {
        return {
          isValid: false,
          error: "Formato de dominio inválido"
        };
      }
    }

    return { isValid: true };
  }

  static async checkDomainExists(email: string): Promise<boolean> {
    // In a real implementation, this would check DNS records
    // For now, we'll implement basic domain validation
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Basic check for common domains
    const commonDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'icloud.com', 'protonmail.com', 'aol.com', 'live.com'
    ];

    return commonDomains.includes(domain.toLowerCase()) || domain.includes('.');
  }
}