"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface FirestorePermissionErrorProps {
  onRetry?: () => void;
  userEmail?: string;
}

export default function FirestorePermissionError({ 
  onRetry, 
  userEmail 
}: FirestorePermissionErrorProps) {
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-2xl">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-semibold text-red-900">
          Error de configuración
        </h3>
      </div>
      
      <div className="space-y-3 text-sm text-red-800">
        <p>
          No se pudo crear tu perfil de usuario debido a un problema de permisos en la base de datos.
        </p>
        
        <div className="bg-red-100 p-3 rounded-lg">
          <p className="font-medium mb-1">Para el administrador:</p>
          <p className="text-xs">
            Es necesario configurar las reglas de seguridad de Firestore. 
            Consulta el archivo <code>deploy-firestore-rules.md</code> para instrucciones.
          </p>
        </div>
        
        {userEmail && (
          <p>
            <strong>Usuario afectado:</strong> {userEmail}
          </p>
        )}
        
        <div className="flex gap-2 mt-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
          )}
          
          <a
            href="mailto:soporte@routejob.com?subject=Error de permisos Firestore"
            className="px-4 py-2 border border-red-300 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  );
}