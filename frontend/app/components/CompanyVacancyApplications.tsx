"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebaseClient';
import { getApiUrl } from '@/lib/env';
import ApplicationsList from './ApplicationsList';
import CandidateDetailModal from './CandidateDetailModal';
import { ApplicationWithCandidate, CandidateDetails } from '@/lib/types/candidate-selection.types';

interface CompanyVacancyApplicationsProps {
  vacancyId: string;
  companyId: string;
  vacancyTitle?: string;
}

export default function CompanyVacancyApplications({
  vacancyId,
  companyId,
  vacancyTitle = 'Vacante'
}: CompanyVacancyApplicationsProps) {
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithCandidate | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<CandidateDetails | null>(null);
  const [loadingCandidate, setLoadingCandidate] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Load applications for the vacancy
  useEffect(() => {
    loadApplications();
  }, [vacancyId, companyId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/applications/vacancy/${vacancyId}`, {
        headers: {
          'x-company-id': companyId,
          'authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error loading applications: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok) {
        setApplications(data.applications || []);
      } else {
        throw new Error(data.error || 'Failed to load applications');
      }
    } catch (err) {
      console.error('Error loading applications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load applications';
      setError(errorMessage);
      setApplications([]);
      
      // Check if it's an authentication error
      if (errorMessage.includes('not authenticated') || errorMessage.includes('401')) {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewCandidate = async (application: ApplicationWithCandidate) => {
    try {
      setSelectedApplication(application);
      setLoadingCandidate(true);
      setShowCandidateModal(true);
      setCandidateDetails(null);

      // Get Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/applications/${application.id}/candidate?includeMissingInfo=true`, {
        headers: {
          'x-company-id': companyId,
          'authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error loading candidate details: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok) {
        setCandidateDetails(data.candidate);
      } else {
        throw new Error(data.error || 'Failed to load candidate details');
      }
    } catch (err) {
      console.error('Error loading candidate details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load candidate details');
    } finally {
      setLoadingCandidate(false);
    }
  };

  const handleSelectCandidate = async (applicationId: string, selectedBy: string) => {
    try {
      // Get Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/applications/${applicationId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId,
          'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedBy }),
      });

      if (!response.ok) {
        throw new Error(`Error selecting candidate: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok) {
        // Refresh applications list to show updated status
        await loadApplications();
        setShowCandidateModal(false);
        return true;
      } else {
        throw new Error(data.error || 'Failed to select candidate');
      }
    } catch (err) {
      console.error('Error selecting candidate:', err);
      setError(err instanceof Error ? err.message : 'Failed to select candidate');
      return false;
    }
  };

  const handleCloseModal = () => {
    setShowCandidateModal(false);
    setSelectedApplication(null);
    setCandidateDetails(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
          <span className="ml-3 text-zinc-600">Cargando postulaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">
          Postulaciones para: {vacancyTitle}
        </h2>
        <p className="text-sm text-zinc-600">
          {applications.length} {applications.length === 1 ? 'postulación encontrada' : 'postulaciones encontradas'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  {authError ? 'Error de autenticación' : 'Error'}
                </h3>
                <p className="text-sm text-red-700">{error}</p>
                {authError && (
                  <p className="text-xs text-red-600 mt-1">
                    Por favor, inicia sesión nuevamente para continuar.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                setAuthError(false);
                loadApplications();
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Applications List */}
      <ApplicationsList
        applications={applications}
        onViewCandidate={handleViewCandidate}
        onRefresh={loadApplications}
      />

      {/* Candidate Detail Modal */}
      {showCandidateModal && selectedApplication && (
        <CandidateDetailModal
          application={selectedApplication}
          candidateDetails={candidateDetails}
          loading={loadingCandidate}
          onClose={handleCloseModal}
          onSelectCandidate={handleSelectCandidate}
          companyId={companyId}
        />
      )}
    </div>
  );
}