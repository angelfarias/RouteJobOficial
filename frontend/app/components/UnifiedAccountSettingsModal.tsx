"use client";

import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Trash2, 
  AlertTriangle, 
  Plus,
  Edit3,
  Save,
  Settings,
  Shield
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { ProfileType, CandidateProfile, CompanyProfile } from '../../lib/types/unified-email.types';
import { useRoleManager } from '../../lib/hooks/useRoleManager';

interface UnifiedAccountSettingsModalProps {
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

interface CandidateProfileData {
  personalInfo: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  };
  professionalInfo: {
    title?: string;
    experience?: string;
    skills: string[];
  };
  preferences: {
    jobTypes: string[];
    locations: string[];
    salaryRange?: {
      min: number;
      max: number;
    };
  };
}

interface CompanyProfileData {
  companyInfo: {
    name: string;
    description?: string;
    industry?: string;
    size?: string;
    website?: string;
  };
  contactInfo: {
    contactPerson: string;
    phone?: string;
    address?: string;
  };
}

type TabType = 'account' | 'candidate' | 'company' | 'security';

export default function UnifiedAccountSettingsModal({
  isOpen,
  onClose,
  user,
  onProfileUpdate,
  onAccountDelete
}: UnifiedAccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{
    type: 'account' | 'candidate' | 'company' | null;
    profileType?: ProfileType;
  }>({ type: null });
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  
  const {
    roleContext,
    switchRole,
    refreshRoleContext
  } = useRoleManager(user.uid);

  const { currentRole, availableRoles } = roleContext;

  // Profile data states
  const [accountData, setAccountData] = useState<ProfileUpdateData>({
    displayName: user.displayName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
  });

  const [candidateData, setCandidateData] = useState<CandidateProfileData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      phone: '',
      location: ''
    },
    professionalInfo: {
      title: '',
      experience: '',
      skills: []
    },
    preferences: {
      jobTypes: [],
      locations: []
    }
  });

  const [companyData, setCompanyData] = useState<CompanyProfileData>({
    companyInfo: {
      name: '',
      description: '',
      industry: '',
      size: '',
      website: ''
    },
    contactInfo: {
      contactPerson: '',
      phone: '',
      address: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load profile data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProfileData();
      setErrors({});
      setSuccessMessage('');
      setShowDeleteConfirmation({ type: null });
      setDeleteConfirmationText('');
    }
  }, [isOpen, user]);

  const loadProfileData = async () => {
    try {
      // Load account data
      setAccountData({
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
      });

      // Load candidate profile if exists
      if (availableRoles.includes('candidate')) {
        // TODO: Load candidate profile from API
        // const candidateProfile = await getCandidateProfile(user.uid);
        // setCandidateData(candidateProfile);
      }

      // Load company profile if exists
      if (availableRoles.includes('company')) {
        // TODO: Load company profile from API
        // const companyProfile = await getCompanyProfile(user.uid);
        // setCompanyData(companyProfile);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const handleAccountUpdate = async () => {
    setLoading(true);
    setSuccessMessage('');

    try {
      await onProfileUpdate(accountData);
      setSuccessMessage('Información de cuenta actualizada correctamente');
    } catch (error) {
      console.error('Error updating account:', error);
      setErrors({ account: 'Error al actualizar la cuenta. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (profileType: ProfileType) => {
    setLoading(true);
    try {
      // TODO: Implement profile creation API call
      if (profileType === 'candidate') {
        // await createCandidateProfile(user.uid, candidateData);
      } else {
        // await createCompanyProfile(user.uid, companyData);
      }
      
      await refreshRoleContext();
      setSuccessMessage(`Perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'} creado exitosamente`);
    } catch (error) {
      console.error('Error creating profile:', error);
      setErrors({ [profileType]: 'Error al crear el perfil. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (profileType: ProfileType) => {
    setLoading(true);
    try {
      // TODO: Implement profile update API call
      if (profileType === 'candidate') {
        // await updateCandidateProfile(user.uid, candidateData);
      } else {
        // await updateCompanyProfile(user.uid, companyData);
      }
      
      setSuccessMessage(`Perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'} actualizado correctamente`);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ [profileType]: 'Error al actualizar el perfil. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileType: ProfileType) => {
    if (deleteConfirmationText !== 'ELIMINAR') return;

    setLoading(true);
    try {
      // TODO: Implement profile deletion API call
      // await deleteProfile(user.uid, profileType);
      
      await refreshRoleContext();
      
      // If this was the last profile, offer to delete account
      if (availableRoles.length === 1) {
        setShowDeleteConfirmation({ type: 'account' });
        setSuccessMessage('Último perfil eliminado. ¿Deseas eliminar toda la cuenta?');
      } else {
        setSuccessMessage(`Perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'} eliminado correctamente`);
        setShowDeleteConfirmation({ type: null });
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      setErrors({ [profileType]: 'Error al eliminar el perfil. Intenta nuevamente.' });
    } finally {
      setLoading(false);
      setDeleteConfirmationText('');
    }
  };

  const handleAccountDelete = async () => {
    if (deleteConfirmationText !== 'ELIMINAR') return;

    setLoading(true);
    try {
      await onAccountDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting account:', error);
      setErrors({ account: 'Error al eliminar la cuenta. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasCandidate = availableRoles.includes('candidate');
  const hasCompany = availableRoles.includes('company');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
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
        <div className="flex border-b border-zinc-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'account'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Cuenta general
          </button>
          
          <button
            onClick={() => setActiveTab('candidate')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'candidate'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <User className="w-4 h-4" />
            Perfil candidato
            {!hasCandidate && <Plus className="w-3 h-3 text-zinc-400" />}
          </button>
          
          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'company'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Perfil empresa
            {!hasCompany && <Plus className="w-3 h-3 text-zinc-400" />}
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Seguridad
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">{successMessage}</p>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <AccountTab
              accountData={accountData}
              setAccountData={setAccountData}
              errors={errors}
              loading={loading}
              onUpdate={handleAccountUpdate}
            />
          )}

          {/* Candidate Tab */}
          {activeTab === 'candidate' && (
            <CandidateTab
              hasProfile={hasCandidate}
              candidateData={candidateData}
              setCandidateData={setCandidateData}
              errors={errors}
              loading={loading}
              onCreateProfile={() => handleCreateProfile('candidate')}
              onUpdateProfile={() => handleUpdateProfile('candidate')}
              onDeleteProfile={() => setShowDeleteConfirmation({ type: 'candidate', profileType: 'candidate' })}
            />
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <CompanyTab
              hasProfile={hasCompany}
              companyData={companyData}
              setCompanyData={setCompanyData}
              errors={errors}
              loading={loading}
              onCreateProfile={() => handleCreateProfile('company')}
              onUpdateProfile={() => handleUpdateProfile('company')}
              onDeleteProfile={() => setShowDeleteConfirmation({ type: 'company', profileType: 'company' })}
            />
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <SecurityTab
              availableRoles={availableRoles}
              onDeleteAccount={() => setShowDeleteConfirmation({ type: 'account' })}
            />
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation.type && (
          <DeleteConfirmationModal
            type={showDeleteConfirmation.type}
            profileType={showDeleteConfirmation.profileType}
            confirmationText={deleteConfirmationText}
            setConfirmationText={setDeleteConfirmationText}
            loading={loading}
            onConfirm={
              showDeleteConfirmation.type === 'account' 
                ? handleAccountDelete 
                : () => handleDeleteProfile(showDeleteConfirmation.profileType!)
            }
            onCancel={() => {
              setShowDeleteConfirmation({ type: null });
              setDeleteConfirmationText('');
            }}
          />
        )}
      </div>
    </div>
  );
}

// Account Tab Component
function AccountTab({ 
  accountData, 
  setAccountData, 
  errors, 
  loading, 
  onUpdate 
}: {
  accountData: ProfileUpdateData;
  setAccountData: (data: ProfileUpdateData) => void;
  errors: Record<string, string>;
  loading: boolean;
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">
          Información general de la cuenta
        </h3>
        <p className="text-sm text-zinc-600 mb-6">
          Esta información se comparte entre todos tus perfiles.
        </p>
      </div>

      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={accountData.displayName || ''}
              onChange={(e) => setAccountData({ ...accountData, displayName: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Tu nombre completo"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="email"
              value={accountData.email || ''}
              onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Teléfono (opcional)
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="tel"
              value={accountData.phoneNumber || ''}
              onChange={(e) => setAccountData({ ...accountData, phoneNumber: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="+34 123 456 789"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onUpdate}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// Candidate Tab Component
function CandidateTab({
  hasProfile,
  candidateData,
  setCandidateData,
  errors,
  loading,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}: {
  hasProfile: boolean;
  candidateData: CandidateProfileData;
  setCandidateData: (data: CandidateProfileData) => void;
  errors: Record<string, string>;
  loading: boolean;
  onCreateProfile: () => void;
  onUpdateProfile: () => void;
  onDeleteProfile: () => void;
}) {
  if (!hasProfile) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">
          Crear perfil de candidato
        </h3>
        <p className="text-zinc-600 mb-6">
          Crea tu perfil de candidato para buscar empleos y postular a vacantes.
        </p>
        <button
          onClick={onCreateProfile}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Creando...' : 'Crear perfil de candidato'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            Perfil de candidato
          </h3>
          <p className="text-sm text-zinc-600">
            Información específica para búsqueda de empleo.
          </p>
        </div>
        <button
          onClick={onDeleteProfile}
          className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4 inline mr-2" />
          Eliminar perfil
        </button>
      </div>

      {/* Candidate profile form fields would go here */}
      <div className="bg-zinc-50 rounded-lg p-4">
        <p className="text-sm text-zinc-600">
          Formulario de perfil de candidato (implementar campos específicos)
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onUpdateProfile}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// Company Tab Component
function CompanyTab({
  hasProfile,
  companyData,
  setCompanyData,
  errors,
  loading,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}: {
  hasProfile: boolean;
  companyData: CompanyProfileData;
  setCompanyData: (data: CompanyProfileData) => void;
  errors: Record<string, string>;
  loading: boolean;
  onCreateProfile: () => void;
  onUpdateProfile: () => void;
  onDeleteProfile: () => void;
}) {
  if (!hasProfile) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">
          Crear perfil de empresa
        </h3>
        <p className="text-zinc-600 mb-6">
          Crea tu perfil de empresa para publicar empleos y gestionar candidatos.
        </p>
        <button
          onClick={onCreateProfile}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Creando...' : 'Crear perfil de empresa'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            Perfil de empresa
          </h3>
          <p className="text-sm text-zinc-600">
            Información específica para gestión de empleos y candidatos.
          </p>
        </div>
        <button
          onClick={onDeleteProfile}
          className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4 inline mr-2" />
          Eliminar perfil
        </button>
      </div>

      {/* Company profile form fields would go here */}
      <div className="bg-zinc-50 rounded-lg p-4">
        <p className="text-sm text-zinc-600">
          Formulario de perfil de empresa (implementar campos específicos)
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onUpdateProfile}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab({
  availableRoles,
  onDeleteAccount
}: {
  availableRoles: ProfileType[];
  onDeleteAccount: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">
          Seguridad y eliminación de cuenta
        </h3>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Perfiles activos</h4>
            <p className="text-sm text-amber-700 mt-1">
              Tienes {availableRoles.length} perfil(es) activo(s): {availableRoles.join(', ')}.
              Puedes eliminar perfiles individuales desde sus respectivas pestañas.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Eliminar cuenta completa</h4>
            <p className="text-sm text-red-700 mt-1">
              Esta acción eliminará permanentemente tu cuenta y todos los perfiles asociados. 
              No podrás recuperar esta información una vez eliminada.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onDeleteAccount}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Eliminar cuenta completa
        </button>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  type,
  profileType,
  confirmationText,
  setConfirmationText,
  loading,
  onConfirm,
  onCancel
}: {
  type: 'account' | 'candidate' | 'company';
  profileType?: ProfileType;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const getTitle = () => {
    if (type === 'account') return 'Eliminar cuenta completa';
    return `Eliminar perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'}`;
  };

  const getDescription = () => {
    if (type === 'account') {
      return 'Esta acción eliminará permanentemente tu cuenta y todos los datos asociados.';
    }
    return `Esta acción eliminará permanentemente tu perfil de ${profileType === 'candidate' ? 'candidato' : 'empresa'}.`;
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">
            {getTitle()}
          </h3>
        </div>

        <p className="text-sm text-zinc-600 mb-6">
          {getDescription()}
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Para confirmar, escribe "ELIMINAR":
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="ELIMINAR"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmationText !== 'ELIMINAR' || loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}