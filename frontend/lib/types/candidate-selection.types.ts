import { Timestamp } from 'firebase/firestore';

// Extended Application interface with selection fields
export interface Application {
  id: string;
  uid: string; // candidate ID
  vacancyId: string;
  status: 'pending' | 'selected' | 'rejected';
  createdAt: Timestamp;
  selectedAt?: Timestamp;
  selectedBy?: string; // company representative ID
  notificationSent?: boolean;
  notificationSentAt?: Timestamp;
}

// Extended Vacancy interface with selection fields
export interface VacancyWithSelection {
  id: string;
  companyId: string;
  branchId: string;
  title: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  jornada: string;
  tipoContrato: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  location: {
    latitude: number;
    longitude: number;
  };
  company?: string;
  branchName?: string;
  // Selection-specific fields
  hasSelectedCandidate?: boolean;
  selectedCandidateId?: string;
  selectionDate?: Timestamp;
}

// Candidate details view model
export interface CandidateDetails {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  phone?: string;
  experience: string[];
  skills: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  profileCompleted: boolean;
  applicationDate: Timestamp;
  missingFields?: string[];
}

// Extended candidate details with missing information analysis
export interface CandidateDetailsWithMissingInfo extends CandidateDetails {
  missingFields: string[];
}

// Selection result interface
export interface SelectionResult {
  success: boolean;
  applicationId: string;
  candidateId: string;
  vacancyId: string;
  selectedAt: Timestamp;
  selectedBy: string;
  notificationSent: boolean;
  error?: string;
}

// Selection status interface
export interface SelectionStatus {
  vacancyId: string;
  hasSelectedCandidate: boolean;
  selectedCandidateId?: string;
  selectionDate?: Timestamp;
  selectedBy?: string;
}

// Selection notification data
export interface SelectionNotification {
  candidateEmail: string;
  vacancyTitle: string;
  companyName: string;
  positionDetails: string;
  nextSteps: string;
  contactInfo: string;
}

// Application with candidate info for listing
export interface ApplicationWithCandidate {
  id: string;
  uid: string;
  vacancyId: string;
  status: 'pending' | 'selected' | 'rejected';
  createdAt: Timestamp;
  selectedAt?: Timestamp;
  selectedBy?: string;
  // Candidate information
  candidateName: string;
  candidateEmail: string;
  profileCompleted: boolean;
  experience: string[];
  skills: string[];
}