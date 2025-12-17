// src/match/dto/match-result.dto.ts
import { CategoryMatch, MatchFactors } from '../interfaces/match.interface';

export class MatchResultDto {
  vacante: {
    id: string;
    title: string;
    company: string;
    branchName: string;
    lat: number;
    lng: number;
    categories?: Array<{
      id: string;
      name: string;
      path: string;
    }>;
  };

  score: number;
  color: 'green' | 'yellow' | 'red';
  percentage: string;
  
  // Enhanced match information
  matchFactors?: MatchFactors;
  categoryMatches?: CategoryMatch[];
  matchReasons?: string[];
}
