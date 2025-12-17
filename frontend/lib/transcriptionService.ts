interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
}

interface ContentEnhancementResult {
  enhancedText: string;
  changes: Array<{
    type: 'grammar' | 'style' | 'structure' | 'clarity';
    original: string;
    enhanced: string;
    reason: string;
  }>;
  originalText: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'length' | 'content' | 'language' | 'format';
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  suggestions: string[];
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.openai.com/v1';

  private constructor() {
    // Initialize with environment variables or configuration
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
  }

  public static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  /**
   * Transcribe audio blob to text using OpenAI Whisper API
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'es'); // Spanish for RouteJob
      formData.append('response_format', 'json');

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Transcription failed: ${errorData.error?.message || response.statusText}`);
      }

      const result: TranscriptionResult = await response.json();
      return result.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }

  /**
   * Enhance content using GPT for professional language improvement
   */
  async enhanceContent(
    text: string, 
    context: 'job-description' | 'requirements' | 'benefits' | 'general' = 'general'
  ): Promise<ContentEnhancementResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const contextPrompts = {
      'job-description': `
        Mejora la siguiente descripción de trabajo para que sea más profesional y atractiva para candidatos.
        Mantén el significado original pero mejora:
        - Claridad y estructura
        - Gramática y ortografía
        - Lenguaje profesional
        - Formato y organización
        
        Texto original:
      `,
      'requirements': `
        Mejora los siguientes requisitos de trabajo para que sean más claros y específicos.
        Mantén el significado original pero mejora:
        - Claridad en los requisitos
        - Estructura organizada
        - Lenguaje profesional
        - Eliminación de ambigüedades
        
        Texto original:
      `,
      'benefits': `
        Mejora la siguiente descripción de beneficios laborales para que sea más atractiva.
        Mantén el significado original pero mejora:
        - Claridad en los beneficios
        - Presentación atractiva
        - Lenguaje motivador
        - Estructura organizada
        
        Texto original:
      `,
      'general': `
        Mejora el siguiente texto para que sea más profesional y claro.
        Mantén el significado original pero mejora:
        - Gramática y ortografía
        - Claridad y coherencia
        - Lenguaje profesional
        - Estructura del contenido
        
        Texto original:
      `
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Eres un experto en recursos humanos y redacción profesional. Tu tarea es mejorar textos relacionados con ofertas de trabajo manteniendo el significado original pero mejorando la calidad, claridad y profesionalismo. Responde SOLO con el texto mejorado, sin explicaciones adicionales.`
            },
            {
              role: 'user',
              content: `${contextPrompts[context]}\n\n"${text}"`
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Content enhancement failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const enhancedText = result.choices[0]?.message?.content?.trim() || text;

      // For now, return a simplified result
      // In a real implementation, you might want to analyze the differences more thoroughly
      return {
        enhancedText,
        changes: [
          {
            type: 'style',
            original: text.substring(0, 50) + '...',
            enhanced: enhancedText.substring(0, 50) + '...',
            reason: 'Improved professional language and clarity'
          }
        ],
        originalText: text
      };
    } catch (error) {
      console.error('Error enhancing content:', error);
      throw new Error('Failed to enhance content. Please try again.');
    }
  }

  /**
   * Validate content for job posting requirements
   */
  async validateContent(text: string): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = [];
    const suggestions: string[] = [];

    // Basic validation rules
    if (text.length < 50) {
      issues.push({
        type: 'length',
        message: 'El texto es muy corto. Se recomienda al menos 50 caracteres.',
        severity: 'warning'
      });
      suggestions.push('Agrega más detalles sobre las responsabilidades y requisitos del puesto.');
    }

    if (text.length > 2000) {
      issues.push({
        type: 'length',
        message: 'El texto es muy largo. Se recomienda máximo 2000 caracteres.',
        severity: 'warning'
      });
      suggestions.push('Considera resumir el contenido para hacerlo más conciso.');
    }

    // Check for common issues
    if (!/[.!?]$/.test(text.trim())) {
      issues.push({
        type: 'format',
        message: 'El texto no termina con puntuación adecuada.',
        severity: 'info'
      });
    }

    // Check for professional language indicators
    const unprofessionalWords = ['super', 'genial', 'increíble', 'awesome', 'cool'];
    const hasUnprofessionalLanguage = unprofessionalWords.some(word => 
      text.toLowerCase().includes(word)
    );

    if (hasUnprofessionalLanguage) {
      issues.push({
        type: 'language',
        message: 'El texto contiene lenguaje informal que podría no ser apropiado para una oferta de trabajo.',
        severity: 'warning'
      });
      suggestions.push('Considera usar un lenguaje más formal y profesional.');
    }

    return {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Get available languages for transcription
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'es', name: 'Español' },
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
    ];
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Set API key (useful for testing or dynamic configuration)
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

// Export singleton instance
export const transcriptionService = TranscriptionService.getInstance();

// Export types for use in components
export type {
  TranscriptionResult,
  ContentEnhancementResult,
  ValidationResult
};