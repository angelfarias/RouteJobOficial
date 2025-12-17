// src/match/match.controller.ts
import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchQueryDto } from './dto/match-query.dto';
import { MatchResultDto } from './dto/match-result.dto';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('candidate/:id')
  async findMatchesForCandidate(
    @Param('id') candidateId: string,
    @Query() filters: MatchQueryDto,
  ): Promise<MatchResultDto[]> {
    return this.matchService.findMatchesForCandidate(candidateId, filters);
  }

  @Get('candidate/:id/detailed')
  async findDetailedMatchesForCandidate(
    @Param('id') candidateId: string,
    @Query() filters: MatchQueryDto,
  ): Promise<MatchResultDto[]> {
    return this.matchService.findMatchesForCandidate(candidateId, {
      ...filters,
      enableDetailedMatching: true,
    });
  }

  @Get('candidate/:id/statistics')
  async getMatchStatistics(@Param('id') candidateId: string) {
    return this.matchService.getMatchStatistics(candidateId);
  }

  @Get('vacancy/:id/candidates')
  async findCandidatesForVacancy(
    @Param('id') vacancyId: string,
    @Query() filters: { radioKm?: number; minCategoryScore?: number },
  ) {
    return this.matchService.findCandidatesForVacancy(vacancyId, filters);
  }
}
