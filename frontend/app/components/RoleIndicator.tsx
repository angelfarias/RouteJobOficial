"use client";

import { User, Building2, Crown } from "lucide-react";
import { ProfileType } from "../../lib/types/unified-email.types";

export interface RoleIndicatorProps {
  currentRole: ProfileType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'pill' | 'minimal';
  className?: string;
}

export default function RoleIndicator({
  currentRole,
  showLabel = true,
  size = 'md',
  variant = 'badge',
  className = ""
}: RoleIndicatorProps) {
  const getRoleConfig = (role: ProfileType) => {
    if (role === 'candidate') {
      return {
        icon: User,
        label: 'Candidato',
        shortLabel: 'C',
        colors: {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          accent: 'bg-emerald-500'
        }
      };
    } else {
      return {
        icon: Building2,
        label: 'Empresa',
        shortLabel: 'E',
        colors: {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          accent: 'bg-blue-500'
        }
      };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          dot: 'w-2 h-2'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'w-5 h-5',
          dot: 'w-3 h-3'
        };
      default: // md
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'w-4 h-4',
          dot: 'w-2.5 h-2.5'
        };
    }
  };

  const roleConfig = getRoleConfig(currentRole);
  const sizeClasses = getSizeClasses();
  const IconComponent = roleConfig.icon;

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${roleConfig.colors.accent} ${sizeClasses.dot} rounded-full`}></div>
        {showLabel && (
          <span className={`font-medium ${roleConfig.colors.text} ${sizeClasses.container.split(' ')[2]}`}>
            {roleConfig.label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`
        inline-flex items-center gap-2 rounded-full border
        ${roleConfig.colors.bg} ${roleConfig.colors.text} ${roleConfig.colors.border}
        ${sizeClasses.container} ${className}
      `}>
        <IconComponent className={sizeClasses.icon} />
        {showLabel && (
          <span className="font-medium">{roleConfig.label}</span>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <div className={`
      inline-flex items-center gap-2 rounded-lg border
      ${roleConfig.colors.bg} ${roleConfig.colors.text} ${roleConfig.colors.border}
      ${sizeClasses.container} ${className}
    `}>
      <IconComponent className={sizeClasses.icon} />
      {showLabel && (
        <span className="font-medium">{roleConfig.label}</span>
      )}
    </div>
  );
}

// Additional component for role status in headers/navigation
export function RoleStatusBadge({ 
  currentRole, 
  className = "" 
}: { 
  currentRole: ProfileType; 
  className?: string; 
}) {
  const roleConfig = getRoleConfig(currentRole);
  
  return (
    <div className={`
      flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
      ${roleConfig.colors.bg} ${roleConfig.colors.text}
      ${className}
    `}>
      <div className={`w-2 h-2 rounded-full ${roleConfig.colors.accent}`}></div>
      <span>{roleConfig.label}</span>
    </div>
  );
}

// Component for showing role hierarchy (if user has admin/special roles)
export function RoleHierarchy({ 
  roles, 
  currentRole, 
  className = "" 
}: { 
  roles: ProfileType[]; 
  currentRole: ProfileType; 
  className?: string; 
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {roles.map((role, index) => {
        const isActive = role === currentRole;
        const roleConfig = getRoleConfig(role);
        
        return (
          <div key={role} className="flex items-center gap-1">
            <div className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center
              ${isActive 
                ? `${roleConfig.colors.accent} border-white text-white` 
                : `${roleConfig.colors.bg} ${roleConfig.colors.border} ${roleConfig.colors.text}`
              }
            `}>
              <roleConfig.icon className="w-3 h-3" />
            </div>
            
            {index < roles.length - 1 && (
              <div className="w-2 h-0.5 bg-zinc-300"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getRoleConfig(role: ProfileType) {
  if (role === 'candidate') {
    return {
      icon: User,
      label: 'Candidato',
      shortLabel: 'C',
      colors: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        accent: 'bg-emerald-500'
      }
    };
  } else {
    return {
      icon: Building2,
      label: 'Empresa',
      shortLabel: 'E',
      colors: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        accent: 'bg-blue-500'
      }
    };
  }
}