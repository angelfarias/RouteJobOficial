"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Check, X, RotateCcw, Eye, EyeOff } from "lucide-react";
import { transcriptionService, ContentEnhancementResult } from "@/lib/transcriptionService";

interface ContentEnhancerProps {
  originalText: string;
  context: 'job-description' | 'requirements' | 'benefits' | 'general';
  onEnhancementAccept: (enhancedText: string) => void;
  onEnhancementReject: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ContentEnhancer({
  originalText,
  context,
  onEnhancementAccept,
  onEnhancementReject,
  placeholder = "Texto original",
  disabled = false,
}: ContentEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<ContentEnhancementResult | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [error, setError] = useState<string>("");

  const handleEnhance = useCallback(async () => {
    if (!originalText.trim()) return;
    
    setIsEnhancing(true);
    setError("");
    
    try {
      if (!transcriptionService.isConfigured()) {
        // Mock enhancement for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockEnhancement: ContentEnhancementResult = {
          enhancedText: `${originalText}\n\n[Texto mejorado por IA - Versión demo]\n\nEste texto ha sido mejorado para mayor claridad y profesionalismo. En una implementación real con API key configurada, aquí aparecería el contenido optimizado por inteligencia artificial.`,
          changes: [
            {
              type: 'style',
              original: originalText.substring(0, 30) + '...',
              enhanced: 'Versión mejorada con IA...',
              reason: 'Mejora del lenguaje profesional y estructura'
            }
          ],
          originalText
        };
        
        setEnhancementResult(mockEnhancement);
        return;
      }

      const result = await transcriptionService.enhanceContent(originalText, context);
      setEnhancementResult(result);
    } catch (error) {
      console.error('Error enhancing content:', error);
      setError('Error al mejorar el contenido. Inténtalo de nuevo.');
    } finally {
      setIsEnhancing(false);
    }
  }, [originalText, context]);

  const handleAccept = useCallback(() => {
    if (enhancementResult) {
      onEnhancementAccept(enhancementResult.enhancedText);
      setEnhancementResult(null);
    }
  }, [enhancementResult, onEnhancementAccept]);

  const handleReject = useCallback(() => {
    setEnhancementResult(null);
    onEnhancementReject();
  }, [onEnhancementReject]);

  const handleReset = useCallback(() => {
    setEnhancementResult(null);
    setError("");
    setShowComparison(false);
  }, []);

  const getContextLabel = (ctx: string): string => {
    const labels = {
      'job-description': 'Descripción del puesto',
      'requirements': 'Requisitos',
      'benefits': 'Beneficios',
      'general': 'Contenido general'
    };
    return labels[ctx as keyof typeof labels] || 'Contenido';
  };

  if (!originalText.trim()) {
    return (
      <div className="p-4 border-2 border-dashed border-zinc-300 rounded-lg bg-zinc-50 text-center">
        <p className="text-sm text-zinc-500">
          {placeholder}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhancement Controls */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">
            Mejorar con IA - {getContextLabel(context)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {enhancementResult && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showComparison ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showComparison ? 'Ocultar' : 'Comparar'}
            </button>
          )}
          
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || disabled}
            className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white text-xs rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isEnhancing ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                Mejorando...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Mejorar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Enhancement Result */}
      {enhancementResult && (
        <div className="space-y-4">
          {/* Comparison View */}
          {showComparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-700">Texto original:</h4>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 max-h-40 overflow-y-auto">
                  {enhancementResult.originalText}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-emerald-700">Texto mejorado:</h4>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 max-h-40 overflow-y-auto">
                  {enhancementResult.enhancedText}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Text Display */}
          {!showComparison && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-emerald-700">Texto mejorado por IA:</h4>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800 whitespace-pre-wrap">
                  {enhancementResult.enhancedText}
                </p>
              </div>
            </div>
          )}

          {/* Changes Summary */}
          {enhancementResult.changes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-700">Mejoras aplicadas:</h4>
              <div className="space-y-2">
                {enhancementResult.changes.map((change, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        change.type === 'grammar' ? 'bg-red-100 text-red-800' :
                        change.type === 'style' ? 'bg-purple-100 text-purple-800' :
                        change.type === 'structure' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {change.type === 'grammar' ? 'Gramática' :
                         change.type === 'style' ? 'Estilo' :
                         change.type === 'structure' ? 'Estructura' :
                         'Claridad'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">{change.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 text-zinc-600 hover:text-zinc-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar
            </button>
            
            <button
              onClick={handleReject}
              className="flex items-center gap-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Mantener original
            </button>
            
            <button
              onClick={handleAccept}
              className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              Usar mejorado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}