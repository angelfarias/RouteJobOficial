import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Application,
  CandidateDetails,
  SelectionResult,
  SelectionStatus,
  ApplicationWithCandidate,
  VacancyWithSelection,
  SelectionNotification
} from './interfaces/candidate-selection.interface';

@Injectable()
export class CandidateSelectionService {
  private db: Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') app: App,
    private readonly notifications: NotificationsService,
  ) {
    this.db = getFirestore(app);
  }

  /**
   * Retrieve all applications for a specific vacancy
   * Validates company ownership of the vacancy
   */
  async getApplicationsForVacancy(vacancyId: string, companyId: string): Promise<ApplicationWithCandidate[]> {
    console.log('[candidate-selection] getApplicationsForVacancy', { vacancyId, companyId });

    // First verify that the vacancy belongs to the company
    await this.validateVacancyAccess(vacancyId, companyId);

    // Get all applications for this vacancy with proper ordering
    const applicationsSnap = await this.db
      .collection('applications')
      .where('vacancyId', '==', vacancyId)
      .orderBy('createdAt', 'desc') // Most recent first
      .get();

    // Handle empty state gracefully
    if (applicationsSnap.empty) {
      console.log('[candidate-selection] No applications found for vacancy', vacancyId);
      return [];
    }

    const applications: ApplicationWithCandidate[] = [];

    // Process applications in batches for better performance
    const batchSize = 10;
    const applicationDocs = applicationsSnap.docs;

    for (let i = 0; i < applicationDocs.length; i += batchSize) {
      const batch = applicationDocs.slice(i, i + batchSize);
      const batchPromises = batch.map(appDoc => this.enrichApplicationWithCandidateData(appDoc));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          applications.push(result.value);
        } else {
          console.error('[candidate-selection] Failed to process application', batch[index].id, result.reason);
          // Add minimal application data for failed enrichment
          const appData = batch[index].data() as Application;
          applications.push(this.createMinimalApplicationWithCandidate(appData));
        }
      });
    }

    console.log('[candidate-selection] Found', applications.length, 'applications for vacancy', vacancyId);
    return applications;
  }

  /**
   * Get applications filtered by status
   */
  async getApplicationsByStatus(
    vacancyId: string, 
    companyId: string, 
    status: 'pending' | 'selected' | 'rejected'
  ): Promise<ApplicationWithCandidate[]> {
    console.log('[candidate-selection] getApplicationsByStatus', { vacancyId, companyId, status });

    await this.validateVacancyAccess(vacancyId, companyId);

    const applicationsSnap = await this.db
      .collection('applications')
      .where('vacancyId', '==', vacancyId)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    if (applicationsSnap.empty) {
      return [];
    }

    const applications: ApplicationWithCandidate[] = [];
    for (const appDoc of applicationsSnap.docs) {
      try {
        const enrichedApp = await this.enrichApplicationWithCandidateData(appDoc);
        applications.push(enrichedApp);
      } catch (error) {
        console.error('[candidate-selection] Error enriching application', appDoc.id, error);
        const appData = appDoc.data() as Application;
        applications.push(this.createMinimalApplicationWithCandidate(appData));
      }
    }

    return applications;
  }

  /**
   * Validate that a company has access to a vacancy
   */
  private async validateVacancyAccess(vacancyId: string, companyId: string): Promise<VacancyWithSelection> {
    const vacancyDoc = await this.db.collection('vacancies').doc(vacancyId).get();
    if (!vacancyDoc.exists) {
      throw new NotFoundException(`Vacancy ${vacancyId} not found`);
    }

    const vacancyData = vacancyDoc.data() as VacancyWithSelection;
    if (vacancyData.companyId !== companyId) {
      throw new ForbiddenException('Access denied: vacancy does not belong to this company');
    }

    return vacancyData;
  }

  /**
   * Enrich application data with candidate information
   */
  private async enrichApplicationWithCandidateData(appDoc: any): Promise<ApplicationWithCandidate> {
    const appData = appDoc.data() as Application;

    // Get candidate and user information in parallel
    const [candidateDoc, userDoc] = await Promise.all([
      this.db.collection('candidates').doc(appData.uid).get(),
      this.db.collection('users').doc(appData.uid).get()
    ]);

    const candidateData = candidateDoc.exists ? candidateDoc.data() : {};
    const userData = userDoc.exists ? userDoc.data() : {};

    return {
      id: appData.id,
      uid: appData.uid,
      vacancyId: appData.vacancyId,
      status: appData.status,
      createdAt: appData.createdAt,
      selectedAt: appData.selectedAt,
      selectedBy: appData.selectedBy,
      // Candidate information
      candidateName: userData?.displayName || userData?.email || 'Unknown',
      candidateEmail: userData?.email || '',
      profileCompleted: candidateData?.profileCompleted || false,
      experience: candidateData?.experience || [],
      skills: candidateData?.skills || [],
    };
  }

  /**
   * Create minimal application data when candidate enrichment fails
   */
  private createMinimalApplicationWithCandidate(appData: Application): ApplicationWithCandidate {
    return {
      id: appData.id,
      uid: appData.uid,
      vacancyId: appData.vacancyId,
      status: appData.status,
      createdAt: appData.createdAt,
      selectedAt: appData.selectedAt,
      selectedBy: appData.selectedBy,
      candidateName: 'Unknown',
      candidateEmail: '',
      profileCompleted: false,
      experience: [],
      skills: [],
    };
  }

  /**
   * Get detailed candidate information for a specific application
   * Validates company access to the application
   */
  async getCandidateDetails(applicationId: string, companyId: string): Promise<CandidateDetails> {
    console.log('[candidate-selection] getCandidateDetails', { applicationId, companyId });

    // Get the application and validate access
    const appData = await this.validateApplicationAccess(applicationId, companyId);

    // Get candidate and user information in parallel
    const [candidateDoc, userDoc] = await Promise.all([
      this.db.collection('candidates').doc(appData.uid).get(),
      this.db.collection('users').doc(appData.uid).get()
    ]);

    const candidateData = candidateDoc.exists ? candidateDoc.data() : {};
    const userData = userDoc.exists ? userDoc.data() : {};

    // Build candidate details with comprehensive information
    const candidateDetails: CandidateDetails = {
      id: appData.uid,
      applicationId: applicationId,
      name: this.extractCandidateName(userData, candidateData),
      email: userData?.email || '',
      phone: userData?.phone || candidateData?.phone,
      experience: candidateData?.experience || [],
      skills: candidateData?.skills || [],
      location: candidateData?.location,
      profileCompleted: this.calculateProfileCompleteness(candidateData, userData),
      applicationDate: appData.createdAt,
    };

    return candidateDetails;
  }

  /**
   * Get candidate details with missing information analysis
   */
  async getCandidateDetailsWithMissingInfo(
    applicationId: string, 
    companyId: string
  ): Promise<CandidateDetails & { missingFields: string[] }> {
    const candidateDetails = await this.getCandidateDetails(applicationId, companyId);
    const missingFields = this.identifyMissingInformation(candidateDetails);

    return {
      ...candidateDetails,
      missingFields,
    };
  }

  /**
   * Validate that a company has access to an application
   */
  private async validateApplicationAccess(applicationId: string, companyId: string): Promise<Application> {
    const appDoc = await this.db.collection('applications').doc(applicationId).get();
    if (!appDoc.exists) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const appData = appDoc.data() as Application;

    // Verify company owns the vacancy for this application
    await this.validateVacancyAccess(appData.vacancyId, companyId);

    return appData;
  }

  /**
   * Extract candidate name with fallback logic
   */
  private extractCandidateName(userData: any, candidateData: any): string {
    // Priority: displayName > firstName + lastName > email > 'Unknown'
    if (userData?.displayName) {
      return userData.displayName;
    }

    if (candidateData?.firstName || candidateData?.lastName) {
      const firstName = candidateData.firstName || '';
      const lastName = candidateData.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }

    if (userData?.email) {
      return userData.email;
    }

    return 'Unknown';
  }

  /**
   * Calculate profile completeness based on available data
   */
  private calculateProfileCompleteness(candidateData: any, userData: any): boolean {
    const requiredFields = [
      userData?.email,
      candidateData?.experience?.length > 0,
      candidateData?.skills?.length > 0,
      userData?.displayName || candidateData?.firstName || candidateData?.lastName,
    ];

    const completedFields = requiredFields.filter(Boolean).length;
    const completionPercentage = completedFields / requiredFields.length;

    // Consider profile complete if at least 75% of required fields are filled
    return completionPercentage >= 0.75;
  }

  /**
   * Identify missing information in candidate profile
   */
  private identifyMissingInformation(candidateDetails: CandidateDetails): string[] {
    const missingFields: string[] = [];

    if (!candidateDetails.name || candidateDetails.name === 'Unknown') {
      missingFields.push('name');
    }

    if (!candidateDetails.email) {
      missingFields.push('email');
    }

    if (!candidateDetails.phone) {
      missingFields.push('phone');
    }

    if (!candidateDetails.experience || candidateDetails.experience.length === 0) {
      missingFields.push('experience');
    }

    if (!candidateDetails.skills || candidateDetails.skills.length === 0) {
      missingFields.push('skills');
    }

    if (!candidateDetails.location) {
      missingFields.push('location');
    }

    return missingFields;
  }

  /**
   * Get multiple candidate details efficiently
   */
  async getMultipleCandidateDetails(
    applicationIds: string[], 
    companyId: string
  ): Promise<CandidateDetails[]> {
    console.log('[candidate-selection] getMultipleCandidateDetails', { applicationIds, companyId });

    const candidateDetailsPromises = applicationIds.map(appId => 
      this.getCandidateDetails(appId, companyId).catch(error => {
        console.error('[candidate-selection] Error getting candidate details for', appId, error);
        return null;
      })
    );

    const results = await Promise.allSettled(candidateDetailsPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<CandidateDetails> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Select a candidate for a position
   * Implements single selection enforcement and records metadata
   */
  async selectCandidate(applicationId: string, companyId: string, selectedBy: string): Promise<SelectionResult> {
    console.log('[candidate-selection] selectCandidate', { applicationId, companyId, selectedBy });

    // Use a transaction to ensure data consistency
    return await this.db.runTransaction(async (transaction) => {
      // Get the application
      const appRef = this.db.collection('applications').doc(applicationId);
      const appDoc = await transaction.get(appRef);
      
      if (!appDoc.exists) {
        throw new NotFoundException(`Application ${applicationId} not found`);
      }

      const appData = appDoc.data() as Application;

      // Verify company owns the vacancy
      const vacancyRef = this.db.collection('vacancies').doc(appData.vacancyId);
      const vacancyDoc = await transaction.get(vacancyRef);
      
      if (!vacancyDoc.exists) {
        throw new NotFoundException(`Vacancy ${appData.vacancyId} not found`);
      }

      const vacancyData = vacancyDoc.data() as VacancyWithSelection;
      if (vacancyData.companyId !== companyId) {
        throw new ForbiddenException('Access denied: vacancy does not belong to this company');
      }

      // Check if vacancy already has a selected candidate
      if (vacancyData.hasSelectedCandidate) {
        throw new BadRequestException('This vacancy already has a selected candidate');
      }

      // Check if application is already selected
      if (appData.status === 'selected') {
        throw new BadRequestException('This candidate is already selected');
      }

      const now = Timestamp.now();

      // Update application status
      transaction.update(appRef, {
        status: 'selected',
        selectedAt: now,
        selectedBy: selectedBy,
      });

      // Update vacancy status
      transaction.update(vacancyRef, {
        hasSelectedCandidate: true,
        selectedCandidateId: appData.uid,
        selectionDate: now,
      });

      return {
        success: true,
        applicationId: applicationId,
        candidateId: appData.uid,
        vacancyId: appData.vacancyId,
        selectedAt: now,
        selectedBy: selectedBy,
        notificationSent: false, // Will be updated after notification is sent
      };
    });
  }

  /**
   * Check if a vacancy has a selected candidate
   */
  async getSelectionStatus(vacancyId: string): Promise<SelectionStatus> {
    console.log('[candidate-selection] getSelectionStatus', { vacancyId });

    const vacancyDoc = await this.db.collection('vacancies').doc(vacancyId).get();
    if (!vacancyDoc.exists) {
      throw new NotFoundException(`Vacancy ${vacancyId} not found`);
    }

    const vacancyData = vacancyDoc.data() as VacancyWithSelection;

    return {
      vacancyId: vacancyId,
      hasSelectedCandidate: vacancyData.hasSelectedCandidate || false,
      selectedCandidateId: vacancyData.selectedCandidateId,
      selectionDate: vacancyData.selectionDate,
    };
  }

  /**
   * Get applications with pagination and filtering options
   */
  async getApplicationsWithPagination(
    vacancyId: string,
    companyId: string,
    options: {
      status?: 'pending' | 'selected' | 'rejected';
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'candidateName' | 'status';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    applications: ApplicationWithCandidate[];
    total: number;
    hasMore: boolean;
  }> {
    console.log('[candidate-selection] getApplicationsWithPagination', { vacancyId, companyId, options });

    await this.validateVacancyAccess(vacancyId, companyId);

    const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc', status } = options;

    // Build query
    let query: any = this.db.collection('applications').where('vacancyId', '==', vacancyId);

    if (status) {
      query = query.where('status', '==', status);
    }

    // Get total count first
    const totalSnap = await query.get();
    const total = totalSnap.size;

    // Apply sorting and pagination
    if (sortBy === 'createdAt') {
      query = query.orderBy('createdAt', sortOrder);
    }

    const applicationsSnap = await query.offset(offset).limit(limit).get();

    const applications: ApplicationWithCandidate[] = [];
    for (const appDoc of applicationsSnap.docs) {
      try {
        const enrichedApp = await this.enrichApplicationWithCandidateData(appDoc);
        applications.push(enrichedApp);
      } catch (error) {
        console.error('[candidate-selection] Error enriching application', appDoc.id, error);
        const appData = appDoc.data() as Application;
        applications.push(this.createMinimalApplicationWithCandidate(appData));
      }
    }

    // Sort by candidate name if requested (done in memory since Firestore doesn't support it directly)
    if (sortBy === 'candidateName') {
      applications.sort((a, b) => {
        const comparison = a.candidateName.localeCompare(b.candidateName);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    } else if (sortBy === 'status') {
      applications.sort((a, b) => {
        const comparison = a.status.localeCompare(b.status);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return {
      applications,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get application statistics for a vacancy
   */
  async getApplicationStatistics(vacancyId: string, companyId: string): Promise<{
    total: number;
    pending: number;
    selected: number;
    rejected: number;
    hasSelectedCandidate: boolean;
  }> {
    console.log('[candidate-selection] getApplicationStatistics', { vacancyId, companyId });

    await this.validateVacancyAccess(vacancyId, companyId);

    // Get all applications for statistics
    const applicationsSnap = await this.db
      .collection('applications')
      .where('vacancyId', '==', vacancyId)
      .get();

    const stats = {
      total: applicationsSnap.size,
      pending: 0,
      selected: 0,
      rejected: 0,
      hasSelectedCandidate: false,
    };

    applicationsSnap.docs.forEach(doc => {
      const appData = doc.data() as Application;
      switch (appData.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'selected':
          stats.selected++;
          stats.hasSelectedCandidate = true;
          break;
        case 'rejected':
          stats.rejected++;
          break;
      }
    });

    return stats;
  }

  /**
   * Send selection notification to candidate
   * This will be called after successful candidate selection
   * Enhanced to provide clear confirmation, complete information, and position-specific identification
   */
  async sendSelectionNotification(selectionResult: SelectionResult): Promise<void> {
    console.log('[candidate-selection] sendSelectionNotification', { selectionResult });

    try {
      // Get candidate information
      const userDoc = await this.db.collection('users').doc(selectionResult.candidateId).get();
      const userData = userDoc.data();
      const candidateEmail = userData?.email;
      const candidateName = userData?.displayName || userData?.email || 'Candidato';

      if (!candidateEmail) {
        console.warn('[candidate-selection] No email found for candidate', selectionResult.candidateId);
        return;
      }

      // Get vacancy details with comprehensive information
      const vacancyDoc = await this.db.collection('vacancies').doc(selectionResult.vacancyId).get();
      const vacancyData = vacancyDoc.data() as VacancyWithSelection;

      // Get company details with contact information
      const companyDoc = await this.db.collection('companies').doc(vacancyData.companyId).get();
      const companyData = companyDoc.exists ? companyDoc.data() : {};

      // Build comprehensive position details with clear confirmation
      const positionDetails = this.buildPositionDetails(vacancyData, companyData, candidateName);
      
      // Build actionable next steps with clear guidance
      const nextSteps = this.buildNextSteps(companyData, vacancyData);
      
      // Build comprehensive contact information
      const contactInfo = this.buildContactInfo(companyData);

      // Create enhanced selection notification data with processed values
      const processedVacancyTitle = vacancyData?.title?.trim() || 'Posición disponible';
      const processedCompanyName = companyData?.name?.trim() || 'Empresa';
      
      const selectionNotification: SelectionNotification = {
        candidateEmail: candidateEmail,
        vacancyTitle: processedVacancyTitle,
        companyName: processedCompanyName,
        positionDetails: positionDetails,
        nextSteps: nextSteps,
        contactInfo: contactInfo,
      };

      // Send notification using enhanced notification service
      await this.notifications.sendCandidateSelectionNotification(selectionNotification);

      // Update application with notification sent status
      const now = Timestamp.now();
      await this.db.collection('applications').doc(selectionResult.applicationId).update({
        notificationSent: true,
        notificationSentAt: now,
      });

      console.log('[candidate-selection] Enhanced selection notification sent successfully');
    } catch (error) {
      console.error('[candidate-selection] Error sending selection notification', error);
      // Don't throw error - selection should still be considered successful
    }
  }

  /**
   * Build comprehensive position details with clear selection confirmation
   * Property 16: Selection confirmation clarity
   * Property 17: Notification information completeness
   * Property 19: Position-specific identification
   */
  private buildPositionDetails(vacancyData: any, companyData: any, candidateName: string): string {
    // Ensure we have valid data to avoid empty strings
    const vacancyTitle = vacancyData?.title?.trim() || 'Posición disponible';
    const companyName = companyData?.name?.trim() || 'Empresa';
    const candidateDisplayName = candidateName?.trim() || 'Candidato';
    
    const confirmationMessage = `¡Felicitaciones ${candidateDisplayName}! Has sido seleccionado para esta posición.`;
    
    let details = `${confirmationMessage}\n\n`;
    details += `**Posición específica:** ${vacancyTitle}\n`;
    details += `**Empresa:** ${companyName}\n`;
    
    // Add position description if available and not empty
    if (vacancyData?.description?.trim()) {
      details += `**Descripción del puesto:** ${vacancyData.description.trim()}\n`;
    }
    
    // Add location if available and not empty
    const location = vacancyData?.location?.trim() || companyData?.location?.trim();
    if (location) {
      details += `**Ubicación:** ${location}\n`;
    }
    
    // Add salary range if available and not empty
    if (vacancyData?.salaryRange?.trim()) {
      details += `**Rango salarial:** ${vacancyData.salaryRange.trim()}\n`;
    }
    
    // Add work modality if available and not empty
    if (vacancyData?.workModality?.trim()) {
      details += `**Modalidad de trabajo:** ${vacancyData.workModality.trim()}\n`;
    }
    
    // Add position-specific identification for multiple applications
    // Use safe string concatenation to avoid issues with empty strings
    details += `\n**Identificación del puesto:** Esta notificación corresponde específicamente al cargo de "${vacancyTitle}" en ${companyName}.`;
    
    return details;
  }

  /**
   * Build actionable next steps with clear guidance
   * Property 18: Contact information provision
   */
  private buildNextSteps(companyData: any, vacancyData: any): string {
    let nextSteps = 'Para continuar con el proceso de selección, te pedimos que:\n\n';
    
    nextSteps += '1. **Confirma tu interés:** Responde a este correo confirmando tu aceptación de la posición.\n';
    nextSteps += '2. **Prepara tu documentación:** Ten listos tus documentos de identificación y referencias laborales.\n';
    
    // Add company-specific contact instructions with actionable keywords
    if (companyData?.hrContactName) {
      nextSteps += `3. **Contactar a nuestro equipo:** Comunícate con ${companyData.hrContactName} para coordinar los siguientes pasos del proceso.\n`;
    } else {
      nextSteps += '3. **Contactar a nuestro equipo:** Utiliza la información de contacto proporcionada para coordinar los siguientes pasos del proceso.\n';
    }
    
    nextSteps += '4. **Mantente atento:** Estaremos en contacto contigo en las próximas 48 horas para coordinar la incorporación.\n\n';
    
    nextSteps += '¡Esperamos trabajar contigo pronto!';
    
    return nextSteps;
  }

  /**
   * Build comprehensive contact information
   * Property 18: Contact information provision
   */
  private buildContactInfo(companyData: any): string {
    let contactInfo = 'Información de contacto para próximos pasos:\n\n';
    
    // Primary email contact
    if (companyData?.email || companyData?.contactEmail) {
      contactInfo += `**Email:** ${companyData.email || companyData.contactEmail}\n`;
    }
    
    // Phone contact if available
    if (companyData?.phone || companyData?.contactPhone) {
      contactInfo += `**Teléfono:** ${companyData.phone || companyData.contactPhone}\n`;
    }
    
    // HR contact person if available
    if (companyData?.hrContactName) {
      contactInfo += `**Contacto de RRHH:** ${companyData.hrContactName}\n`;
      if (companyData?.hrContactEmail) {
        contactInfo += `**Email de RRHH:** ${companyData.hrContactEmail}\n`;
      }
    }
    
    // Company address if available
    if (companyData?.address) {
      contactInfo += `**Dirección:** ${companyData.address}\n`;
    }
    
    // Fallback contact information
    if (!companyData?.email && !companyData?.contactEmail && !companyData?.phone) {
      contactInfo += 'Por favor responde a este correo para establecer contacto directo.\n';
    }
    
    contactInfo += '\n**Horario de atención:** Lunes a Viernes, 9:00 AM - 6:00 PM';
    
    return contactInfo;
  }
}