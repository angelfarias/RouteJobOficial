import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApplicationsList from '@/app/components/ApplicationsList';
import { ApplicationWithCandidate } from '@/lib/types/candidate-selection.types';

describe('ApplicationsList Component', () => {
  const mockOnViewCandidate = jest.fn();
  const mockOnRefresh = jest.fn();

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
      experience: ['Frontend Developer at TechCorp'],
      skills: ['React', 'TypeScript', 'Node.js'],
    },
    {
      id: 'app-2',
      uid: 'user-2',
      vacancyId: 'vacancy-123',
      status: 'selected',
      createdAt: { seconds: 1640995300 } as any,
      selectedAt: { seconds: 1640995400 } as any,
      selectedBy: 'company-rep',
      candidateName: 'Jane Smith',
      candidateEmail: 'jane@example.com',
      profileCompleted: false,
      experience: [],
      skills: ['JavaScript'],
    },
    {
      id: 'app-3',
      uid: 'user-3',
      vacancyId: 'vacancy-123',
      status: 'rejected',
      createdAt: { seconds: 1640995100 } as any,
      candidateName: 'Bob Johnson',
      candidateEmail: 'bob@example.com',
      profileCompleted: true,
      experience: ['Backend Developer'],
      skills: ['Python', 'Django'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no applications', () => {
    render(
      <ApplicationsList
        applications={[]}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('No hay postulaciones')).toBeInTheDocument();
    expect(screen.getByText('Aún no se han recibido postulaciones para esta vacante.')).toBeInTheDocument();
    
    const refreshButton = screen.getByText('Actualizar');
    fireEvent.click(refreshButton);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders applications table with correct data', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    // Check table headers
    expect(screen.getByText('Candidato')).toBeInTheDocument();
    expect(screen.getByText('Fecha de postulación')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check application data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Seleccionado')).toBeInTheDocument();
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('shows profile completion status', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const completeStatuses = screen.getAllByText('Completo');
    const incompleteStatuses = screen.getAllByText('Incompleto');
    
    expect(completeStatuses).toHaveLength(2); // John and Bob have complete profiles
    expect(incompleteStatuses).toHaveLength(1); // Jane has incomplete profile
  });

  it('displays skills count', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('3 habilidades')).toBeInTheDocument(); // John has 3 skills
    expect(screen.getByText('1 habilidad')).toBeInTheDocument(); // Jane has 1 skill
    expect(screen.getByText('2 habilidades')).toBeInTheDocument(); // Bob has 2 skills
  });

  it('handles view candidate action', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const viewButtons = screen.getAllByText('Ver detalles');
    fireEvent.click(viewButtons[0]);

    // The applications are sorted by date desc by default, so Jane Smith (most recent) should be first
    expect(mockOnViewCandidate).toHaveBeenCalledWith(mockApplications[1]); // Jane Smith
  });

  it('filters applications by status', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    // Initially shows all applications
    expect(screen.getByText('Mostrando 3 de 3 postulaciones')).toBeInTheDocument();

    // Filter by pending
    const statusFilter = screen.getByDisplayValue('Todos (3)');
    fireEvent.change(statusFilter, { target: { value: 'pending' } });

    expect(screen.getByText('Mostrando 1 de 3 postulaciones (filtradas por: pending)')).toBeInTheDocument();

    // Filter by selected
    fireEvent.change(statusFilter, { target: { value: 'selected' } });
    expect(screen.getByText('Mostrando 1 de 3 postulaciones (filtradas por: selected)')).toBeInTheDocument();

    // Filter by rejected
    fireEvent.change(statusFilter, { target: { value: 'rejected' } });
    expect(screen.getByText('Mostrando 1 de 3 postulaciones (filtradas por: rejected)')).toBeInTheDocument();
  });

  it('sorts applications by candidate name', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const candidateHeader = screen.getByText('Candidato');
    fireEvent.click(candidateHeader);

    // After sorting by name ascending, Bob should be first (alphabetically)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Bob Johnson'); // First data row (index 1, header is 0)
  });

  it('sorts applications by application date', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const dateHeader = screen.getByText('Fecha de postulación');
    fireEvent.click(dateHeader);

    // Default is desc (most recent first), clicking should make it asc (oldest first)
    // Bob has the oldest application (1640995100)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Bob Johnson');
  });

  it('sorts applications by status', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const statusHeader = screen.getByText('Estado');
    fireEvent.click(statusHeader);

    // After sorting by status ascending, 'pending' should come before 'rejected' and 'selected'
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('John Doe'); // pending status
  });

  it('toggles sort order when clicking same header twice', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const candidateHeader = screen.getByText('Candidato');
    
    // First click - ascending
    fireEvent.click(candidateHeader);
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Bob Johnson');

    // Second click - descending
    fireEvent.click(candidateHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('John Doe');
  });

  it('formats dates correctly', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    // Check that dates are formatted (Spanish locale may show "dic" for December)
    expect(screen.getAllByText(/dic/)).toHaveLength(3); // All three applications have December dates
  });

  it('handles refresh action', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByText('Actualizar');
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows correct filter counts', () => {
    render(
      <ApplicationsList
        applications={mockApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    const statusFilter = screen.getByRole('combobox');
    expect(statusFilter).toHaveTextContent('Todos (3)');
    
    // Check that options show correct counts
    const options = screen.getAllByRole('option');
    expect(options.find(option => option.textContent?.includes('Pendientes (1)'))).toBeInTheDocument();
    expect(options.find(option => option.textContent?.includes('Seleccionados (1)'))).toBeInTheDocument();
    expect(options.find(option => option.textContent?.includes('Rechazados (1)'))).toBeInTheDocument();
  });

  it('handles applications with missing data gracefully', () => {
    const incompleteApplications: ApplicationWithCandidate[] = [
      {
        id: 'app-incomplete',
        uid: 'user-incomplete',
        vacancyId: 'vacancy-123',
        status: 'pending',
        createdAt: null as any,
        candidateName: '',
        candidateEmail: '',
        profileCompleted: false,
        experience: [],
        skills: [],
      },
    ];

    render(
      <ApplicationsList
        applications={incompleteApplications}
        onViewCandidate={mockOnViewCandidate}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Fecha no disponible')).toBeInTheDocument();
    // The component doesn't show skills count when there are no skills, so we check for incomplete profile instead
    expect(screen.getByText('Incompleto')).toBeInTheDocument();
  });
});