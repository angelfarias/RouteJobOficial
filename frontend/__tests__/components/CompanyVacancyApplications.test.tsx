import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompanyVacancyApplications from '@/app/components/CompanyVacancyApplications';
import { ApplicationWithCandidate } from '@/lib/types/candidate-selection.types';

// Mock the child components
jest.mock('@/app/components/ApplicationsList', () => {
  return function MockApplicationsList({ applications, onViewCandidate, onRefresh }: any) {
    return (
      <div data-testid="applications-list">
        <div>Applications count: {applications.length}</div>
        <button onClick={() => onViewCandidate(applications[0])}>View First Candidate</button>
        <button onClick={onRefresh}>Refresh</button>
      </div>
    );
  };
});

jest.mock('@/app/components/CandidateDetailModal', () => {
  return function MockCandidateDetailModal({ application, onClose, onSelectCandidate }: any) {
    return (
      <div data-testid="candidate-modal">
        <div>Modal for: {application.candidateName}</div>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onSelectCandidate(application.id, 'test-user')}>Select Candidate</button>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock getApiUrl
jest.mock('@/lib/env', () => ({
  getApiUrl: () => 'http://localhost:3001',
}));

describe('CompanyVacancyApplications Component', () => {
  const mockProps = {
    vacancyId: 'vacancy-123',
    companyId: 'company-456',
    vacancyTitle: 'Software Developer',
  };

  const mockApplications: ApplicationWithCandidate[] = [
    {
      id: 'app-1',
      uid: 'user-1',
      vacancyId: 'vacancy-123',
      status: 'pending',
      createdAt: { seconds: 1640995200 } as any,
      candidateName: 'John Doe',
      candidateEmail: 'john@example.com',
      profileCompleted: true,
      experience: ['Frontend Developer'],
      skills: ['React', 'TypeScript'],
    },
    {
      id: 'app-2',
      uid: 'user-2',
      vacancyId: 'vacancy-123',
      status: 'selected',
      createdAt: { seconds: 1640995300 } as any,
      candidateName: 'Jane Smith',
      candidateEmail: 'jane@example.com',
      profileCompleted: false,
      experience: [],
      skills: ['JavaScript'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        applications: mockApplications,
      }),
    });
  });

  it('renders loading state initially', () => {
    render(<CompanyVacancyApplications {...mockProps} />);
    
    expect(screen.getByText('Cargando postulaciones...')).toBeInTheDocument();
  });

  it('renders applications list after loading', async () => {
    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Postulaciones para: Software Developer')).toBeInTheDocument();
    expect(screen.getByText('2 postulaciones encontradas')).toBeInTheDocument();
    expect(screen.getByText('Applications count: 2')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Error loading applications: 500/)).toBeInTheDocument();
  });

  it('handles network error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('opens candidate detail modal when viewing candidate', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          applications: mockApplications,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          candidate: {
            id: 'user-1',
            applicationId: 'app-1',
            name: 'John Doe',
            email: 'john@example.com',
            profileCompleted: true,
            experience: ['Frontend Developer'],
            skills: ['React', 'TypeScript'],
          },
        }),
      });

    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View First Candidate'));

    await waitFor(() => {
      expect(screen.getByTestId('candidate-modal')).toBeInTheDocument();
    });

    expect(screen.getByText('Modal for: John Doe')).toBeInTheDocument();
  });

  it('closes candidate detail modal', async () => {
    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText('View First Candidate'));

    await waitFor(() => {
      expect(screen.getByTestId('candidate-modal')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByText('Close Modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('candidate-modal')).not.toBeInTheDocument();
    });
  });

  it('handles candidate selection successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          applications: mockApplications,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          candidate: {
            id: 'user-1',
            applicationId: 'app-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          selection: { success: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          applications: mockApplications,
        }),
      });

    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText('View First Candidate'));

    await waitFor(() => {
      expect(screen.getByTestId('candidate-modal')).toBeInTheDocument();
    });

    // Select candidate
    fireEvent.click(screen.getByText('Select Candidate'));

    await waitFor(() => {
      expect(screen.queryByTestId('candidate-modal')).not.toBeInTheDocument();
    });

    // Verify selection API was called
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/applications/app-1/select',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-company-id': 'company-456',
        }),
        body: JSON.stringify({ selectedBy: 'test-user' }),
      })
    );
  });

  it('handles candidate selection error', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          applications: mockApplications,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          candidate: {
            id: 'user-1',
            applicationId: 'app-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText('View First Candidate'));

    await waitFor(() => {
      expect(screen.getByTestId('candidate-modal')).toBeInTheDocument();
    });

    // Try to select candidate
    fireEvent.click(screen.getByText('Select Candidate'));

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Error selecting candidate: 400/)).toBeInTheDocument();
  });

  it('refreshes applications list', async () => {
    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });

    // Clear previous fetch calls
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        applications: [],
      }),
    });

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/applications/vacancy/vacancy-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-company-id': 'company-456',
          }),
        })
      );
    });
  });

  it('renders with default vacancy title when not provided', async () => {
    const propsWithoutTitle = {
      vacancyId: 'vacancy-123',
      companyId: 'company-456',
    };

    render(<CompanyVacancyApplications {...propsWithoutTitle} />);
    
    await waitFor(() => {
      expect(screen.getByText('Postulaciones para: Vacante')).toBeInTheDocument();
    });
  });

  it('handles empty applications list', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        applications: [],
      }),
    });

    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('0 postulaciones encontradas')).toBeInTheDocument();
    });

    expect(screen.getByText('Applications count: 0')).toBeInTheDocument();
  });

  it('makes correct API calls with proper headers', async () => {
    render(<CompanyVacancyApplications {...mockProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/applications/vacancy/vacancy-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-company-id': 'company-456',
            'authorization': 'Bearer token',
          }),
        })
      );
    });
  });
});