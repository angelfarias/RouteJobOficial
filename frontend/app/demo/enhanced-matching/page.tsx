'use client';

import React, { useState, useEffect } from 'react';

interface MatchFactor {
  locationScore: number;
  categoryScore: number;
  experienceScore: number;
  skillsScore: number;
  overallScore: number;
}

interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  matchType: 'exact' | 'parent' | 'child' | 'sibling';
  matchScore: number;
}

interface MatchResult {
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
  matchFactors?: MatchFactor;
  categoryMatches?: CategoryMatch[];
  matchReasons?: string[];
}

interface MatchStatistics {
  totalMatches: number;
  averageScore: number;
  categoryBreakdown: { [categoryId: string]: number };
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    matchCount: number;
  }>;
}

export default function EnhancedMatchingDemo() {
  const [candidateId, setCandidateId] = useState('demo-candidate');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [statistics, setStatistics] = useState<MatchStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedMatching, setDetailedMatching] = useState(true);
  const [minCategoryScore, setMinCategoryScore] = useState(0);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        enableDetailedMatching: detailedMatching.toString(),
        minCategoryScore: minCategoryScore.toString(),
      });

      const response = await fetch(`http://localhost:3001/match/candidate/${candidateId}?${params}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Candidate not found. Please create a demo candidate first.');
          setMatches([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`http://localhost:3001/match/candidate/${candidateId}/statistics`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Candidate doesn't exist, set empty statistics
          setStatistics({
            totalMatches: 0,
            averageScore: 0,
            categoryBreakdown: {},
            topCategories: [],
          });
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      // Set empty statistics on error
      setStatistics({
        totalMatches: 0,
        averageScore: 0,
        categoryBreakdown: {},
        topCategories: [],
      });
    }
  };

  const createDemoCandidate = async () => {
    try {
      // Create a demo candidate with category preferences
      await fetch('http://localhost:3001/candidates/category-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: candidateId,
          preferredCategories: ['tech-frontend', 'tech-backend'],
          categoryWeights: {
            'tech-frontend': 1.0,
            'tech-backend': 0.8,
          },
        }),
      });

      // Set location
      await fetch('http://localhost:3001/candidates/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: candidateId,
          latitude: 40.7128,
          longitude: -74.0060,
          radioKm: 15,
        }),
      });

      // Set experience and skills
      await fetch('http://localhost:3001/candidates/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: candidateId,
          experience: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
        }),
      });

      await fetch('http://localhost:3001/candidates/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: candidateId,
          skills: ['React', 'TypeScript', 'CSS', 'HTML', 'Git'],
        }),
      });

      alert('Demo candidate created successfully!');
      
      // Refresh data after creating candidate
      setTimeout(() => {
        fetchMatches();
        fetchStatistics();
      }, 1000);
    } catch (err) {
      console.error('Failed to create demo candidate:', err);
      alert('Failed to create demo candidate');
    }
  };

  useEffect(() => {
    if (candidateId) {
      fetchMatches();
      fetchStatistics();
    }
  }, [candidateId, detailedMatching, minCategoryScore]);

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'text-green-600';
      case 'parent': return 'text-blue-600';
      case 'child': return 'text-purple-600';
      case 'sibling': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Enhanced Job Matching Demo</h1>
      
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Demo Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Candidate ID</label>
            <input
              type="text"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter candidate ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Min Category Score</label>
            <input
              type="number"
              value={minCategoryScore}
              onChange={(e) => setMinCategoryScore(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="detailedMatching"
              checked={detailedMatching}
              onChange={(e) => setDetailedMatching(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="detailedMatching" className="text-sm font-medium">
              Enable Detailed Matching
            </label>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={createDemoCandidate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Demo Candidate
          </button>
          
          <button
            onClick={fetchMatches}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Matches'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Match Statistics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalMatches}</div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.averageScore}%</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.topCategories.length}</div>
              <div className="text-sm text-gray-600">Categories Matched</div>
            </div>
          </div>
          
          {statistics.topCategories.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Top Categories</h3>
              <div className="space-y-2">
                {statistics.topCategories.map((category) => (
                  <div key={category.categoryId} className="flex justify-between items-center">
                    <span className="text-sm">{category.categoryName}</span>
                    <span className="text-sm font-medium">{category.matchCount} matches</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="text-red-800">Error: {error}</div>
        </div>
      )}

      {/* Matches */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Job Matches ({matches.length})
        </h2>
        
        {matches.length === 0 && !loading && !error && (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-gray-600">No matches found for this candidate.</div>
            <div className="text-sm text-gray-500 mt-2">
              Try creating a demo candidate or adjusting the filters.
            </div>
          </div>
        )}

        {error && matches.length === 0 && !loading && (
          <div className="bg-blue-50 rounded-lg p-8 text-center">
            <div className="text-blue-800 font-medium mb-2">Getting Started</div>
            <div className="text-blue-600 mb-4">
              To test the enhanced matching system, you need to create a demo candidate first.
            </div>
            <button
              onClick={createDemoCandidate}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Demo Candidate
            </button>
          </div>
        )}
        
        {matches.map((match) => (
          <div key={match.vacante.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{match.vacante.title}</h3>
                <p className="text-gray-600">{match.vacante.company} - {match.vacante.branchName}</p>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  match.color === 'green' ? 'text-green-600' :
                  match.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {match.score}%
                </div>
                <div className="text-sm text-gray-500">{match.percentage} match</div>
              </div>
            </div>
            
            {/* Match Factors */}
            {match.matchFactors && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Match Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Location</div>
                    <div className="font-medium">{Math.round(match.matchFactors.locationScore)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Category</div>
                    <div className="font-medium">{Math.round(match.matchFactors.categoryScore)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Experience</div>
                    <div className="font-medium">{Math.round(match.matchFactors.experienceScore)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Skills</div>
                    <div className="font-medium">{Math.round(match.matchFactors.skillsScore)}%</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Category Matches */}
            {match.categoryMatches && match.categoryMatches.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Category Matches</h4>
                <div className="space-y-1">
                  {match.categoryMatches.map((catMatch, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{catMatch.categoryName}</span>
                      <span className={`font-medium ${getMatchTypeColor(catMatch.matchType)}`}>
                        {catMatch.matchType} ({Math.round(catMatch.matchScore * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Match Reasons */}
            {match.matchReasons && match.matchReasons.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Why This Matches</h4>
                <div className="flex flex-wrap gap-2">
                  {match.matchReasons.map((reason, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Vacancy Categories */}
            {match.vacante.categories && match.vacante.categories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-semibold mb-2">Job Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {match.vacante.categories.map((category) => (
                    <span
                      key={category.id}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}