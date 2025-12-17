// backend/src/unified-email/unified-email.controller.ts
import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { UnifiedAuthService } from './services/unified-auth.service';
import { LinkProfileDto, ProfileLinkingResult } from './dto';
import { ProfileTypes } from './interfaces';

@Controller('unified-email')
export class UnifiedEmailController {
  constructor(private readonly unifiedAuthService: UnifiedAuthService) {}

  /**
   * Check what profile types a user has
   */
  @Get('profiles/:userId')
  async getUserProfiles(@Param('userId') userId: string): Promise<ProfileTypes> {
    return this.unifiedAuthService.checkUserProfiles(userId);
  }

  /**
   * Link a new profile type to an existing user account
   */
  @Post('link-profile')
  @HttpCode(HttpStatus.OK)
  async linkProfile(@Body() linkProfileDto: LinkProfileDto): Promise<ProfileLinkingResult> {
    return this.unifiedAuthService.handleProfileLinking(linkProfileDto);
  }

  /**
   * Get unified user account information
   */
  @Get('account/:userId')
  async getUnifiedAccount(@Param('userId') userId: string) {
    const account = await this.unifiedAuthService.getUnifiedUserAccount(userId);
    if (!account) {
      return { message: 'Cuenta no encontrada' };
    }
    return account;
  }
}