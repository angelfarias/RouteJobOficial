// backend/src/match/interfaces/match.interface.ts

export interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  matchType: 'exact' | 'parent' | 'child' | 'sibling';
  matchScore: number;
}

export interface MatchFactors {
  locationScore: number;
  categoryScore: number;
  experienceScore: number;
  skillsScore: number;
  overallScore: number;
}

export interface CandidatePreferences {
  preferredCategories: string[];
  categoryWeights?: { [categoryId: string]: number };
  locationWeight?: number;
  categoryWeight?: number;
  experienceWeight?: number;
  skillsWeight?: number;
}

export interface MatchConfiguration {
  enableCategoryMatching: boolean;
  enableHierarchicalMatching: boolean;
  categoryMatchWeights: {
    exact: number;
    parent: number;
    child: number;
    sibling: number;
  };
  defaultWeights: {
    location: number;
    category: number;
    experience: number;
    skills: number;
  };
}