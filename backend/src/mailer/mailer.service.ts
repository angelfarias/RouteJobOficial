// backend/src/mailer/mailer.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendApplicationMail(to: string, vacancyTitle: string, status: string) {

    
    console.log('[mailer] sendApplicationMail called', {
      to,
      vacancyTitle,
      status,
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM_EMAIL,
    });

    const info = await this.transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'RouteJob'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject: `Postulación ${status}`,
      text: `Tu postulación a "${vacancyTitle}" está ${status}.`,
    });

    console.log('[mailer] sendApplicationMail result', {
      messageId: info.messageId,
      response: info.response,
    });
  }

  async sendNearbyVacanciesMail(to: string, count: number) {
    console.log('[mailer] sendNearbyVacanciesMail called', {
      to,
      count,
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM_EMAIL,
    });

    const info = await this.transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'RouteJob'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject: 'Nuevas vacantes cerca de ti',
      text: `Hay ${count} nuevas vacantes cerca de tu ubicación.`,
    });

    console.log('[mailer] sendNearbyVacanciesMail result', {
      messageId: info.messageId,
      response: info.response,
    });
  }

  async sendCandidateSelectionMail(to: string, subject: string, text: string, html?: string) {
    console.log('[mailer] sendCandidateSelectionMail called', {
      to,
      subject,
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM_EMAIL,
    });

    const mailOptions: any = {
      from: `"${process.env.SMTP_FROM_NAME || 'RouteJob'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      text,
    };

    if (html) {
      mailOptions.html = html;
    }

    const info = await this.transporter.sendMail(mailOptions);

    console.log('[mailer] sendCandidateSelectionMail result', {
      messageId: info.messageId,
      response: info.response,
    });
  }
}
