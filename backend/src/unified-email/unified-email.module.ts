// backend/src/unified-email/unified-email.module.ts
import { Module } from '@nestjs/common';
import { UnifiedAuthService } from './services/unified-auth.service';
import { ProfileService } from './services/profile.service';
import { RoleManagerService } from './services/role-manager.service';
import { ErrorRecoveryService } from './services/error-recovery.service';
import { UnifiedEmailController } from './unified-email.controller';
import { ProfileController } from './profile.controller';
import { RoleManagerController } from './role-manager.controller';

@Module({
  controllers: [UnifiedEmailController, ProfileController, RoleManagerController],
  providers: [UnifiedAuthService, ProfileService, RoleManagerService, ErrorRecoveryService],
  exports: [UnifiedAuthService, ProfileService, RoleManagerService, ErrorRecoveryService],
})
export class UnifiedEmailModule {}