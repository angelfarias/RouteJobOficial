"use client";

import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Trash2, AlertTriangle } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { EmailValidator, FormValidator } from '@/lib/validation';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  onProfileUpdate: (data: ProfileUpdateData) => Promise<void>;
  onAccountDelete: () => Promise<void>;
}

interface ProfileUpdateData {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
}

interface FormErrors {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onProfileUpdate,
  onAccountDelete
}: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  
  // Profile form state
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    displayName: user.displayName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProfileData({
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
      });
      setErrors({});
      setSuccessMessage('');
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
    }
  }, [isOpen, user]);

  const validateProfileForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate display name
    if (!profileData.displayName?.trim()) {
      newErrors.displayName = 'El nombre es requerido';
    } else if (profileData.displayName.trim().length < 2) {
      newErrors.displayName = 'El nombre debe tener al menos 2 caracteres';
    } else if (profileData.displayName.trim().length > 100) {
      newErrors.displayName = 'El nombre es demasiado largo';
    }

    // Validate email
    if (!profileData.email?.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else {
      const emailValidation = EmailValidator.validateFormat(profileData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Formato de correo inválido';
      }
    }

    // Validate phone number (optional)
    if (profileData.phoneNumber && profileData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(profileData.phoneNumber.trim())) {
        newErrors.phoneNumber = 'Formato de teléfono inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileUpdate = async () => {
    if (!validateProfileForm()) return;

    setLoading(true);
    setSuccessMessage('');

    try {
      await onProfileUpdate({
        displayName: profileData.displayName?.trim(),
        email: profileData.email?.trim(),
        phoneNumber: profileData.phoneNumber?.trim() || undefined,
      });
      
      setSuccessMessage('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ 
        email: 'Error al actualizar el perfil. Intenta nuevamente.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    if (deleteConfirmationText !== 'ELIMINAR') {
      return;
    }

    setLoading(true);
    try {
      await onAccountDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900">
            Configuración de cuenta
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Información personal
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'account'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            Gestión de cuenta
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700">{successMessage}</p>
                </div>
              )}

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={profileData.displayName || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                      errors.displayName ? 'border-red-300' : 'border-zinc-300'
                    }`}
                    placeholder="Tu nombre completo"
                  />
                </div>
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={profileData.email || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                      errors.email ? 'border-red-300' : 'border-zinc-300'
                    }`}
                    placeholder="tu@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Número de teléfono (opcional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="tel"
                    value={profileData.phoneNumber || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                      errors.phoneNumber ? 'border-red-300' : 'border-zinc-300'
                    }`}
                    placeholder="+34 123 456 789"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                )}
              </div>

              {/* Update Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Actualizando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900">Eliminar cuenta</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Esta acción eliminará permanentemente tu cuenta y todos los datos asociados. 
                      No podrás recuperar esta información una vez eliminada.
                    </p>
                  </div>
                </div>
              </div>

              {!showDeleteConfirmation ? (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Eliminar mi cuenta
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Para confirmar, escribe "ELIMINAR" en el campo de abajo:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                      placeholder="ELIMINAR"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setShowDeleteConfirmation(false);
                        setDeleteConfirmationText('');
                      }}
                      className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAccountDelete}
                      disabled={deleteConfirmationText !== 'ELIMINAR' || loading}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {loading ? 'Eliminando...' : 'Eliminar cuenta'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}