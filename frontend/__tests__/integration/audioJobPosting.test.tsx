import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter, useParams } from 'next/navigation';
import BranchVacanciesPage from '@/app/company/branch/[branchId]/vacancies/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Firebase auth
jest.mock('@/lib/firebaseClient', () => ({
  auth: {
    onAuthStateChanged: jest.fn((callback) => {
      callback({ uid: 'test-user', email: 'test@example.com' });
      return jest.fn(); // unsubscribe function
    }),
    signOut: jest.fn(),
  },
}));

// Mock environment
jest.mock('@/lib/env', () => ({
  getApiUrl: jest.fn(() => 'http://localhost:3001'),
}));

// Mock MediaRecorder and related APIs
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
  getTracks: jest.fn(() => [{ stop: jest.fn() }]),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
  },
  writable: true,
});

global.MediaRecorder = jest.fn(() => mockMediaRecorder) as any;
global.MediaRecorder.isTypeSupported = jest.fn(() => true);
global.URL.createObjectURL = jest.fn(() => 'mock-audio-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Audio Job Posting Integration', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    (useParams as jest.Mock).mockReturnValue({
      branchId: 'test-branch-123',
    });

    // Mock API responses
    (fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/vacancies/branch/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders job posting form with audio input toggle', async () => {
    render(<BranchVacanciesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
    });

    // Open the form
    const newVacancyButton = screen.getByText('Nueva vacante');
    fireEvent.click(newVacancyButton);

    await waitFor(() => {
      expect(screen.getByText('Crear nueva vacante')).toBeInTheDocument();
    });

    // Check for audio input toggle
    expect(screen.getByText('Entrada por voz')).toBeInTheDocument();
    expect(screen.getByText('Usa grabación de audio y transcripción automática con IA')).toBeInTheDocument();
  });

  it('enables audio recording when toggle is activated', async () => {
    render(<BranchVacanciesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
    });

    const newVacancyButton = screen.getByText('Nueva vacante');
    fireEvent.click(newVacancyButton);

    await waitFor(() => {
      expect(screen.getByText('Entrada por voz')).toBeInTheDocument();
    });

    // Enable audio input
    const audioToggle = screen.getByRole('checkbox');
    fireEvent.click(audioToggle);

    // Should show audio recorders for title and description
    await waitFor(() => {
      // Look for microphone buttons instead of text
      const micButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg')?.classList.contains('lucide-mic')
      );
      expect(micButtons.length).toBeGreaterThan(0);
    });
  });

  it('completes full audio-to-job-posting workflow', async () => {
    render(<BranchVacanciesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
    });

    // Open form and enable audio input
    const newVacancyButton = screen.getByText('Nueva vacante');
    fireEvent.click(newVacancyButton);

    await waitFor(() => {
      const audioToggle = screen.getByRole('checkbox');
      fireEvent.click(audioToggle);
    });

    // Wait for audio recorders to appear and find title microphone button
    await waitFor(() => {
      const micButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg')?.classList.contains('lucide-mic')
      );
      expect(micButtons.length).toBeGreaterThan(0);
    });

    // Find the first microphone button (should be for title)
    const micButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('lucide-mic')
    );
    
    if (micButtons.length > 0) {
      fireEvent.click(micButtons[0]);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      });

      // Simulate recording completion
      const mockBlob = new Blob(['title audio'], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
      mockMediaRecorder.onstop?.();

      await waitFor(() => {
        expect(screen.getByText('Transcribir con IA')).toBeInTheDocument();
      });

      // Transcribe title
      const transcribeButton = screen.getByText('Transcribir con IA');
      fireEvent.click(transcribeButton);

      await waitFor(() => {
        // Should show transcribed text in the title input
        const titleInput = screen.getByDisplayValue(/transcripción/);
        expect(titleInput).toBeInTheDocument();
      }, { timeout: 3000 });
    }

    // Fill other required fields
    const salaryMinInput = screen.getByPlaceholderText('Ej: 500000');
    fireEvent.change(salaryMinInput, { target: { value: '600000' } });

    // Mock successful job creation
    (fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'new-job-123',
          title: 'Transcribed Job Title',
          description: 'Transcribed job description',
        }),
      })
    );

    // Submit form
    const submitButton = screen.getByText('Crear vacante');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/vacancies/company-id/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  it('handles audio recording errors gracefully', async () => {
    // Mock microphone access error
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    render(<BranchVacanciesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
    });

    const newVacancyButton = screen.getByText('Nueva vacante');
    fireEvent.click(newVacancyButton);

    await waitFor(() => {
      const audioToggle = screen.getByRole('checkbox');
      fireEvent.click(audioToggle);
    });

    // Wait for audio recorders to appear
    await waitFor(() => {
      const micButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg')?.classList.contains('lucide-mic')
      );
      expect(micButtons.length).toBeGreaterThan(0);
    });

    // Try to start recording - find microphone button
    const micButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('lucide-mic')
    );
    
    if (micButtons.length > 0) {
      fireEvent.click(micButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Permiso de micrófono denegado')).toBeInTheDocument();
      });
    }

    // Should still allow text input as fallback
    const audioToggle = screen.getByRole('checkbox');
    fireEvent.click(audioToggle); // Disable audio input

    const titleInput = screen.getByPlaceholderText(/Desarrollador Frontend/);
    expect(titleInput).toBeInTheDocument();
    
    fireEvent.change(titleInput, { target: { value: 'Manual Job Title' } });
    expect(titleInput).toHaveValue('Manual Job Title');
  });

  it('allows content enhancement with AI', async () => {
    render(<BranchVacanciesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
    });

    const newVacancyButton = screen.getByText('Nueva vacante');
    fireEvent.click(newVacancyButton);

    await waitFor(() => {
      expect(screen.getByText('Crear nueva vacante')).toBeInTheDocument();
    });

    // Fill in title manually
    const titleInput = screen.getByPlaceholderText(/Desarrollador Frontend/);
    fireEvent.change(titleInput, { target: { value: 'Software Developer Position' } });

    // Should show AI enhancement option
    await waitFor(() => {
      expect(screen.getByText('Mejorar con IA')).toBeInTheDocument();
    });

    // Click enhance button
    const enhanceButton = screen.getByText('Mejorar con IA');
    fireEvent.click(enhanceButton);

    // Should show content enhancer
    await waitFor(() => {
      expect(screen.getByText('Mejorar con IA - Contenido general')).toBeInTheDocument();
    });
  });

  it('preserves form data when switching between audio and text input', async () => {
    render(<BranchVacanciesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
    });

    const newVacancyButton = screen.getByText('Nueva vacante');
    fireEvent.click(newVacancyButton);

    // Fill title with text input
    const titleInput = screen.getByPlaceholderText(/Desarrollador Frontend/);
    fireEvent.change(titleInput, { target: { value: 'Manual Title' } });

    // Enable audio input
    const audioToggle = screen.getByRole('checkbox');
    fireEvent.click(audioToggle);

    // Title should still be preserved
    const preservedTitleInput = screen.getByDisplayValue('Manual Title');
    expect(preservedTitleInput).toBeInTheDocument();

    // Disable audio input again
    fireEvent.click(audioToggle);

    // Title should still be there
    const finalTitleInput = screen.getByDisplayValue('Manual Title');
    expect(finalTitleInput).toBeInTheDocument();
  });
});

/**
 * Integration property-based tests for audio job posting workflow
 * **Dashboard Enhancements, Property 5: Audio-Text Content Consistency**
 * For any job posting created with audio input, the final text content should 
 * accurately represent the original audio intent while maintaining professional quality
 */
describe('Audio Job Posting Property Tests', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    
    (useParams as jest.Mock).mockReturnValue({
      branchId: 'test-branch-123',
    });

    (fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    jest.clearAllMocks();
  });

  it('property test: form state consistency across input methods', async () => {
    const testData = [
      { title: 'Developer', description: 'Software development role' },
      { title: 'Manager', description: 'Team management position' },
      { title: 'Designer', description: 'UI/UX design work' },
    ];

    for (const data of testData) {
      const { rerender } = render(<BranchVacanciesPage />);

      await waitFor(() => {
        expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
      });

      const newVacancyButton = screen.getByText('Nueva vacante');
      fireEvent.click(newVacancyButton);

      // Property: Text input should always work
      const titleInput = screen.getByPlaceholderText(/Desarrollador Frontend/);
      fireEvent.change(titleInput, { target: { value: data.title } });
      expect(titleInput).toHaveValue(data.title);

      const descriptionInput = screen.getByPlaceholderText(/Describe las responsabilidades/);
      fireEvent.change(descriptionInput, { target: { value: data.description } });
      expect(descriptionInput).toHaveValue(data.description);

      // Property: Switching to audio mode should preserve data
      const audioToggle = screen.getByRole('checkbox');
      fireEvent.click(audioToggle);

      const preservedTitle = screen.getByDisplayValue(data.title);
      const preservedDescription = screen.getByDisplayValue(data.description);
      expect(preservedTitle).toBeInTheDocument();
      expect(preservedDescription).toBeInTheDocument();

      // Property: Switching back should still preserve data
      fireEvent.click(audioToggle);

      const finalTitle = screen.getByDisplayValue(data.title);
      const finalDescription = screen.getByDisplayValue(data.description);
      expect(finalTitle).toBeInTheDocument();
      expect(finalDescription).toBeInTheDocument();

      rerender(<div />); // Clear for next iteration
    }
  });

  it('property test: audio recording workflow is deterministic', async () => {
    const iterations = 3;

    for (let i = 0; i < iterations; i++) {
      const { rerender } = render(<BranchVacanciesPage />);

      await waitFor(() => {
        expect(screen.getByText('Nueva vacante')).toBeInTheDocument();
      });

      const newVacancyButton = screen.getByText('Nueva vacante');
      fireEvent.click(newVacancyButton);

      const audioToggle = screen.getByRole('checkbox');
      fireEvent.click(audioToggle);

      // Wait for audio recorders to appear
      await waitFor(() => {
        const micButtons = screen.getAllByRole('button').filter(button => 
          button.querySelector('svg')?.classList.contains('lucide-mic')
        );
        expect(micButtons.length).toBeGreaterThan(0);
      });

      // Property: Audio recording interface should always be available
      const micButtons = screen.getAllByRole('button').filter(button =>
        button.querySelector('svg')?.classList.contains('lucide-mic')
      );
      expect(micButtons.length).toBeGreaterThan(0);

      // Property: Recording should always follow the same state transitions
      if (micButtons[0]) {
        fireEvent.click(micButtons[0]);

        await waitFor(() => {
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        });

        // Simulate recording completion
        const mockBlob = new Blob([`audio data ${i}`], { type: 'audio/webm' });
        mockMediaRecorder.ondataavailable?.({ data: mockBlob } as any);
        mockMediaRecorder.onstop?.();

        // Property: Transcription option should always be available after recording
        await waitFor(() => {
          expect(screen.getByText('Transcribir con IA')).toBeInTheDocument();
        });
      }

      rerender(<div />); // Clear for next iteration
    }
  });
});