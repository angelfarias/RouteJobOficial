// backend/src/applications/applications.controller.ts
import { 
  Body, 
  Controller, 
  Get, 
  Post, 
  Query, 
  Param, 
  Headers,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CandidateSelectionService } from './candidate-selection.service';
import { 
  ApplicationWithCandidate, 
  CandidateDetails, 
  SelectionResult, 
  SelectionStatus 
} from './interfaces/candidate-selection.interface';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly candidateSelectionService: CandidateSelectionService,
  ) {}

  @Post('postular')
  async postular(
    @Body('uid') uid: string,
    @Body('vacancyId') vacancyId: string,
  ) {
    if (!uid || !vacancyId) {
      return { ok: false, error: 'uid y vacancyId requeridos' };
    }
    return this.applicationsService.postular(uid, vacancyId);
  }

  // para el icono de notificaciones en el header
  @Get('notifications/unread')
  async unread(@Query('uid') uid: string) {
    if (!uid) return { ok: false, error: 'uid requerido' };
    return this.applicationsService.unreadCount(uid);
  }

  /**
   * GET /applications/vacancy/:vacancyId
   * Retrieve all applications for a specific vacancy
   * Requires company authentication and authorization
   */
  @Get('vacancy/:vacancyId')
  async getApplicationsForVacancy(
    @Param('vacancyId') vacancyId: string,
    @Headers('x-company-id') companyId: string,
    @Headers('authorization') authorization: string,
    @Query('status') status?: 'pending' | 'selected' | 'rejected',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    ok: boolean;
    applications?: ApplicationWithCandidate[];
    total?: number;
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      // Validate authentication
      if (!authorization) {
        throw new UnauthorizedException('Authorization header required');
      }

      // Validate company ID
      if (!companyId) {
        throw new BadRequestException('Company ID header (x-company-id) required');
      }

      // Validate vacancy ID
      if (!vacancyId) {
        throw new BadRequestException('Vacancy ID is required');
      }

      // Parse pagination parameters
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset, 10) : undefined;

      // Validate pagination parameters
      if (parsedLimit && (parsedLimit < 1 || parsedLimit > 100)) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      if (parsedOffset && parsedOffset < 0) {
        throw new BadRequestException('Offset must be non-negative');
      }

      let applications: ApplicationWithCandidate[];
      let total: number | undefined;
      let hasMore: boolean | undefined;

      // Use pagination if parameters provided
      if (parsedLimit !== undefined || parsedOffset !== undefined) {
        const result = await this.candidateSelectionService.getApplicationsWithPagination(
          vacancyId,
          companyId,
          {
            status,
            limit: parsedLimit,
            offset: parsedOffset,
          }
        );
        applications = result.applications;
        total = result.total;
        hasMore = result.hasMore;
      } else if (status) {
        // Filter by status if provided
        applications = await this.candidateSelectionService.getApplicationsByStatus(
          vacancyId,
          companyId,
          status
        );
      } else {
        // Get all applications
        applications = await this.candidateSelectionService.getApplicationsForVacancy(
          vacancyId,
          companyId
        );
      }

      return {
        ok: true,
        applications,
        total,
        hasMore,
      };
    } catch (error) {
      console.error('[applications-controller] Error getting applications for vacancy', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        ok: false,
        error: 'Internal server error while retrieving applications',
      };
    }
  }

  /**
   * GET /applications/:applicationId/candidate
   * Get detailed candidate information for a specific application
   * Requires company authentication and authorization
   */
  @Get(':applicationId/candidate')
  async getCandidateDetails(
    @Param('applicationId') applicationId: string,
    @Headers('x-company-id') companyId: string,
    @Headers('authorization') authorization: string,
    @Query('includeMissingInfo') includeMissingInfo?: string,
  ): Promise<{
    ok: boolean;
    candidate?: CandidateDetails & { missingFields?: string[] };
    error?: string;
  }> {
    try {
      // Validate authentication
      if (!authorization) {
        throw new UnauthorizedException('Authorization header required');
      }

      // Validate company ID
      if (!companyId) {
        throw new BadRequestException('Company ID header (x-company-id) required');
      }

      // Validate application ID
      if (!applicationId) {
        throw new BadRequestException('Application ID is required');
      }

      let candidate: CandidateDetails & { missingFields?: string[] };

      // Include missing information analysis if requested
      if (includeMissingInfo === 'true') {
        candidate = await this.candidateSelectionService.getCandidateDetailsWithMissingInfo(
          applicationId,
          companyId
        );
      } else {
        candidate = await this.candidateSelectionService.getCandidateDetails(
          applicationId,
          companyId
        );
      }

      return {
        ok: true,
        candidate,
      };
    } catch (error) {
      console.error('[applications-controller] Error getting candidate details', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        ok: false,
        error: 'Internal server error while retrieving candidate details',
      };
    }
  }

  /**
   * POST /applications/:applicationId/select
   * Select a candidate for a position
   * Requires company authentication and authorization
   */
  @Post(':applicationId/select')
  async selectCandidate(
    @Param('applicationId') applicationId: string,
    @Headers('x-company-id') companyId: string,
    @Headers('authorization') authorization: string,
    @Body('selectedBy') selectedBy: string,
  ): Promise<{
    ok: boolean;
    selection?: SelectionResult;
    error?: string;
  }> {
    try {
      // Validate authentication
      if (!authorization) {
        throw new UnauthorizedException('Authorization header required');
      }

      // Validate company ID
      if (!companyId) {
        throw new BadRequestException('Company ID header (x-company-id) required');
      }

      // Validate application ID
      if (!applicationId) {
        throw new BadRequestException('Application ID is required');
      }

      // Validate selectedBy
      if (!selectedBy) {
        throw new BadRequestException('selectedBy field is required in request body');
      }

      // Select the candidate
      const selectionResult = await this.candidateSelectionService.selectCandidate(
        applicationId,
        companyId,
        selectedBy
      );

      // Send notification asynchronously (don't wait for it to complete)
      this.candidateSelectionService.sendSelectionNotification(selectionResult)
        .catch(error => {
          console.error('[applications-controller] Error sending selection notification', error);
        });

      return {
        ok: true,
        selection: selectionResult,
      };
    } catch (error) {
      console.error('[applications-controller] Error selecting candidate', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        ok: false,
        error: 'Internal server error while selecting candidate',
      };
    }
  }
}
