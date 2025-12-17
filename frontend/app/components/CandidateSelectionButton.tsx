"use client";

import { useState } from 'react';
import { ApplicationWithCandidate } from '@/lib/types/candidate-selection.types';

interface CandidateSelectionButtonProps {
  application: ApplicationWithCandidate;
  onSelect: () => Promise<void>;
  isSelecting: boolean;
}

export default function CandidateSelectionButton({
  application,
  onSelect,
  isSelecting
}: CandidateSelectionButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmSelection = async () => {
    setShowConfirmation(false);
    await onSelect();
  };

  if (application.status === 'selected') {
    return (
      <div className="flex items-center gap-2 text-green-700">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">Candidato seleccionado</span>
      </div>
    );
  }

  if (application.status === 'rejected') {
    return (
      <div className="flex items-center gap-2 text-red-700">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">Candidato rechazado</span>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-zinc-700">
          ¿Seleccionar a {application.candidateName}?
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleConfirmSelection}
            disabled={isSelecting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSelecting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Seleccionando...
              </div>
            ) : (
              'Confirmar'
            )}
          </button>
          <button
            onClick={() => setShowConfirmation(false)}
            disabled={isSelecting}
            className="border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirmation(true)}
      className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-500 transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Seleccionar candidato
    </button>
  );
}