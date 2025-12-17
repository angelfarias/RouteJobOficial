// backend/src/unified-email/validation/profile-validation.ts
import { 
  CandidateProfile, 
  CompanyProfile, 
  CreateCandidateProfileDto, 
  CreateCompanyProfileDto,
  UpdateCandidateProfileDto,
  UpdateCompanyProfileDto
} from '../interfaces';

export class ProfileValidation {
  /**
   * Validate candidate profile data integrity
   */
  static validateCandidateProfile(profile: Partial<CandidateProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.userId) {
      errors.push('User ID is required');
    }

    if (!profile.personalInfo) {
      errors.push('Personal information is required');
    } else {
      if (!profile.personalInfo.firstName?.trim()) {
        errors.push('First name is required');
      }
      if (!profile.personalInfo.lastName?.trim()) {
        errors.push('Last name is required');
      }
      if (profile.personalInfo.phone && !this.isValidPhone(profile.personalInfo.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    if (profile.professionalInfo?.skills && !Array.isArray(profile.professionalInfo.skills)) {
      errors.push('Skills must be an array');
    }

    if (profile.preferences?.salaryRange) {
      const { min, max } = profile.preferences.salaryRange;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum salary cannot be greater than maximum salary');
      }
      if (min !== undefined && min < 0) {
        errors.push('Minimum salary cannot be negative');
      }
      if (max !== undefined && max < 0) {
        errors.push('Maximum salary cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate company profile data integrity
   */
  static validateCompanyProfile(profile: Partial<CompanyProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.userId) {
      errors.push('User ID is required');
    }

    if (!profile.companyInfo) {
      errors.push('Company information is required');
    } else {
      if (!profile.companyInfo.name?.trim()) {
        errors.push('Company name is required');
      }
      if (profile.companyInfo.website && !this.isValidUrl(profile.companyInfo.website)) {
        errors.push('Invalid website URL format');
      }
    }

    if (!profile.contactInfo) {
      errors.push('Contact information is required');
    } else {
      if (!profile.contactInfo.contactPerson?.trim()) {
        errors.push('Contact person is required');
      }
      if (profile.contactInfo.phone && !this.isValidPhone(profile.contactInfo.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate create candidate profile DTO
   */
  static validateCreateCandidateDto(dto: CreateCandidateProfileDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dto.personalInfo) {
      errors.push('Personal information is required');
    } else {
      if (!dto.personalInfo.firstName?.trim()) {
        errors.push('First name is required');
      }
      if (!dto.personalInfo.lastName?.trim()) {
        errors.push('Last name is required');
      }
      if (dto.personalInfo.phone && !this.isValidPhone(dto.personalInfo.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    if (dto.professionalInfo?.skills && !Array.isArray(dto.professionalInfo.skills)) {
      errors.push('Skills must be an array');
    }

    if (dto.preferences?.salaryRange) {
      const { min, max } = dto.preferences.salaryRange;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum salary cannot be greater than maximum salary');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate create company profile DTO
   */
  static validateCreateCompanyDto(dto: CreateCompanyProfileDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dto.companyInfo?.name?.trim()) {
      errors.push('Company name is required');
    }

    if (!dto.contactInfo?.contactPerson?.trim()) {
      errors.push('Contact person is required');
    }

    if (dto.companyInfo?.website && !this.isValidUrl(dto.companyInfo.website)) {
      errors.push('Invalid website URL format');
    }

    if (dto.contactInfo?.phone && !this.isValidPhone(dto.contactInfo.phone)) {
      errors.push('Invalid phone number format');
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
    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize profile data to prevent XSS and other security issues
   */
  static sanitizeProfileData<T extends Record<string, any>>(data: T): T {
    const sanitized = { ...data };
    
    const sanitizeString = (str: string): string => {
      return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitizedObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitizedObj[key] = sanitizeObject(value);
        }
        return sanitizedObj;
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }
}