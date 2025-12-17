// backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailerModule } from '../mailer/mailer.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [MailerModule, FirebaseModule],    // IMPORTANTE: Added FirebaseModule
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
