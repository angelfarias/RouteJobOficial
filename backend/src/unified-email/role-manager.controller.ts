// backend/src/unified-email/role-manager.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete,
  Body, 
  Param, 
  UseGuards,
  Request
} from '@nestjs/common';
import { RoleManagerService } from './services/role-manager.service';
import { UserSession, RoleSelectionPreference } from './interfaces';
import type { ProfileType } from './interfaces';

// Note: Replace with your actual auth guard
// import { AuthGuard } from '../auth/auth.guard';

export class SwitchRoleDto {
  newRole: ProfileType;
}

export class UpdateRolePreferenceDto {
  preference: RoleSelectionPreference;
}

@Controller('unified-email/role-manager')
// @UseGuards(AuthGuard) // Uncomment when auth guard is available
export class RoleManagerController {
  constructor(private readonly roleManagerService: RoleManagerService) {}

  /**
   * Switch user's active role
   */
  @Post('switch-role')
  async switchRole(
    @Body() dto: SwitchRoleDto,
    @Request() req: any
  ): Promise<UserSession> {
    const userId = req.user?.uid || req.body.userId; // Fallback for testing
    return this.roleManagerService.switchRole(userId, dto.newRole);
  }

  /**
   * Get current user session
   */
  @Get('current-session')
  async getCurrentSession(@Request() req: any): Promise<UserSession | null> {
    const userId = req.user?.uid || req.query.userId; // Fallback for testing
    return this.roleManagerService.getCurrentSession(userId);
  }

  /**
   * Determine appropriate role for user login
   */
  @Get('determine-login-role')
  async determineLoginRole(@Request() req: any): Promise<{
    recommendedRole: ProfileType | null;
    availableRoles: ProfileType[];
    requiresSelection: boolean;
  }> {
    const userId = req.user?.uid || req.query.userId; // Fallback for testing
    return this.roleManagerService.determineLoginRole(userId);
  }

  /**
   * Update user's role selection preference
   */
  @Put('role-preference')
  async updateRolePreference(
    @Body() dto: UpdateRolePreferenceDto,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user?.uid || req.body.userId; // Fallback for testing
    await this.roleManagerService.updateRolePreference(userId, dto.preference);
    return {
      success: true,
      message: 'Preferencia de rol actualizada exitosamente'
    };
  }

  /**
   * Get role-based routing information
   */
  @Get('routing/:role')
  async getRoleBasedRouting(
    @Param('role') role: ProfileType,
    @Request() req: any
  ): Promise<{
    dashboardPath: string;
    allowedRoutes: string[];
    restrictedRoutes: string[];
  }> {
    const userId = req.user?.uid || req.query.userId; // Fallback for testing
    return this.roleManagerService.getRoleBasedRouting(userId, role);
  }

  /**
   * Update session activity (for keepalive)
   */
  @Post('update-activity')
  async updateSessionActivity(@Request() req: any): Promise<{ success: boolean }> {
    const userId = req.user?.uid || req.body.userId; // Fallback for testing
    await this.roleManagerService.updateSessionActivity(userId);
    return { success: true };
  }

  /**
   * End user session
   */
  @Delete('session')
  async endSession(@Request() req: any): Promise<{ success: boolean; message: string }> {
    const userId = req.user?.uid || req.body.userId; // Fallback for testing
    await this.roleManagerService.endSession(userId);
    return {
      success: true,
      message: 'Sesión finalizada exitosamente'
    };
  }

  /**
   * Get session statistics
   */
  @Get('session-stats')
  async getSessionStats(@Request() req: any): Promise<{
    totalSessions: number;
    averageSessionDuration: number;
    roleUsageStats: Record<ProfileType, number>;
    lastLoginDate: any;
  }> {
    const userId = req.user?.uid || req.query.userId; // Fallback for testing
    return this.roleManagerService.getSessionStats(userId);
  }
}