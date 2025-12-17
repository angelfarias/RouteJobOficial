/**
 * Integration test for candidate selection system
 * Tests the integration between company vacancy view and application management
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompanyVacancyApplications from '@/app/components/CompanyVacancyApplications';

// Mock Firebase auth
jest.mock('@/lib/firebaseClient', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
      uid: 'mock-user-id'
    }
  }
}));

// Mock API responses
global.fetch = jest.fn();

describe('Candidate Selection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render applications component with proper loading state', async () => {
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        applications: []
      })
    });

    render(
      <CompanyVacancyApplications
        vacancyId="test-vacancy-id"
        companyId="test-company-id"
        vacancyTitle="Test Vacancy"
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Cargando postulaciones...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Postulaciones para: Test Vacancy')).toBeInTheDocument();
    });

    // Should show empty state when no applications
    expect(screen.getByText('No hay postulaciones')).toBeInTheDocument();
  });

  it('should handle authentication errors gracefully', async () => {
    // Mock authentication error
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('User not authenticated'));

    render(
      <CompanyVacancyApplications
        vacancyId="test-vacancy-id"
        companyId="test-company-id"
        vacancyTitle="Test Vacancy"
      />
    );

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Error de autenticación')).toBeInTheDocument();
    });

    expect(screen.getByText('User not authenticated')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('should display applications when data is loaded', async () => {
    const mockApplications = [
      {
        id: 'app-1',
        uid: 'candidate-1',
        vacancyId: 'test-vacancy-id',
        status: 'pending' as const,
        createdAt: { seconds: Date.now() / 1000 },
        candidateName: 'John Doe',
        candidateEmail: 'john@example.com',
        profileCompleted: true,
        experience: ['Software Developer'],
        skills: ['JavaScript', 'React']
      }
    ];

    // Mock successful API response with applications
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        applications: mockApplications
      })
    });

    render(
      <CompanyVacancyApplications
        vacancyId="test-vacancy-id"
        companyId="test-company-id"
        vacancyTitle="Test Vacancy"
      />
    );

    // Wait for applications to load
    await waitFor(() => {
      expect(screen.getByText('1 postulación encontrada')).toBeInTheDocument();
    });

    // Should display application details
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ver detalles')).toBeInTheDocument();
  });

  it('should make API calls with proper authentication headers', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        applications: []
      })
    });

    render(
      <CompanyVacancyApplications
        vacancyId="test-vacancy-id"
        companyId="test-company-id"
        vacancyTitle="Test Vacancy"
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/applications/vacancy/test-vacancy-id'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-company-id': 'test-company-id',
            'authorization': 'Bearer mock-token'
          })
        })
      );
    });
  });

  it('should handle network errors properly', async () => {
    // Mock network error
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <CompanyVacancyApplications
        vacancyId="test-vacancy-id"
        companyId="test-company-id"
        vacancyTitle="Test Vacancy"
      />
    );

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
    
    // Should have retry button
    const retryButton = screen.getByText('Reintentar');
    expect(retryButton).toBeInTheDocument();

    // Test retry functionality
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        applications: []
      })
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Postulaciones para: Test Vacancy')).toBeInTheDocument();
    });
  });
});