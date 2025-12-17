// Enhanced password validation utility
export interface PasswordRequirement {
  id: string;
  description: string;
  regex: RegExp;
  required: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 strength score
  missingRequirements: string[];
  feedback: string[];
}

export class PasswordValidator {
  private static readonly requirements: PasswordRequirement[] = [
    {
      id: 'length',
      description: 'Al menos 8 caracteres',
      regex: /.{8,}/,
      required: true
    },
    {
      id: 'lowercase',
      description: 'Al menos una letra minúscula',
      regex: /[a-z]/,
      required: true
    },
    {
      id: 'uppercase',
      description: 'Al menos una letra mayúscula',
      regex: /[A-Z]/,
      required: true
    },
    {
      id: 'number',
      description: 'Al menos un número',
      regex: /[0-9]/,
      required: true
    },
    {
      id: 'symbol',
      description: 'Al menos un símbolo (!@#$%^&*)',
      regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      required: true
    }
  ];

  static getRequirements(): PasswordRequirement[] {
    return [...this.requirements];
  }

  static validateStrength(password: string): PasswordValidationResult {
    if (!password) {
      return {
        isValid: false,
        score: 0,
        missingRequirements: this.requirements.map(req => req.description),
        feedback: ['La contraseña es requerida']
      };
    }

    const missingRequirements: string[] = [];
    const feedback: string[] = [];
    let score = 0;

    // Check each requirement
    for (const requirement of this.requirements) {
      if (requirement.regex.test(password)) {
        score++;
      } else if (requirement.required) {
        missingRequirements.push(requirement.description);
      }
    }

    // Additional security checks
    if (password.length < 8) {
      feedback.push('La contraseña debe tener al menos 8 caracteres');
    } else if (password.length >= 12) {
      score += 0.5; // Bonus for longer passwords
    }

    // Check for common patterns
    if (this.hasCommonPatterns(password)) {
      feedback.push('Evita patrones comunes como "123456" o "password"');
      score = Math.max(0, score - 1);
    }

    // Check for repeated characters
    if (this.hasRepeatedCharacters(password)) {
      feedback.push('Evita repetir el mismo carácter muchas veces');
      score = Math.max(0, score - 0.5);
    }

    // Normalize score to 0-4 range
    score = Math.min(4, Math.max(0, score));

    const isValid = missingRequirements.length === 0 && score >= 3;

    // Generate positive feedback
    if (score >= 3) {
      feedback.unshift('¡Contraseña fuerte!');
    } else if (score >= 2) {
      feedback.unshift('Contraseña moderada - considera mejorarla');
    } else {
      feedback.unshift('Contraseña débil - necesita mejoras');
    }

    return {
      isValid,
      score,
      missingRequirements,
      feedback
    };
  }

  private static hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i
    ];

    return commonPatterns.some(pattern => pattern.test(password));
  }

  private static hasRepeatedCharacters(password: string): boolean {
    // Check for 3 or more consecutive identical characters
    return /(.)\1{2,}/.test(password);
  }

  static getStrengthLabel(score: number): string {
    if (score >= 4) return 'Muy fuerte';
    if (score >= 3) return 'Fuerte';
    if (score >= 2) return 'Moderada';
    if (score >= 1) return 'Débil';
    return 'Muy débil';
  }

  static getStrengthColor(score: number): string {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-emerald-600';
    if (score >= 2) return 'text-yellow-600';
    if (score >= 1) return 'text-orange-600';
    return 'text-red-600';
  }
}