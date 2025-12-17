// frontend/lib/services/profileManagement.service.ts
import { ProfileType, CandidateProfile, CompanyProfile } from '../types/unified-email.types';

export interface ProfileManagementResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ProfileCreationData {
  candidate?: {
    personalInfo: {
      firstName: string;
      lastName: string;
      phone?: string;
      location?: string;
    };
    professionalInfo?: {
      title?: string;
      experience?: string;
      skills: string[];
    };
    preferences?: {
      jobTypes: string[];
      locations: string[];
      salaryRange?: {
        min: number;
        max: number;
      };
    };
  };
  company?: {
    companyInfo: {
      name: string;
      description?: string;
      industry?: string;
      size?: string;
      website?: string;
    };
    contactInfo: {
      contactPerson: string;
      phone?: string;
      address?: string;
    };
  };
}

export class ProfileManagementService {
  private static readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * Create a new profile for the user
   */
  static async createProfile(
    userId: string,
    profileType: ProfileType,
    profileData: ProfileCreationData
  ): Promise<ProfileManagementResult> {
    try {
      const endpoint = profileType === 'candidate' 
        ? '/unified-email/profile/candidate'
        : '/unified-email/profile/company';

      const response = await fetch(`${this.API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...profileData[profileType]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: `Perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'} creado exitosamente`,
        data: result
      };
    } catch (error) {
      console.error('Error creating profile:', error);
      return {
        success: false,
        message: 'Error al crear el perfil. Intenta nuevamente.'
      };
    }
  }

  /**
   * Update an existing profile
   */
  static async updateProfile(
    userId: string,
    profileType: ProfileType,
    profileData: Partial<ProfileCreationData>
  ): Promise<ProfileManagementResult> {
    try {
      const endpoint = profileType === 'candidate' 
        ? '/unified-email/profile/candidate'
        : '/unified-email/profile/company';

      const response = await fetch(`${this.API_BASE}${endpoint}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData[profileType])
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: `Perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'} actualizado exitosamente`,
        data: result
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        message: 'Error al actualizar el perfil. Intenta nuevamente.'
      };
    }
  }

  /**
   * Delete a profile
   */
  static async deleteProfile(
    userId: string,
    profileType: ProfileType
  ): Promise<ProfileManagementResult> {
    try {
      const endpoint = profileType === 'candidate' 
        ? '/unified-email/profile/candidate'
        : '/unified-email/profile/company';

      const response = await fetch(`${this.API_BASE}${endpoint}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: `Perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'} eliminado exitosamente`
      };
    } catch (error) {
      console.error('Error deleting profile:', error);
      return {
        success: false,
        message: 'Error al eliminar el perfil. Intenta nuevamente.'
      };
    }
  }

  /**
   * Get candidate profile
   */
  static async getCandidateProfile(userId: string): Promise<CandidateProfile | null> {
    try {
      const response = await fetch(`${this.API_BASE}/unified-email/profile/candidate/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Profile doesn't exist
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting candidate profile:', error);
      return null;
    }
  }

  /**
   * Get company profile
   */
  static async getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
    try {
      const response = await fetch(`${this.API_BASE}/unified-email/profile/company/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Profile doesn't exist
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting company profile:', error);
      return null;
    }
  }

  /**
   * Check if user has any profiles remaining after deletion
   */
  static async checkRemainingProfiles(userId: string): Promise<{
    hasProfiles: boolean;
    profileCount: number;
    availableRoles: ProfileType[];
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/unified-email/role-manager/determine-login-role?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        hasProfiles: result.availableRoles.length > 0,
        profileCount: result.availableRoles.length,
        availableRoles: result.availableRoles
      };
    } catch (error) {
      console.error('Error checking remaining profiles:', error);
      return {
        hasProfiles: false,
        profileCount: 0,
        availableRoles: []
      };
    }
  }

  /**
   * Validate profile data before creation/update
   */
  static validateProfileData(
    profileType: ProfileType,
    data: ProfileCreationData
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (profileType === 'candidate') {
      const candidateData = data.candidate;
      
      if (!candidateData) {
        errors.push('Datos de candidato requeridos');
        return { isValid: false, errors };
      }

      // Validate personal info
      if (!candidateData.personalInfo.firstName?.trim()) {
        errors.push('Nombre es requerido');
      }
      if (!candidateData.personalInfo.lastName?.trim()) {
        errors.push('Apellido es requerido');
      }

      // Validate professional info
      if (candidateData.professionalInfo?.skills && candidateData.professionalInfo.skills.length === 0) {
        errors.push('Al menos una habilidad es requerida');
      }
    } else {
      const companyData = data.company;
      
      if (!companyData) {
        errors.push('Datos de empresa requeridos');
        return { isValid: false, errors };
      }

      // Validate company info
      if (!companyData.companyInfo.name?.trim()) {
        errors.push('Nombre de empresa es requerido');
      }

      // Validate contact info
      if (!companyData.contactInfo.contactPerson?.trim()) {
        errors.push('Persona de contacto es requerida');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get profile completion percentage
   */
  static getProfileCompleteness(
    profileType: ProfileType,
    profile: CandidateProfile | CompanyProfile
  ): number {
    if (profileType === 'candidate') {
      const candidateProfile = profile as CandidateProfile;
      let completedFields = 0;
      let totalFields = 8; // Adjust based on required fields

      // Personal info
      if (candidateProfile.personalInfo.firstName) completedFields++;
      if (candidateProfile.personalInfo.lastName) completedFields++;
      if (candidateProfile.personalInfo.phone) completedFields++;
      if (candidateProfile.personalInfo.location) completedFields++;

      // Professional info
      if (candidateProfile.professionalInfo?.title) completedFields++;
      if (candidateProfile.professionalInfo?.experience) completedFields++;
      if (candidateProfile.professionalInfo?.skills?.length > 0) completedFields++;

      // Preferences
      if (candidateProfile.preferences?.jobTypes?.length > 0) completedFields++;

      return Math.round((completedFields / totalFields) * 100);
    } else {
      const companyProfile = profile as CompanyProfile;
      let completedFields = 0;
      let totalFields = 6; // Adjust based on required fields

      // Company info
      if (companyProfile.companyInfo.name) completedFields++;
      if (companyProfile.companyInfo.description) completedFields++;
      if (companyProfile.companyInfo.industry) completedFields++;
      if (companyProfile.companyInfo.website) completedFields++;

      // Contact info
      if (companyProfile.contactInfo.contactPerson) completedFields++;
      if (companyProfile.contactInfo.phone) completedFields++;

      return Math.round((completedFields / totalFields) * 100);
    }
  }

  /**
   * Export profile data for backup
   */
  static async exportProfileData(userId: string): Promise<{
    candidate?: CandidateProfile;
    company?: CompanyProfile;
    exportDate: string;
  }> {
    const candidateProfile = await this.getCandidateProfile(userId);
    const companyProfile = await this.getCompanyProfile(userId);

    return {
      ...(candidateProfile && { candidate: candidateProfile }),
      ...(companyProfile && { company: companyProfile }),
      exportDate: new Date().toISOString()
    };
  }
}