// backend/src/unified-email/profile.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { ProfileService } from './services/profile.service';
import { 
  CandidateProfile,
  CompanyProfile
} from './interfaces';
import type { 
  ProfileType,
  CreateCandidateProfileDto, 
  CreateCompanyProfileDto,
  UpdateCandidateProfileDto,
  UpdateCompanyProfileDto
} from './interfaces';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Create candidate profile
   */
  @Post('candidate/:userId')
  @HttpCode(HttpStatus.CREATED)
  async createCandidateProfile(
    @Param('userId') userId: string,
    @Body() createCandidateDto: CreateCandidateProfileDto
  ): Promise<CandidateProfile> {
    return this.profileService.createCandidateProfile(userId, createCandidateDto);
  }

  /**
   * Create company profile
   */
  @Post('company/:userId')
  @HttpCode(HttpStatus.CREATED)
  async createCompanyProfile(
    @Param('userId') userId: string,
    @Body() createCompanyDto: CreateCompanyProfileDto
  ): Promise<CompanyProfile> {
    return this.profileService.createCompanyProfile(userId, createCompanyDto);
  }

  /**
   * Get candidate profile
   */
  @Get('candidate/:userId')
  async getCandidateProfile(@Param('userId') userId: string): Promise<CandidateProfile | null> {
    return this.profileService.getCandidateProfile(userId);
  }

  /**
   * Get company profile
   */
  @Get('company/:userId')
  async getCompanyProfile(@Param('userId') userId: string): Promise<CompanyProfile | null> {
    return this.profileService.getCompanyProfile(userId);
  }

  /**
   * Update candidate profile
   */
  @Put('candidate/:userId')
  async updateCandidateProfile(
    @Param('userId') userId: string,
    @Body() updateCandidateDto: UpdateCandidateProfileDto
  ): Promise<CandidateProfile> {
    return this.profileService.updateCandidateProfile(userId, updateCandidateDto);
  }

  /**
   * Update company profile
   */
  @Put('company/:userId')
  async updateCompanyProfile(
    @Param('userId') userId: string,
    @Body() updateCompanyDto: UpdateCompanyProfileDto
  ): Promise<CompanyProfile> {
    return this.profileService.updateCompanyProfile(userId, updateCompanyDto);
  }

  /**
   * Delete candidate profile
   */
  @Delete('candidate/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCandidateProfile(@Param('userId') userId: string): Promise<void> {
    return this.profileService.deleteCandidateProfile(userId);
  }

  /**
   * Delete company profile
   */
  @Delete('company/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompanyProfile(@Param('userId') userId: string): Promise<void> {
    return this.profileService.deleteCompanyProfile(userId);
  }

  /**
   * Check if profile exists
   */
  @Get('exists/:profileType/:userId')
  async profileExists(
    @Param('userId') userId: string,
    @Param('profileType') profileType: ProfileType
  ): Promise<{ exists: boolean }> {
    const exists = await this.profileService.profileExists(userId, profileType);
    return { exists };
  }

  /**
   * Validate profile isolation
   */
  @Get('validate-isolation/:userId')
  async validateProfileIsolation(@Param('userId') userId: string) {
    return this.profileService.validateProfileIsolation(userId);
  }
}