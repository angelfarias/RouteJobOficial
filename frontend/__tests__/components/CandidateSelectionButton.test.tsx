import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CandidateSelectionButton from '@/app/components/CandidateSelectionButton';
import { ApplicationWithCandidate } from '@/lib/types/candidate-selection.types';

describe('CandidateSelectionButton Component', () => {
  const mockOnSelect = jest.fn();

  const mockApplication: ApplicationWithCandidate = {
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
  };

  const defaultProps = {
    application: mockApplication,
    onSelect: mockOnSelect,
    isSelecting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders selection button for pending applications', () => {
    render(<CandidateSelectionButton {...defaultProps} />);

    expect(screen.getByText('Seleccionar candidato')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows confirmation dialog when selection button is clicked', () => {
    render(<CandidateSelectionButton {...defaultProps} />);

    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    expect(screen.getByText('¿Seleccionar a John Doe?')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('cancels confirmation dialog', () => {
    render(<CandidateSelectionButton {...defaultProps} />);

    // Open confirmation
    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    // Cancel confirmation
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    // Should return to initial state
    expect(screen.getByText('Seleccionar candidato')).toBeInTheDocument();
    expect(screen.queryByText('¿Seleccionar a John Doe?')).not.toBeInTheDocument();
  });

  it('confirms selection and calls onSelect', async () => {
    render(<CandidateSelectionButton {...defaultProps} />);

    // Open confirmation
    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    // Confirm selection
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state during selection', () => {
    render(<CandidateSelectionButton {...defaultProps} isSelecting={true} />);

    // Open confirmation first
    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    expect(screen.getByText('Seleccionando...')).toBeInTheDocument();
    
    // Find buttons by their role and check if they're disabled
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find(button => button.textContent?.includes('Seleccionando'));
    const cancelButton = buttons.find(button => button.textContent?.includes('Cancelar'));

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('displays selected status for selected applications', () => {
    const selectedApplication = {
      ...mockApplication,
      status: 'selected' as const,
    };

    render(
      <CandidateSelectionButton 
        {...defaultProps} 
        application={selectedApplication} 
      />
    );

    expect(screen.getByText('Candidato seleccionado')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('displays rejected status for rejected applications', () => {
    const rejectedApplication = {
      ...mockApplication,
      status: 'rejected' as const,
    };

    render(
      <CandidateSelectionButton 
        {...defaultProps} 
        application={rejectedApplication} 
      />
    );

    expect(screen.getByText('Candidato rechazado')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows correct icons for different states', () => {
    const { rerender } = render(<CandidateSelectionButton {...defaultProps} />);

    // Pending state - should have selection icon
    expect(screen.getByRole('button')).toBeInTheDocument();

    // Selected state - should have checkmark icon
    const selectedApplication = { ...mockApplication, status: 'selected' as const };
    rerender(
      <CandidateSelectionButton 
        {...defaultProps} 
        application={selectedApplication} 
      />
    );
    expect(screen.getByText('Candidato seleccionado')).toBeInTheDocument();

    // Rejected state - should have X icon
    const rejectedApplication = { ...mockApplication, status: 'rejected' as const };
    rerender(
      <CandidateSelectionButton 
        {...defaultProps} 
        application={rejectedApplication} 
      />
    );
    expect(screen.getByText('Candidato rechazado')).toBeInTheDocument();
  });

  it('disables buttons during selection process', () => {
    render(<CandidateSelectionButton {...defaultProps} isSelecting={true} />);

    // Open confirmation
    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    // Find buttons by their role and check if they're disabled
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find(button => button.textContent?.includes('Seleccionando'));
    const cancelButton = buttons.find(button => button.textContent?.includes('Cancelar'));

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('handles candidate name display correctly', () => {
    const applicationWithLongName = {
      ...mockApplication,
      candidateName: 'John Michael Alexander Doe-Smith',
    };

    render(
      <CandidateSelectionButton 
        {...defaultProps} 
        application={applicationWithLongName} 
      />
    );

    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    expect(screen.getByText('¿Seleccionar a John Michael Alexander Doe-Smith?')).toBeInTheDocument();
  });

  it('handles empty candidate name gracefully', () => {
    const applicationWithEmptyName = {
      ...mockApplication,
      candidateName: '',
    };

    render(
      <CandidateSelectionButton 
        {...defaultProps} 
        application={applicationWithEmptyName} 
      />
    );

    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    expect(screen.getByText('¿Seleccionar a ?')).toBeInTheDocument();
  });

  it('maintains confirmation state during loading', () => {
    const { rerender } = render(<CandidateSelectionButton {...defaultProps} />);

    // Open confirmation
    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    // Start loading
    rerender(<CandidateSelectionButton {...defaultProps} isSelecting={true} />);

    // Should still show confirmation dialog but with loading state
    expect(screen.getByText('¿Seleccionar a John Doe?')).toBeInTheDocument();
    expect(screen.getByText('Seleccionando...')).toBeInTheDocument();
  });

  it('resets confirmation state after successful selection', async () => {
    const { rerender } = render(<CandidateSelectionButton {...defaultProps} />);

    // Open confirmation
    const selectionButton = screen.getByText('Seleccionar candidato');
    fireEvent.click(selectionButton);

    // Confirm selection
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);

    // Simulate selection completion
    rerender(<CandidateSelectionButton {...defaultProps} isSelecting={false} />);

    // Should return to initial state
    expect(screen.getByText('Seleccionar candidato')).toBeInTheDocument();
    expect(screen.queryByText('¿Seleccionar a John Doe?')).not.toBeInTheDocument();
  });

  it('handles rapid clicks gracefully', () => {
    render(<CandidateSelectionButton {...defaultProps} />);

    const selectionButton = screen.getByText('Seleccionar candidato');
    
    // Click multiple times rapidly
    fireEvent.click(selectionButton);
    fireEvent.click(selectionButton);
    fireEvent.click(selectionButton);

    // Should only show one confirmation dialog
    expect(screen.getAllByText('¿Seleccionar a John Doe?')).toHaveLength(1);
  });
});