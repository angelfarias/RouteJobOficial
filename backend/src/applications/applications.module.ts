// backend/src/applications/applications.module.ts
import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { CandidateSelectionService } from './candidate-selection.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],            // para inyectar NotificationsService
  controllers: [ApplicationsController],
  providers: [ApplicationsService, CandidateSelectionService],
  exports: [CandidateSelectionService],      // Export for use in other modules
})
export class ApplicationsModule {}
