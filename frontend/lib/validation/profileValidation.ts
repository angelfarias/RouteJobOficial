// frontend/lib/validation/profileValidation.ts
import { CandidateProfile, CompanyProfile } from '@/lib/types/unified-email.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ProfileValidation {
  /**
   * Validate candidate profile form data
   */
  static validateCandidateProfile(profile: Partial<CandidateProfile>): ValidationResult {
    const errors: string[] = [];

    // Personal info validation
    if (!profile.personalInfo?.firstName?.trim()) {
      errors.push('El nombre es requerido');
    }
    if (!profile.personalInfo?.lastName?.trim()) {
      errors.push('El apellido es requerido');
    }
    if (profile.personalInfo?.phone && !this.isValidPhone(profile.personalInfo.phone)) {
      errors.push('Formato de teléfono inválido');
    }

    // Professional info validation
    if (profile.professionalInfo?.skills && !Array.isArray(profile.professionalInfo.skills)) {
      errors.push('Las habilidades deben ser una lista');
    }

    // Preferences validation
    if (profile.preferences?.salaryRange) {
      const { min, max } = profile.preferences.salaryRange;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('El salario mínimo no puede ser mayor al máximo');
      }
      if (min !== undefined && min < 0) {
        errors.push('El salario mínimo no puede ser negativo');
      }
      if (max !== undefined && max < 0) {
        errors.push('El salario máximo no puede ser negativo');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate company profile form data
   */
  static validateCompanyProfile(profile: Partial<CompanyProfile>): ValidationResult {
    const errors: string[] = [];

    // Company info validation
    if (!profile.companyInfo?.name?.trim()) {
      errors.push('El nombre de la empresa es requerido');
    }
    if (profile.companyInfo?.website && !this.isValidUrl(profile.companyInfo.website)) {
      errors.push('Formato de sitio web inválido');
    }

    // Contact info validation
    if (!profile.contactInfo?.contactPerson?.trim()) {
      errors.push('La persona de contacto es requerida');
    }
    if (profile.contactInfo?.phone && !this.isValidPhone(profile.contactInfo.phone)) {
      errors.push('Formato de teléfono inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate phone number format
   */
  private static isValidPhone(phone: string): boolean {
    // Chilean phone number format validation
    const phoneRegex = /^(\+56|56)?[2-9]\d{8}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Validate required fields for profile creation
   */
  static validateRequiredFields(
    profileType: 'candidate' | 'company',
    data: any
  ): ValidationResult {
    const errors: string[] = [];

    if (profileType === 'candidate') {
      if (!data.personalInfo?.firstName?.trim()) {
        errors.push('El nombre es requerido');
      }
      if (!data.personalInfo?.lastName?.trim()) {
        errors.push('El apellido es requerido');
      }
    } else if (profileType === 'company') {
      if (!data.companyInfo?.name?.trim()) {
        errors.push('El nombre de la empresa es requerido');
      }
      if (!data.contactInfo?.contactPerson?.trim()) {
        errors.push('La persona de contacto es requerida');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input data to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '');
  }
}