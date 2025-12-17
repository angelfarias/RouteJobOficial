import { Timestamp } from 'firebase-admin/firestore';
import {
  Application,
  CandidateDetails,
  ApplicationWithCandidate,
  VacancyWithSelection,
} from '../interfaces/candidate-selection.interface';

/**
 * Transform Firestore document data to Application interface
 */
export function transformToApplication(docData: any, docId: string): Application {
  return {
    id: docId,
    uid: docData.uid || '',
    vacancyId: docData.vacancyId || '',
    status: docData.status || 'pending',
    createdAt: docData.createdAt || Timestamp.now(),
    selectedAt: docData.selectedAt,
    selectedBy: docData.selectedBy,
    notificationSent: docData.notificationSent || false,
    notificationSentAt: docData.notificationSentAt,
  };
}

/**
 * Transform Firestore document data to VacancyWithSelection interface
 */
export function transformToVacancyWithSelection(docData: any, docId: string): VacancyWithSelection {
  return {
    id: docId,
    companyId: docData.companyId || '',
    branchId: docData.branchId || '',
    title: docData.title || '',
    description: docData.description || '',
    salaryMin: docData.salaryMin,
    salaryMax: docData.salaryMax,
    jornada: docData.jornada || '',
    tipoContrato: docData.tipoContrato || '',
    active: docData.active !== false,
    createdAt: docData.createdAt || Timestamp.now(),
    updatedAt: docData.updatedAt || Timestamp.now(),
    location: docData.location || { latitude: 0, longitude: 0 },
    company: docData.company,
    branchName: docData.branchName,
    hasSelectedCandidate: docData.hasSelectedCandidate || false,
    selectedCandidateId: docData.selectedCandidateId,
    selectionDate: docData.selectionDate,
  };
}

/**
 * Transform candidate and user data to CandidateDetails interface
 */
export function transformToCandidateDetails(
  candidateData: any,
  userData: any,
  applicationId: string,
  applicationDate: Timestamp
): CandidateDetails {
  return {
    id: candidateData?.uid || userData?.uid || '',
    applicationId: applicationId,
    name: userData?.displayName || userData?.email || 'Unknown',
    email: userData?.email || '',
    phone: userData?.phone || candidateData?.phone,
    experience: candidateData?.experience || [],
    skills: candidateData?.skills || [],
    location: candidateData?.location,
    profileCompleted: candidateData?.profileCompleted || false,
    applicationDate: applicationDate,
  };
}

/**
 * Transform application and candidate data to ApplicationWithCandidate interface
 */
export function transformToApplicationWithCandidate(
  appData: Application,
  candidateData: any,
  userData: any
): ApplicationWithCandidate {
  return {
    id: appData.id,
    uid: appData.uid,
    vacancyId: appData.vacancyId,
    status: appData.status,
    createdAt: appData.createdAt,
    selectedAt: appData.selectedAt,
    selectedBy: appData.selectedBy,
    candidateName: userData?.displayName || userData?.email || 'Unknown',
    candidateEmail: userData?.email || '',
    profileCompleted: candidateData?.profileCompleted || false,
    experience: candidateData?.experience || [],
    skills: candidateData?.skills || [],
  };
}

/**
 * Validate that required fields are present in candidate details
 */
export function validateCandidateDetails(details: CandidateDetails): string[] {
  const missingFields: string[] = [];

  if (!details.name || details.name === 'Unknown') {
    missingFields.push('name');
  }
  if (!details.email) {
    missingFields.push('email');
  }
  if (!details.experience || details.experience.length === 0) {
    missingFields.push('experience');
  }
  if (!details.skills || details.skills.length === 0) {
    missingFields.push('skills');
  }

  return missingFields;
}

/**
 * Check if candidate profile is complete
 */
export function isCandidateProfileComplete(candidateData: any, userData: any): boolean {
  const hasName = userData?.displayName || userData?.email;
  const hasEmail = userData?.email;
  const hasExperience = candidateData?.experience && candidateData.experience.length > 0;
  const hasSkills = candidateData?.skills && candidateData.skills.length > 0;

  return !!(hasName && hasEmail && hasExperience && hasSkills);
}

/**
 * Format application status for display
 */
export function formatApplicationStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'selected':
      return 'Seleccionado';
    case 'rejected':
      return 'Rechazado';
    default:
      return 'Desconocido';
  }
}

/**
 * Sort applications by date (most recent first)
 */
export function sortApplicationsByDate(applications: ApplicationWithCandidate[]): ApplicationWithCandidate[] {
  return applications.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime; // Descending order (most recent first)
  });
}