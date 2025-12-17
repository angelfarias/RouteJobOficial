"use client";

import { useState } from "react";
import { User } from "firebase/auth";
import UnifiedAccountSettingsModal from "./UnifiedAccountSettingsModal";
import { ProfileManagementService } from "../../lib/services/profileManagement.service";
import { useRoleManager } from "../../lib/hooks/useRoleManager";

interface ProfileManagementExampleProps {
  user: User;
  onAccountDelete: () => Promise<void>;
}

/**
 * Example component showing how to integrate the enhanced account settings
 * with profile management capabilities for the unified email system
 */
export default function ProfileManagementExample({
  user,
  onAccountDelete
}: ProfileManagementExampleProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const {
    roleContext,
    refreshRoleContext
  } = useRoleManager(user.uid);

  const { currentRole, availableRoles } = roleContext;

  const handleProfileUpdate = async (data: any) => {
    setLoading(true);
    try {
      // Update Firebase user profile
      if (data.displayName !== user.displayName) {
        await user.updateProfile({ displayName: data.displayName });
      }
      
      if (data.email !== user.email) {
        await user.updateEmail(data.email);
      }

      setMessage('Perfil actualizado correctamente');
      
      // Refresh role context to get updated data
      await refreshRoleContext();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    setLoading(true);
    try {
      // Delete all profiles first
      for (const role of availableRoles) {
        await ProfileManagementService.deleteProfile(user.uid, role);
      }
      
      // Then delete the account
      await onAccountDelete();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Profile Management Dashboard */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">
              Gestión de perfiles
            </h2>
            <p className="text-zinc-600">
              Administra tus perfiles de candidato y empresa de forma independiente.
            </p>
          </div>

          <div className="p-6">
            {/* Current Status */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {/* Account Info */}
              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-medium text-zinc-900 mb-2">Cuenta general</h3>
                <div className="space-y-1 text-sm text-zinc-600">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Nombre:</strong> {user.displayName || 'No configurado'}</p>
                  <p><strong>Rol activo:</strong> {currentRole ? (currentRole === 'candidate' ? 'Candidato' : 'Empresa') : 'Ninguno'}</p>
                </div>
              </div>

              {/* Profile Status */}
              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-medium text-zinc-900 mb-2">Perfiles disponibles</h3>
                <div className="space-y-2">
                  {availableRoles.length === 0 ? (
                    <p className="text-sm text-zinc-500">No tienes perfiles creados</p>
                  ) : (
                    availableRoles.map(role => (
                      <div key={role} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          role === 'candidate' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}></div>
                        <span className="text-sm text-zinc-700">
                          {role === 'candidate' ? 'Perfil de candidato' : 'Perfil de empresa'}
                        </span>
                        {role === currentRole && (
                          <span className="text-xs bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">
                            Activo
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(true)}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Cargando...' : 'Configurar perfiles'}
              </button>

              {availableRoles.length === 0 && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Crear primer perfil
                </button>
              )}
            </div>

            {/* Status Message */}
            {message && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700">{message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Management Tips */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-medium text-emerald-900 mb-2">Perfil de candidato</h4>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>• Buscar y postular a empleos</li>
              <li>• Crear Smart CV con IA</li>
              <li>• Usar Smart Match geolocalizado</li>
              <li>• Gestionar aplicaciones</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Perfil de empresa</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Publicar ofertas de empleo</li>
              <li>• Gestionar candidatos</li>
              <li>• Administrar sucursales</li>
              <li>• Ver analytics de contratación</li>
            </ul>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Información importante</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Puedes tener ambos perfiles con el mismo email</li>
            <li>• Los datos de cada perfil se mantienen separados</li>
            <li>• Puedes cambiar entre roles en cualquier momento</li>
            <li>• Eliminar un perfil no afecta al otro</li>
            <li>• Si eliminas tu último perfil, se te ofrecerá eliminar toda la cuenta</li>
          </ul>
        </div>
      </div>

      {/* Enhanced Account Settings Modal */}
      <UnifiedAccountSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setMessage('');
        }}
        user={user}
        onProfileUpdate={handleProfileUpdate}
        onAccountDelete={handleAccountDelete}
      />
    </div>
  );
}