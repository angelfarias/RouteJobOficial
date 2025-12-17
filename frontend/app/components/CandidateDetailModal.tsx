"use client";

import { useState } from 'react';
import { ApplicationWithCandidate, CandidateDetails } from '@/lib/types/candidate-selection.types';
import CandidateSelectionButton from './CandidateSelectionButton';

interface CandidateDetailModalProps {
  application: ApplicationWithCandidate;
  candidateDetails: CandidateDetails | null;
  loading: boolean;
  onClose: () => void;
  onSelectCandidate: (applicationId: string, selectedBy: string) => Promise<boolean>;
  companyId: string;
}

export default function CandidateDetailModal({
  application,
  candidateDetails,
  loading,
  onClose,
  onSelectCandidate,
  companyId
}: CandidateDetailModalProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectCandidate = async () => {
    setIsSelecting(true);
    try {
      // In a real app, this would come from the authenticated user
      const selectedBy = companyId; // Placeholder - should be actual user ID
      const success = await onSelectCandidate(application.id, selectedBy);
      if (success) {
        // Modal will be closed by parent component
      }
    } finally {
      setIsSelecting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha no disponible';
    
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        label: 'Pendiente'
      },
      selected: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        label: 'Seleccionado'
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        label: 'Rechazado'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Detalles del candidato
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Postulación recibida el {formatDate(application.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(application.status)}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
              <span className="ml-3 text-zinc-600">Cargando detalles del candidato...</span>
            </div>
          ) : candidateDetails ? (
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-3">
                      Información personal
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-600">Nombre</label>
                        <p className="text-zinc-900">{candidateDetails.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-600">Email</label>
                        <p className="text-zinc-900">{candidateDetails.email}</p>
                      </div>
                      {candidateDetails.phone && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-600">Teléfono</label>
                          <p className="text-zinc-900">{candidateDetails.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Completeness */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-600 mb-2">Estado del perfil</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        candidateDetails.profileCompleted ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm text-zinc-700">
                        {candidateDetails.profileCompleted ? 'Perfil completo' : 'Perfil incompleto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Location */}
                  {candidateDetails.location && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-600 mb-2">Ubicación</h4>
                      <p className="text-sm text-zinc-700">
                        Lat: {candidateDetails.location.latitude.toFixed(4)}, 
                        Lng: {candidateDetails.location.longitude.toFixed(4)}
                      </p>
                    </div>
                  )}

                  {/* Missing Information */}
                  {candidateDetails.missingFields && candidateDetails.missingFields.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-600 mb-2">Información faltante</h4>
                      <div className="space-y-1">
                        {candidateDetails.missingFields.map((field) => (
                          <span
                            key={field}
                            className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mr-2 mb-1"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Experience */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">
                  Experiencia laboral
                </h3>
                {candidateDetails.experience && candidateDetails.experience.length > 0 ? (
                  <div className="space-y-3">
                    {candidateDetails.experience.map((exp, index) => (
                      <div key={index} className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-zinc-900">{exp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 italic">No se ha registrado experiencia laboral</p>
                )}
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">
                  Habilidades
                </h3>
                {candidateDetails.skills && candidateDetails.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {candidateDetails.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium border border-emerald-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 italic">No se han registrado habilidades</p>
                )}
              </div>

              {/* Application Details */}
              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">
                  Detalles de la postulación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-zinc-600">ID de postulación</label>
                    <p className="text-zinc-900 font-mono">{application.id}</p>
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-600">Fecha de postulación</label>
                    <p className="text-zinc-900">{formatDate(application.createdAt)}</p>
                  </div>
                  {application.selectedAt && (
                    <>
                      <div>
                        <label className="block font-medium text-zinc-600">Fecha de selección</label>
                        <p className="text-zinc-900">{formatDate(application.selectedAt)}</p>
                      </div>
                      {application.selectedBy && (
                        <div>
                          <label className="block font-medium text-zinc-600">Seleccionado por</label>
                          <p className="text-zinc-900">{application.selectedBy}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                Error al cargar detalles
              </h3>
              <p className="text-zinc-600">
                No se pudieron cargar los detalles del candidato. Intenta de nuevo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Cerrar
          </button>
          
          {candidateDetails && application.status === 'pending' && (
            <CandidateSelectionButton
              application={application}
              onSelect={handleSelectCandidate}
              isSelecting={isSelecting}
            />
          )}
        </div>
      </div>
    </div>
  );
}