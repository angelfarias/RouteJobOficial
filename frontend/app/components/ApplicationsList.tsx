"use client";

import { useState } from 'react';
import { ApplicationWithCandidate } from '@/lib/types/candidate-selection.types';

interface ApplicationsListProps {
  applications: ApplicationWithCandidate[];
  onViewCandidate: (application: ApplicationWithCandidate) => void;
  onRefresh: () => void;
}

type SortField = 'candidateName' | 'applicationDate' | 'status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'selected' | 'rejected';

export default function ApplicationsList({
  applications,
  onViewCandidate,
  onRefresh
}: ApplicationsListProps) {
  const [sortField, setSortField] = useState<SortField>('applicationDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filter applications by status
  const filteredApplications = applications.filter(app => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'candidateName':
        comparison = a.candidateName.localeCompare(b.candidateName);
        break;
      case 'applicationDate':
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        comparison = dateA - dateB;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha no disponible';
    
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl shadow-lg shadow-zinc-100">
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            No hay postulaciones
          </h3>
          <p className="text-zinc-600 mb-4">
            Aún no se han recibido postulaciones para esta vacante.
          </p>
          <button
            onClick={onRefresh}
            className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl shadow-lg shadow-zinc-100">
      {/* Filters and Controls */}
      <div className="p-6 border-b border-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Filtrar por estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Todos ({applications.length})</option>
                <option value="pending">
                  Pendientes ({applications.filter(a => a.status === 'pending').length})
                </option>
                <option value="selected">
                  Seleccionados ({applications.filter(a => a.status === 'selected').length})
                </option>
                <option value="rejected">
                  Rechazados ({applications.filter(a => a.status === 'rejected').length})
                </option>
              </select>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('candidateName')}
                  className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Candidato
                  {getSortIcon('candidateName')}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('applicationDate')}
                  className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Fecha de postulación
                  {getSortIcon('applicationDate')}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Estado
                  {getSortIcon('status')}
                </button>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-medium text-zinc-600">Perfil</span>
              </th>
              <th className="text-right p-4">
                <span className="text-xs font-medium text-zinc-600">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sortedApplications.map((application) => (
              <tr key={application.id} className="hover:bg-zinc-50 transition-colors">
                <td className="p-4">
                  <div>
                    <div className="font-medium text-zinc-900">
                      {application.candidateName}
                    </div>
                    <div className="text-sm text-zinc-600">
                      {application.candidateEmail}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-zinc-700">
                    {formatDate(application.createdAt)}
                  </div>
                </td>
                <td className="p-4">
                  {getStatusBadge(application.status)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      application.profileCompleted ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-xs text-zinc-600">
                      {application.profileCompleted ? 'Completo' : 'Incompleto'}
                    </span>
                  </div>
                  {application.skills && application.skills.length > 0 && (
                    <div className="mt-1">
                      <span className="text-xs text-zinc-500">
                        {application.skills.length} habilidad{application.skills.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onViewCandidate(application)}
                    className="inline-flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results Summary */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50">
        <p className="text-xs text-zinc-600">
          Mostrando {sortedApplications.length} de {applications.length} postulaciones
          {statusFilter !== 'all' && ` (filtradas por: ${statusFilter})`}
        </p>
      </div>
    </div>
  );
}