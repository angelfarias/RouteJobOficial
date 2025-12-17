"use client";

import { PasswordValidator, PasswordValidationResult } from "@/lib/validation/passwordValidator";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export default function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true,
  className = "" 
}: PasswordStrengthIndicatorProps) {
  const validation: PasswordValidationResult = useMemo(() => {
    return PasswordValidator.validateStrength(password);
  }, [password]);

  const requirements = PasswordValidator.getRequirements();

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600">Fortaleza de contraseña</span>
          <span className={PasswordValidator.getStrengthColor(validation.score)}>
            {PasswordValidator.getStrengthLabel(validation.score)}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                validation.score >= level
                  ? validation.score >= 4
                    ? 'bg-green-500'
                    : validation.score >= 3
                    ? 'bg-emerald-500'
                    : validation.score >= 2
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                  : 'bg-zinc-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Feedback Messages */}
      {validation.feedback.length > 0 && (
        <div className="space-y-1">
          {validation.feedback.map((message, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs ${
                index === 0 
                  ? validation.isValid 
                    ? 'text-green-600' 
                    : 'text-zinc-600'
                  : 'text-zinc-500'
              }`}
            >
              {index === 0 && (
                validation.isValid ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-zinc-400" />
                )
              )}
              <span>{message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 font-medium">Requisitos:</div>
          {requirements.map((requirement) => {
            const isMet = requirement.regex.test(password);
            return (
              <div
                key={requirement.id}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  isMet ? 'text-green-600' : 'text-zinc-400'
                }`}
              >
                {isMet ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-zinc-300" />
                )}
                <span>{requirement.description}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}