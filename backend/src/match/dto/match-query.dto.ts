// src/match/dto/match-query.dto.ts
export class MatchQueryDto {
  radioKm?: number;
  categoryIds?: string[];
  includeHierarchical?: boolean;
  minCategoryScore?: number;
  enableDetailedMatching?: boolean;
}
