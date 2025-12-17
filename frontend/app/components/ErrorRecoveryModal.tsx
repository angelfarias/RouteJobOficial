"use client";

import { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Clock,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { ErrorInfo, ErrorRecoveryPlan, RecoveryAction } from '../../lib/services/errorHandling.service';

interface ErrorRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorInfo: ErrorInfo;
  recoveryPlan: ErrorRecoveryPlan;
  onExecuteAction: (action: RecoveryAction) => Promise<void>;
  isRecovering: boolean;
}

export default function ErrorRecoveryModal({
  isOpen,
  onClose,
  errorInfo,
  recoveryPlan,
  onExecuteAction,
  isRecovering
}: ErrorRecoveryModalProps) {
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!isOpen) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-red-800 bg-red-200';
      default: return 'text-zinc-600 bg-zinc-100';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'retry': return <RefreshCw className="w-4 h-4" />;
      case 'redirect': return <ExternalLink className="w-4 h-4" />;
      case 'refresh': return <RefreshCw className="w-4 h-4" />;
      case 'logout': return <XCircle className="w-4 h-4" />;
      case 'manual': return <Info className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'retry': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'redirect': return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'refresh': return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'logout': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'manual': return 'bg-zinc-600 hover:bg-zinc-700 text-white';
      default: return 'bg-zinc-600 hover:bg-zinc-700 text-white';
    }
  };

  const handleActionClick = async (action: RecoveryAction) => {
    if (action.requiresConfirmation && !confirm(`¿Estás seguro de que deseas ${action.label.toLowerCase()}?`)) {
      return;
    }

    setSelectedAction(action);
    try {
      await onExecuteAction(action);
    } catch (error) {
      console.error('Error executing recovery action:', error);
    } finally {
      setSelectedAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSeverityColor(errorInfo.severity)}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Error detectado
              </h2>
              <p className="text-sm text-zinc-500 capitalize">
                Severidad: {errorInfo.severity}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error Message */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-900 mb-2">
              Descripción del problema
            </h3>
            <p className="text-zinc-700 bg-zinc-50 rounded-lg p-3">
              {recoveryPlan.userMessage}
            </p>
          </div>

          {/* Recovery Time Estimate */}
          {recoveryPlan.estimatedRecoveryTime && (
            <div className="mb-6 flex items-center gap-2 text-sm text-zinc-600">
              <Clock className="w-4 h-4" />
              <span>
                Tiempo estimado de recuperación: {Math.ceil(recoveryPlan.estimatedRecoveryTime / 1000)} segundos
              </span>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-900 mb-3">
              Acciones de recuperación
            </h3>
            <div className="space-y-3">
              {recoveryPlan.actions.map((action, index) => (
                <div
                  key={index}
                  className="border border-zinc-200 rounded-lg p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionIcon(action.type)}
                        <span className="font-medium text-zinc-900">
                          {action.label}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">
                        {action.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleActionClick(action)}
                      disabled={isRecovering}
                      className={`ml-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${getActionColor(action.type)}`}
                    >
                      {isRecovering && selectedAction === action ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Ejecutando...
                        </div>
                      ) : (
                        action.label
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Details Toggle */}
          <div className="border-t border-zinc-200 pt-4">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <Info className="w-4 h-4" />
              {showTechnicalDetails ? 'Ocultar' : 'Mostrar'} detalles técnicos
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 p-3 bg-zinc-100 rounded-lg">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium">Código de error:</span> {errorInfo.code}
                  </div>
                  <div>
                    <span className="font-medium">Mensaje técnico:</span> {errorInfo.message}
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span> {errorInfo.timestamp.toISOString()}
                  </div>
                  <div>
                    <span className="font-medium">Reintentable:</span> {errorInfo.retryable ? 'Sí' : 'No'}
                  </div>
                  {errorInfo.context && (
                    <div>
                      <span className="font-medium">Contexto:</span>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(errorInfo.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-200 bg-zinc-50">
          <div className="text-sm text-zinc-600">
            {recoveryPlan.canRecover ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Recuperación automática disponible
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Requiere intervención manual
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-lg hover:bg-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}