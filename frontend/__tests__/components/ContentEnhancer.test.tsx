import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentEnhancer from '@/app/components/ContentEnhancer';

// Mock the transcription service
jest.mock('@/lib/transcriptionService', () => ({
  transcriptionService: {
    isConfigured: jest.fn(() => false), // Default to not configured for testing
    enhanceContent: jest.fn(),
  },
}));

import { transcriptionService } from '@/lib/transcriptionService';

describe('ContentEnhancer Component', () => {
  const mockOnEnhancementAccept = jest.fn();
  const mockOnEnhancementReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders placeholder when no text provided', () => {
    render(
      <ContentEnhancer
        originalText=""
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    expect(screen.getByText('Texto original')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(
      <ContentEnhancer
        originalText=""
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
        placeholder="Custom placeholder text"
      />
    );

    expect(screen.getByText('Custom placeholder text')).toBeInTheDocument();
  });

  it('renders enhancement controls when text is provided', () => {
    render(
      <ContentEnhancer
        originalText="Sample job description text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    expect(screen.getByText('Mejorar con IA - Descripción del puesto')).toBeInTheDocument();
    expect(screen.getByText('Mejorar')).toBeInTheDocument();
  });

  it('displays correct context labels', () => {
    const contexts = [
      { context: 'job-description', label: 'Descripción del puesto' },
      { context: 'requirements', label: 'Requisitos' },
      { context: 'benefits', label: 'Beneficios' },
      { context: 'general', label: 'Contenido general' },
    ] as const;

    contexts.forEach(({ context, label }) => {
      const { rerender } = render(
        <ContentEnhancer
          originalText="Test text"
          context={context}
          onEnhancementAccept={mockOnEnhancementAccept}
          onEnhancementReject={mockOnEnhancementReject}
        />
      );

      expect(screen.getByText(`Mejorar con IA - ${label}`)).toBeInTheDocument();

      rerender(<div />); // Clear for next iteration
    });
  });

  it('handles enhancement with mock service (not configured)', async () => {
    render(
      <ContentEnhancer
        originalText="Original job description"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    expect(screen.getByText('Mejorando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Texto mejorado por IA:')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText(/Texto mejorado por IA - Versión demo/)).toBeInTheDocument();
  });

  it('handles enhancement with configured service', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
      enhancedText: 'This is the enhanced professional job description.',
      originalText: 'Original job description',
      changes: [
        {
          type: 'style',
          original: 'Original...',
          enhanced: 'Enhanced...',
          reason: 'Improved professional language'
        }
      ]
    });

    render(
      <ContentEnhancer
        originalText="Original job description"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('This is the enhanced professional job description.')).toBeInTheDocument();
    });

    expect(transcriptionService.enhanceContent).toHaveBeenCalledWith(
      'Original job description',
      'job-description'
    );
  });

  it('displays changes summary', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
      enhancedText: 'Enhanced text',
      originalText: 'Original text',
      changes: [
        {
          type: 'grammar',
          original: 'Original...',
          enhanced: 'Enhanced...',
          reason: 'Fixed grammar issues'
        },
        {
          type: 'style',
          original: 'Original...',
          enhanced: 'Enhanced...',
          reason: 'Improved professional tone'
        }
      ]
    });

    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('Mejoras aplicadas:')).toBeInTheDocument();
    });

    expect(screen.getByText('Gramática')).toBeInTheDocument();
    expect(screen.getByText('Estilo')).toBeInTheDocument();
    expect(screen.getByText('Fixed grammar issues')).toBeInTheDocument();
    expect(screen.getByText('Improved professional tone')).toBeInTheDocument();
  });

  it('toggles comparison view', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
      enhancedText: 'Enhanced text',
      originalText: 'Original text',
      changes: []
    });

    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('Comparar')).toBeInTheDocument();
    });

    const compareButton = screen.getByText('Comparar');
    fireEvent.click(compareButton);

    expect(screen.getByText('Texto original:')).toBeInTheDocument();
    expect(screen.getByText('Texto mejorado:')).toBeInTheDocument();
    expect(screen.getByText('Ocultar')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ocultar'));
    expect(screen.getByText('Comparar')).toBeInTheDocument();
  });

  it('accepts enhancement', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
      enhancedText: 'Enhanced text',
      originalText: 'Original text',
      changes: []
    });

    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('Usar mejorado')).toBeInTheDocument();
    });

    const acceptButton = screen.getByText('Usar mejorado');
    fireEvent.click(acceptButton);

    expect(mockOnEnhancementAccept).toHaveBeenCalledWith('Enhanced text');
  });

  it('rejects enhancement', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
      enhancedText: 'Enhanced text',
      originalText: 'Original text',
      changes: []
    });

    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('Mantener original')).toBeInTheDocument();
    });

    const rejectButton = screen.getByText('Mantener original');
    fireEvent.click(rejectButton);

    expect(mockOnEnhancementReject).toHaveBeenCalled();
  });

  it('resets enhancement state', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
      enhancedText: 'Enhanced text',
      originalText: 'Original text',
      changes: []
    });

    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('Reiniciar')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reiniciar');
    fireEvent.click(resetButton);

    expect(screen.queryByText('Texto mejorado por IA:')).not.toBeInTheDocument();
    expect(screen.getByText('Mejorar')).toBeInTheDocument();
  });

  it('handles enhancement errors', async () => {
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
    (transcriptionService.enhanceContent as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText('Error al mejorar el contenido. Inténtalo de nuevo.')).toBeInTheDocument();
    });
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <ContentEnhancer
        originalText="Original text"
        context="job-description"
        onEnhancementAccept={mockOnEnhancementAccept}
        onEnhancementReject={mockOnEnhancementReject}
        disabled={true}
      />
    );

    const enhanceButton = screen.getByText('Mejorar');
    expect(enhanceButton).toBeDisabled();
  });
});

/**
 * Property-based tests for ContentEnhancer
 * **Dashboard Enhancements, Property 5: Audio-Text Content Consistency**
 * For any job posting created with audio input, the final text content should 
 * accurately represent the original audio intent while maintaining professional quality
 */
describe('ContentEnhancer Property Tests', () => {
  const mockOnEnhancementAccept = jest.fn();
  const mockOnEnhancementReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (transcriptionService.isConfigured as jest.Mock).mockReturnValue(true);
  });

  it('property test: enhancement always preserves original text reference', async () => {
    const testTexts = [
      'Short text',
      'Medium length job description with some details',
      'Very long and detailed job description with extensive requirements, multiple benefits, comprehensive responsibilities, and detailed qualifications that candidates must meet',
      'Text with special characters: áéíóú, ñ, ¿¡!?',
    ];

    for (const originalText of testTexts) {
      (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
        enhancedText: `Enhanced: ${originalText}`,
        originalText,
        changes: [{ type: 'style', original: 'test', enhanced: 'test', reason: 'test' }]
      });

      const { rerender } = render(
        <ContentEnhancer
          originalText={originalText}
          context="job-description"
          onEnhancementAccept={mockOnEnhancementAccept}
          onEnhancementReject={mockOnEnhancementReject}
        />
      );

      const enhanceButton = screen.getByText('Mejorar');
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(screen.getByText(`Enhanced: ${originalText}`)).toBeInTheDocument();
      });

      // Property: Original text should always be preserved and accessible
      const compareButton = screen.getByText('Comparar');
      fireEvent.click(compareButton);

      expect(screen.getByText('Texto original:')).toBeInTheDocument();
      expect(screen.getByText(originalText)).toBeInTheDocument();

      rerender(<div />); // Clear for next iteration
    }
  });

  it('property test: enhancement callbacks are always called with valid data', async () => {
    const testCases = [
      { text: 'Test 1', context: 'job-description' as const },
      { text: 'Test 2', context: 'requirements' as const },
      { text: 'Test 3', context: 'benefits' as const },
      { text: 'Test 4', context: 'general' as const },
    ];

    for (const testCase of testCases) {
      const enhancedText = `Enhanced ${testCase.text}`;
      
      (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
        enhancedText,
        originalText: testCase.text,
        changes: []
      });

      const { rerender } = render(
        <ContentEnhancer
          originalText={testCase.text}
          context={testCase.context}
          onEnhancementAccept={mockOnEnhancementAccept}
          onEnhancementReject={mockOnEnhancementReject}
        />
      );

      const enhanceButton = screen.getByText('Mejorar');
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(screen.getByText('Usar mejorado')).toBeInTheDocument();
      });

      // Test accept callback
      const acceptButton = screen.getByText('Usar mejorado');
      fireEvent.click(acceptButton);

      // Property: Accept callback should always be called with enhanced text
      expect(mockOnEnhancementAccept).toHaveBeenCalledWith(enhancedText);
      expect(typeof mockOnEnhancementAccept.mock.calls[0][0]).toBe('string');
      expect(mockOnEnhancementAccept.mock.calls[0][0].length).toBeGreaterThan(0);

      mockOnEnhancementAccept.mockClear();
      rerender(<div />); // Clear for next iteration
    }
  });

  it('property test: UI state transitions are consistent', async () => {
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      (transcriptionService.enhanceContent as jest.Mock).mockResolvedValue({
        enhancedText: `Enhanced text ${i}`,
        originalText: `Original text ${i}`,
        changes: []
      });

      const { rerender } = render(
        <ContentEnhancer
          originalText={`Original text ${i}`}
          context="job-description"
          onEnhancementAccept={mockOnEnhancementAccept}
          onEnhancementReject={mockOnEnhancementReject}
        />
      );

      // Property: Initial state should always show enhance button
      expect(screen.getByText('Mejorar')).toBeInTheDocument();
      expect(screen.queryByText('Mejorando...')).not.toBeInTheDocument();

      // Start enhancement
      const enhanceButton = screen.getByText('Mejorar');
      fireEvent.click(enhanceButton);

      // Property: Loading state should be shown
      expect(screen.getByText('Mejorando...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Usar mejorado')).toBeInTheDocument();
      });

      // Property: Result state should show action buttons
      expect(screen.getByText('Usar mejorado')).toBeInTheDocument();
      expect(screen.getByText('Mantener original')).toBeInTheDocument();
      expect(screen.getByText('Reiniciar')).toBeInTheDocument();

      // Reset and verify return to initial state
      const resetButton = screen.getByText('Reiniciar');
      fireEvent.click(resetButton);

      expect(screen.getByText('Mejorar')).toBeInTheDocument();
      expect(screen.queryByText('Texto mejorado por IA:')).not.toBeInTheDocument();

      rerender(<div />); // Clear for next iteration
    }
  });
});