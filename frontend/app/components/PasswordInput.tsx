"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  name?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  className?: string;
  hasError?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PasswordInput({
  name = "password",
  placeholder = "Contraseña",
  value,
  onChange,
  onFocus,
  className = "",
  hasError = false,
  required = false,
  size = 'md'
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-2 pr-10 text-sm',
    md: 'px-4 py-2.5 pr-10 text-sm',
    lg: 'px-4 py-3 pr-12 text-base'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const baseClasses = `w-full bg-white/60 backdrop-blur-sm border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all hover:border-zinc-300 ${sizeClasses[size]}`;
  
  const errorClasses = hasError 
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500/60' 
    : 'border-zinc-200 focus:ring-emerald-500 focus:border-emerald-500/60';

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        className={`${baseClasses} ${errorClasses} ${className}`}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
        tabIndex={-1}
        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {showPassword ? (
          <EyeOff className={iconSizes[size]} />
        ) : (
          <Eye className={iconSizes[size]} />
        )}
      </button>
    </div>
  );
}