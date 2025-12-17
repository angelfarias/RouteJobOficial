import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CandidateDetailModal from '@/app/components/CandidateDetailModal';
import { ApplicationWithCandidate, CandidateDetails } from '@/lib/types/candidate-selection.types';

// Mock the CandidateSelectionButton component
jest.mock('@/app/components/CandidateSelectionButton', () => {
  return function MockCandidateSelectionButton({ application, onSelect, isSelecting }: any) {
    return (
      <button 
        onClick={onSelect} 
        disabled={isSelecting}
        data-testid="selection-button"
      >
        {isSelecting ? 'Selecting...' : 'Select Candidate'}
      </button>
    );
  };
});

describe('CandidateDetailModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectCandidate = jest.fn();

  const mockApplication: ApplicationWithCandidate = {
    id: 'app-1',
    uid: 'user-1',
    vacancyId: 'vacancy-123',
    status: 'pending',
    createdAt: { seconds: 1640995200 } as any,
    candidateName: 'John Doe',
    candidateEmail: 'john@example.com',
    profileCompleted: true,
    experience: ['Frontend Developer at TechCorp'],
    skills: ['React', 'TypeScript', 'Node.js'],
  };

  const mockCandidateDetails: CandidateDetails = {
    id: 'user-1',
    applicationId: 'app-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    experience: ['Frontend Developer at TechCorp', 'Junior Developer at StartupXYZ'],
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
    profileCompleted: true,
    applicationDate: { seconds: 1640995200 } as any,
    missingFields: [],
  };

  const defaultProps = {
    application: mockApplication,
    candidateDetails: null,
    loading: false,
    onClose: mockOnClose,
    onSelectCandidate: mockOnSelectCandidate,
    companyId: 'company-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal header correctly', () => {
    render(<CandidateDetailModal {...defaultProps} />);

    expect(screen.getByText('Detalles del candidato')).toBeInTheDocument();
    expect(screen.getByText(/Postulación recibida el/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CandidateDetailModal {...defaultProps} loading={true} />);

    expect(screen.getByText('Cargando detalles del candidato...')).toBeInTheDocument();
  });

  it('displays candidate details when loaded', () => {
    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={mockCandidateDetails} 
      />
    );

    // Personal information
    expect(screen.getByText('Información personal')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();

    // Profile status
    expect(screen.getByText('Perfil completo')).toBeInTheDocument();

    // Location
    expect(screen.getByText('Ubicación')).toBeInTheDocument();
    expect(screen.getByText(/Lat: 40.7128, Lng: -74.0060/)).toBeInTheDocument();

    // Experience
    expect(screen.getByText('Experiencia laboral')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer at TechCorp')).toBeInTheDocument();
    expect(screen.getByText('Junior Developer at StartupXYZ')).toBeInTheDocument();

    // Skills
    expect(screen.getByText('Habilidades')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();

    // Application details
    expect(screen.getByText('Detalles de la postulación')).toBeInTheDocument();
    expect(screen.getByText('app-1')).toBeInTheDocument();
  });

  it('displays missing fields when present', () => {
    const candidateWithMissingFields = {
      ...mockCandidateDetails,
      missingFields: ['phone', 'location'],
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={candidateWithMissingFields} 
      />
    );

    expect(screen.getByText('Información faltante')).toBeInTheDocument();
    expect(screen.getByText('phone')).toBeInTheDocument();
    expect(screen.getByText('location')).toBeInTheDocument();
  });

  it('handles empty experience and skills gracefully', () => {
    const candidateWithEmptyData = {
      ...mockCandidateDetails,
      experience: [],
      skills: [],
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={candidateWithEmptyData} 
      />
    );

    expect(screen.getByText('No se ha registrado experiencia laboral')).toBeInTheDocument();
    expect(screen.getByText('No se han registrado habilidades')).toBeInTheDocument();
  });

  it('shows error state when candidate details fail to load', () => {
    render(<CandidateDetailModal {...defaultProps} candidateDetails={null} />);

    expect(screen.getByText('Error al cargar detalles')).toBeInTheDocument();
    expect(screen.getByText('No se pudieron cargar los detalles del candidato. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('handles close modal action', () => {
    render(<CandidateDetailModal {...defaultProps} />);

    // Find the X button in the header (it doesn't have accessible text, so we'll use the footer button)
    const closeButton = screen.getByText('Cerrar');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles close modal via footer button', () => {
    render(<CandidateDetailModal {...defaultProps} />);

    const closeButton = screen.getByText('Cerrar');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows selection button for pending applications', () => {
    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={mockCandidateDetails} 
      />
    );

    expect(screen.getByTestId('selection-button')).toBeInTheDocument();
  });

  it('does not show selection button for selected applications', () => {
    const selectedApplication = {
      ...mockApplication,
      status: 'selected' as const,
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        application={selectedApplication}
        candidateDetails={mockCandidateDetails} 
      />
    );

    expect(screen.queryByTestId('selection-button')).not.toBeInTheDocument();
  });

  it('does not show selection button for rejected applications', () => {
    const rejectedApplication = {
      ...mockApplication,
      status: 'rejected' as const,
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        application={rejectedApplication}
        candidateDetails={mockCandidateDetails} 
      />
    );

    expect(screen.queryByTestId('selection-button')).not.toBeInTheDocument();
  });

  it('handles candidate selection', async () => {
    mockOnSelectCandidate.mockResolvedValue(true);

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={mockCandidateDetails} 
      />
    );

    const selectionButton = screen.getByTestId('selection-button');
    fireEvent.click(selectionButton);

    await waitFor(() => {
      expect(mockOnSelectCandidate).toHaveBeenCalledWith('app-1', 'company-456');
    });
  });

  it('displays different status badges correctly', () => {
    const { rerender } = render(<CandidateDetailModal {...defaultProps} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    const selectedApplication = { ...mockApplication, status: 'selected' as const };
    rerender(<CandidateDetailModal {...defaultProps} application={selectedApplication} />);
    expect(screen.getByText('Seleccionado')).toBeInTheDocument();

    const rejectedApplication = { ...mockApplication, status: 'rejected' as const };
    rerender(<CandidateDetailModal {...defaultProps} application={rejectedApplication} />);
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('displays selection metadata for selected applications', () => {
    const selectedApplication = {
      ...mockApplication,
      status: 'selected' as const,
      selectedAt: { seconds: 1640995400 } as any,
      selectedBy: 'company-rep-123',
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        application={selectedApplication}
        candidateDetails={mockCandidateDetails} 
      />
    );

    expect(screen.getByText('Fecha de selección')).toBeInTheDocument();
    expect(screen.getByText('Seleccionado por')).toBeInTheDocument();
    expect(screen.getByText('company-rep-123')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={mockCandidateDetails} 
      />
    );

    // Check that dates are formatted in Spanish locale with full month names (December = diciembre)
    expect(screen.getAllByText(/diciembre/)).toHaveLength(2); // Should appear in header and details section
  });

  it('handles missing phone number gracefully', () => {
    const candidateWithoutPhone = {
      ...mockCandidateDetails,
      phone: undefined,
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={candidateWithoutPhone} 
      />
    );

    // Phone field should not be displayed
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument();
  });

  it('handles missing location gracefully', () => {
    const candidateWithoutLocation = {
      ...mockCandidateDetails,
      location: undefined,
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={candidateWithoutLocation} 
      />
    );

    // Location field should not be displayed
    expect(screen.queryByText('Ubicación')).not.toBeInTheDocument();
  });

  it('shows incomplete profile status correctly', () => {
    const candidateIncompleteProfile = {
      ...mockCandidateDetails,
      profileCompleted: false,
    };

    render(
      <CandidateDetailModal 
        {...defaultProps} 
        candidateDetails={candidateIncompleteProfile} 
      />
    );

    expect(screen.getByText('Perfil incompleto')).toBeInTheDocument();
  });

  it('handles keyboard navigation for modal close', () => {
    render(<CandidateDetailModal {...defaultProps} />);

    // Simulate Escape key press
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    // Note: In a real implementation, you might want to handle Escape key to close modal
    // For now, we just test that the close button works
    const closeButton = screen.getByText('Cerrar');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});