// backend/src/notifications/notifications.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { MailerService } from '../mailer/mailer.service';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';

interface SelectionNotification {
  candidateEmail: string;
  vacancyTitle: string;
  companyName: string;
  positionDetails: string;
  nextSteps: string;
  contactInfo: string;
}

interface NotificationAuditRecord {
  id?: string;
  type: 'candidate_selection' | 'application_status' | 'nearby_vacancies';
  recipientEmail: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  createdAt: Timestamp;
  lastAttemptAt?: Timestamp;
  sentAt?: Timestamp;
  failureReason?: string;
  notificationData: any;
}

@Injectable()
export class NotificationsService {
  private db: Firestore;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff: 1s, 5s, 15s

  constructor(
    private readonly mailer: MailerService,
    @Inject('FIREBASE_ADMIN') app: App,
  ) {
    this.db = getFirestore(app);
  }

  async sendApplicationStatus(email: string, opts: { vacancyTitle: string; status: string }) {
    await this.mailer.sendApplicationMail(email, opts.vacancyTitle, opts.status);
  }

  async sendNearbyVacancies(email: string, count: number) {
    await this.mailer.sendNearbyVacanciesMail(email, count);
  }

  /**
   * Send candidate selection notification with retry logic and audit trail
   */
  async sendCandidateSelectionNotification(notification: SelectionNotification): Promise<void> {
    console.log('[notifications] sendCandidateSelectionNotification', { 
      email: notification.candidateEmail,
      vacancy: notification.vacancyTitle 
    });

    // Create audit record
    const auditRecord: NotificationAuditRecord = {
      type: 'candidate_selection',
      recipientEmail: notification.candidateEmail,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.MAX_RETRY_ATTEMPTS,
      createdAt: Timestamp.now(),
      notificationData: notification,
    };

    const auditRef = await this.db.collection('notification_audit').add(auditRecord);
    auditRecord.id = auditRef.id;

    // Attempt to send notification with retry logic
    await this.sendWithRetry(auditRecord);
  }

  /**
   * Send notification with exponential backoff retry logic
   */
  private async sendWithRetry(auditRecord: NotificationAuditRecord): Promise<void> {
    const maxAttempts = auditRecord.maxAttempts;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[notifications] Attempt ${attempt}/${maxAttempts} for notification ${auditRecord.id}`);
        
        // Update audit record with current attempt
        await this.updateAuditRecord(auditRecord.id!, {
          attempts: attempt,
          status: attempt === 1 ? 'pending' : 'retrying',
          lastAttemptAt: Timestamp.now(),
        });

        // Send the notification
        await this.sendCandidateSelectionEmail(auditRecord.notificationData as SelectionNotification);

        // Success - update audit record
        await this.updateAuditRecord(auditRecord.id!, {
          status: 'sent',
          sentAt: Timestamp.now(),
        });

        console.log(`[notifications] Successfully sent notification ${auditRecord.id} on attempt ${attempt}`);
        return;

      } catch (error) {
        console.error(`[notifications] Attempt ${attempt} failed for notification ${auditRecord.id}:`, error);

        const isLastAttempt = attempt === maxAttempts;
        
        if (isLastAttempt) {
          // Final failure - update audit record
          await this.updateAuditRecord(auditRecord.id!, {
            status: 'failed',
            failureReason: error instanceof Error ? error.message : 'Unknown error',
          });
          
          console.error(`[notifications] All attempts failed for notification ${auditRecord.id}`);
          throw error;
        } else {
          // Wait before retry with exponential backoff
          const delay = this.RETRY_DELAYS[attempt - 1] || 15000;
          console.log(`[notifications] Waiting ${delay}ms before retry ${attempt + 1}`);
          await this.sleep(delay);
        }
      }
    }
  }

  /**
   * Send the actual candidate selection email
   */
  private async sendCandidateSelectionEmail(notification: SelectionNotification): Promise<void> {
    const subject = `¡Felicitaciones! Has sido seleccionado para ${notification.vacancyTitle}`;
    
    const emailContent = this.buildSelectionEmailContent(notification);

    await this.mailer.sendCandidateSelectionMail(
      notification.candidateEmail,
      subject,
      emailContent.text,
      emailContent.html
    );
  }

  /**
   * Build email content for candidate selection notification
   */
  private buildSelectionEmailContent(notification: SelectionNotification): { text: string; html: string } {
    const text = `
¡Felicitaciones!

Has sido seleccionado para la posición: ${notification.vacancyTitle}
Empresa: ${notification.companyName}

Detalles de la posición:
${notification.positionDetails}

Próximos pasos:
${notification.nextSteps}

Información de contacto:
${notification.contactInfo}

¡Esperamos trabajar contigo pronto!

Saludos,
El equipo de ${notification.companyName}
    `.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2c5aa0; text-align: center;">¡Felicitaciones!</h1>
  
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2 style="color: #28a745; margin-top: 0;">Has sido seleccionado</h2>
    <p><strong>Posición:</strong> ${notification.vacancyTitle}</p>
    <p><strong>Empresa:</strong> ${notification.companyName}</p>
  </div>

  <div style="margin: 20px 0;">
    <h3 style="color: #495057;">Detalles de la posición:</h3>
    <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">${notification.positionDetails}</p>
  </div>

  <div style="margin: 20px 0;">
    <h3 style="color: #495057;">Próximos pasos:</h3>
    <p>${notification.nextSteps}</p>
  </div>

  <div style="margin: 20px 0;">
    <h3 style="color: #495057;">Información de contacto:</h3>
    <p><strong>Contacto:</strong> ${notification.contactInfo}</p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
    <p style="color: #6c757d;">¡Esperamos trabajar contigo pronto!</p>
    <p style="color: #6c757d;"><strong>El equipo de ${notification.companyName}</strong></p>
  </div>
</div>
    `.trim();

    return { text, html };
  }

  /**
   * Update notification audit record
   */
  private async updateAuditRecord(auditId: string, updates: Partial<NotificationAuditRecord>): Promise<void> {
    await this.db.collection('notification_audit').doc(auditId).update(updates);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get notification audit records for a recipient
   */
  async getNotificationHistory(email: string, limit: number = 50): Promise<NotificationAuditRecord[]> {
    const snapshot = await this.db
      .collection('notification_audit')
      .where('recipientEmail', '==', email)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as NotificationAuditRecord));
  }

  /**
   * Get failed notifications for retry processing
   */
  async getFailedNotifications(limit: number = 100): Promise<NotificationAuditRecord[]> {
    const snapshot = await this.db
      .collection('notification_audit')
      .where('status', '==', 'failed')
      .where('attempts', '<', this.MAX_RETRY_ATTEMPTS)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as NotificationAuditRecord));
  }
}
