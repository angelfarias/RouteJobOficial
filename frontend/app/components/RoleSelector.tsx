"use client";

import { useState } from "react";
import { User, Building2, ArrowRight, Loader2 } from "lucide-react";
import { ProfileType } from "../../lib/types/unified-email.types";

export interface RoleSelectorProps {
  availableRoles: ProfileType[];
  recommendedRole?: ProfileType | null;
  onRoleSelect: (role: ProfileType) => Promise<void>;
  onSkip?: () => void;
  title?: string;
  subtitle?: string;
  showSkip?: boolean;
  isLoading?: boolean;
}

export default function RoleSelector({
  availableRoles,
  recommendedRole,
  onRoleSelect,
  onSkip,
  title = "Selecciona tu rol",
  subtitle = "Elige cómo quieres usar la plataforma",
  showSkip = false,
  isLoading = false
}: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<ProfileType | null>(recommendedRole || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = async (role: ProfileType) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onRoleSelect(role);
    } catch (error) {
      console.error('Error selecting role:', error);
      // Optionally show error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleInfo = (role: ProfileType) => {
    if (role === 'candidate') {
      return {
        icon: <User className="w-8 h-8" />,
        title: 'Candidato',
        description: 'Buscar empleos, crear CV y postular a vacantes',
        features: [
          'Buscar y filtrar empleos',
          'Crear y gestionar tu CV',
          'Postular a vacantes',
          'Seguimiento de aplicaciones',
          'Smart Match con IA'
        ],
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-600',
        hoverColor: 'hover:bg-emerald-100'
      };
    } else {
      return {
        icon: <Building2 className="w-8 h-8" />,
        title: 'Empresa',
        description: 'Publicar empleos, gestionar candidatos y encontrar talento',
        features: [
          'Publicar ofertas de empleo',
          'Gestionar candidatos',
          'Revisar aplicaciones',
          'Proceso de selección',
          'Analytics de contratación'
        ],
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-600',
        hoverColor: 'hover:bg-blue-100'
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-600">Cargando roles disponibles...</p>
      </div>
    );
  }

  if (!availableRoles.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">
          No hay perfiles disponibles
        </h3>
        <p className="text-zinc-600 mb-6">
          Necesitas crear un perfil para continuar usando la plataforma.
        </p>
        <button
          onClick={() => window.location.href = '/register-type'}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          Crear perfil
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">{title}</h2>
        <p className="text-zinc-600">{subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {availableRoles.map((role) => {
          const roleInfo = getRoleInfo(role);
          const isRecommended = role === recommendedRole;
          const isSelected = role === selectedRole;

          return (
            <div
              key={role}
              className={`
                relative p-6 rounded-xl border-2 transition-all cursor-pointer
                ${isSelected 
                  ? `${roleInfo.borderColor} ${roleInfo.bgColor} ring-2 ring-offset-2 ring-${roleInfo.color}-500/20` 
                  : `border-zinc-200 bg-white hover:border-zinc-300 ${roleInfo.hoverColor}`
                }
              `}
              onClick={() => setSelectedRole(role)}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-full">
                    Recomendado
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className={`
                  p-3 rounded-lg ${roleInfo.bgColor} ${roleInfo.textColor}
                `}>
                  {roleInfo.icon}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    {roleInfo.title}
                  </h3>
                  <p className="text-sm text-zinc-600">
                    {roleInfo.description}
                  </p>
                </div>

                {isSelected && (
                  <div className={`
                    w-6 h-6 rounded-full ${roleInfo.bgColor} ${roleInfo.textColor} 
                    flex items-center justify-center
                  `}>
                    <div className="w-3 h-3 bg-current rounded-full"></div>
                  </div>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {roleInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelect(role);
                }}
                disabled={isSubmitting}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                  ${isSelected
                    ? `bg-${roleInfo.color}-600 text-white hover:bg-${roleInfo.color}-700`
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continuar como {roleInfo.title}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {showSkip && onSkip && (
        <div className="text-center mt-8">
          <button
            onClick={onSkip}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Saltar por ahora
          </button>
        </div>
      )}
    </div>
  );
}