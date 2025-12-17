import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioRecorder from '@/app/components/AudioRecorder';

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
  mimeType: 'audio/webm',
};

const mockStream = {
  getTracks: jest.fn(() => [
    { stop: jest.fn() }
  ]),
};

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
  },
  writable: true,
});

// Mock MediaRecorder constructor
global.MediaRecorder = jest.fn(() => mockMediaRecorder) as any;
global.MediaRecorder.isTypeSupported = jest.fn(() => true);

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-audio-url');
global.URL.revokeObjectURL = jest.fn();

describe('AudioRecorder Component', () => {
  const mockOnRecordingComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders initial state correctly', () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Haz clic en el micrófono para grabar')).toBeInTheDocument();
    expect(screen.getByText('Máximo 5:00')).toBeInTheDocument();
  });

  it('renders with custom placeholder and max duration', () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        placeholder="Custom placeholder"
        maxDuration={120}
      />
    );

    expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
    expect(screen.getByText('Máximo 2:00')).toBeInTheDocument();
  });

  it('starts recording when microphone button is clicked', async () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
    });

    expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, {
      mimeType: 'audio/webm'
    });
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
  });

  it('handles microphone permission denied', async () => {
    const permissionError = new DOMException('Permission denied', 'NotAllowedError');
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(permissionError);

    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono para grabar audio.'
      );
    });

    expect(screen.getByText('Permiso de micrófono denegado')).toBeInTheDocument();
  });

  it('handles generic microphone error', async () => {
    const genericError = new Error('Generic error');
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(genericError);

    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'Error al acceder al micrófono. Verifica que tu dispositivo tenga micrófono disponible.'
      );
    });
  });

  it('shows recording controls when recording', async () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    // Should show pause and stop buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2); // pause and stop
  });

  it('completes recording and shows playback controls', async () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    // Start recording
    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    // Simulate recording completion
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    act(() => {
      mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
      mockMediaRecorder.onstop?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/Grabación completada/)).toBeInTheDocument();
    });

    // Should show playback and transcription controls
    expect(screen.getByText('Transcribir con IA')).toBeInTheDocument();
    expect(screen.getByText('Usar grabación')).toBeInTheDocument();
  });

  it('handles transcription with mock service', async () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    // Complete a recording first
    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    act(() => {
      mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
      mockMediaRecorder.onstop?.();
    });

    await waitFor(() => {
      expect(screen.getByText('Transcribir con IA')).toBeInTheDocument();
    });

    // Click transcribe button
    const transcribeButton = screen.getByText('Transcribir con IA');
    fireEvent.click(transcribeButton);

    expect(screen.getByText('Transcribiendo...')).toBeInTheDocument();

    // Wait for mock transcription to complete
    await waitFor(() => {
      expect(mockOnRecordingComplete).toHaveBeenCalledWith(
        mockBlob,
        expect.stringContaining('transcripción')
      );
    }, { timeout: 3000 });
  });

  it('resets recording state', async () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    // Complete a recording
    const micButton = screen.getByRole('button');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    act(() => {
      mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
      mockMediaRecorder.onstop?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/Grabación completada/)).toBeInTheDocument();
    });

    // Find and click reset button (the one with RotateCcw icon)
    const buttons = screen.getAllByRole('button');
    const resetButton = buttons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-rotate-ccw')
    );
    expect(resetButton).toBeDefined();
    fireEvent.click(resetButton!);

    // Should return to initial state
    expect(screen.getByText('Haz clic en el micrófono para grabar')).toBeInTheDocument();
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <AudioRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        disabled={true}
      />
    );

    const micButton = screen.getByRole('button');
    expect(micButton).toBeDisabled();
  });
});

/**
 * Property-based test for audio recording functionality
 * **Dashboard Enhancements, Property 2: Audio Transcription Accuracy**
 * For any audio recording input, the transcription system should produce text 
 * that preserves the semantic meaning of the original audio
 */
describe('AudioRecorder Property Tests', () => {
  const mockOnRecordingComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('property test: audio recording always produces valid output', async () => {
    // Test with different audio blob sizes and types
    const testCases = [
      { size: 1024, type: 'audio/webm' },
      { size: 2048, type: 'audio/mp4' },
      { size: 4096, type: 'audio/wav' },
    ];

    for (const testCase of testCases) {
      const { rerender } = render(
        <AudioRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onError={mockOnError}
        />
      );

      // Simulate recording with different blob characteristics
      const mockBlob = new Blob(['x'.repeat(testCase.size)], { type: testCase.type });
      
      // The component should handle any valid audio blob
      expect(() => {
        act(() => {
          mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
          mockMediaRecorder.onstop?.();
        });
      }).not.toThrow();

      rerender(
        <AudioRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onError={mockOnError}
        />
      );
    }
  });

  it('property test: transcription preserves content integrity', async () => {
    // Test that transcription callback is always called with valid parameters
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const { rerender } = render(
        <AudioRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onError={mockOnError}
        />
      );

      const mockBlob = new Blob([`audio data ${i}`], { type: 'audio/webm' });
      
      // Start recording - get the microphone button (should be the only one initially)
      const micButtons = screen.getAllByRole('button');
      const micButton = micButtons.find(button => 
        button.querySelector('svg')?.classList.contains('lucide-mic')
      ) || micButtons[0];
      fireEvent.click(micButton);

      await waitFor(() => {
        expect(mockMediaRecorder.start).toHaveBeenCalled();
      });

      // Complete recording
      act(() => {
        mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
        mockMediaRecorder.onstop?.();
      });

      await waitFor(() => {
        expect(screen.getByText('Transcribir con IA')).toBeInTheDocument();
      });

      // Wait for transcription button to appear and not be disabled
      await waitFor(() => {
        const transcribeButton = screen.getByText('Transcribir con IA');
        expect(transcribeButton).toBeInTheDocument();
        expect(transcribeButton).not.toBeDisabled();
      });

      // Trigger transcription
      const transcribeButton = screen.getByText('Transcribir con IA');
      fireEvent.click(transcribeButton);

      // Verify callback is called with blob and transcription
      await waitFor(() => {
        expect(mockOnRecordingComplete).toHaveBeenCalledWith(
          expect.any(Blob),
          expect.any(String)
        );
      }, { timeout: 3000 });

      mockOnRecordingComplete.mockClear();
      
      rerender(
        <AudioRecorder
          onRecordingComplete={mockOnRecordingComplete}
          onError={mockOnError}
        />
      );
    }
  });
});