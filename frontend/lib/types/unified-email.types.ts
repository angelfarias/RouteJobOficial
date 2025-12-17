// frontend/lib/types/unified-email.types.ts
export type ProfileType = 'candidate' | 'company';

export interface UnifiedUserAccount {
  uid: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  profileTypes: ProfileType[];
  defaultRole?: ProfileType;
  preferences: {
    lastUsedRole?: ProfileType;
    roleSelectionPreference: 'ask' | 'remember';
  };
}

export interface CandidateProfile {
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  };
  professionalInfo: {
    title?: string;
    experience?: string;
    skills: string[];
    resume?: string;
  };
  preferences: {
    jobTypes: string[];
    locations: string[];
    salaryRange?: {
      min: number;
      max: number;
    };
  };
  applications: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  userId: string;
  companyInfo: {
    name: string;
    description?: string;
    industry?: string;
    size?: string;
    website?: string;
    logo?: string;
  };
  contactInfo: {
    contactPerson: string;
    phone?: string;
    address?: string;
  };
  jobPostings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileTypes {
  hasCandidate: boolean;
  hasCompany: boolean;
  availableRoles: ProfileType[];
}

export interface RoleContext {
  currentRole: ProfileType | null;
  availableRoles: ProfileType[];
  isLoading: boolean;
}