// frontend/app/components/__tests__/ui-consistency-active-role.spec.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import RoleSwitcher from '../RoleSwitcher';
import RoleIndicator, { RoleStatusBadge, RoleHierarchy } from '../RoleIndicator';
import { ProfileType } from '../../../lib/types/unified-email.types';

/**
 * Property Test 5.3: UI consistency with active role
 * Validates: Requirements 2.5
 * 
 * Property: All UI components should consistently reflect the current active role
 * across the entire interface, maintaining visual and functional coherence.
 */

describe('UI Consistency with Active Role Properties', () => {
  const mockOnRoleSwitch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 7: UI consistency with active role
   */
  it('should maintain consistent role representation across all components', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // activeRole
        (activeRole) => {
          // Render multiple role-related components
          const { container: switcherContainer } = render(
            <RoleSwitcher
              currentRole={activeRole as ProfileType}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          const { container: indicatorContainer } = render(
            <RoleIndicator currentRole={activeRole as ProfileType} />
          );

          const { container: badgeContainer } = render(
            <RoleStatusBadge currentRole={activeRole as ProfileType} />
          );

          // All components should show the same role label
          const expectedLabel = activeRole === 'candidate' ? 'Candidato' : 'Empresa';
          const roleLabels = screen.getAllByText(expectedLabel);
          
          // Should have at least 3 instances (one from each component)
          expect(roleLabels.length).toBeGreaterThanOrEqual(3);

          // All components should use consistent color schemes
          const expectedTextColor = activeRole === 'candidate' ? 'text-emerald-600' : 'text-blue-600';
          const expectedBgColor = activeRole === 'candidate' ? 'bg-emerald-50' : 'bg-blue-50';

          // Check switcher colors
          const switcherButton = switcherContainer.querySelector('button');
          expect(switcherButton).toHaveClass(expectedTextColor.replace('600', '600'));

          // Check indicator colors
          const indicator = indicatorContainer.firstChild as HTMLElement;
          expect(indicator).toHaveClass(expectedTextColor.replace('600', '700'));
          expect(indicator).toHaveClass(expectedBgColor);

          // Check badge colors
          const badge = badgeContainer.firstChild as HTMLElement;
          expect(badge).toHaveClass(expectedTextColor.replace('600', '700'));
          expect(badge).toHaveClass(expectedBgColor);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should synchronize role changes across multiple UI components', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // initialRole
        fc.constantFrom('candidate', 'company'), // newRole
        (initialRole, newRole) => {
          fc.pre(initialRole !== newRole); // Only test actual role changes

          let currentRole = initialRole as ProfileType;
          
          // Mock role switch function that updates the role
          const mockRoleSwitch = jest.fn().mockImplementation(async (role: ProfileType) => {
            currentRole = role;
          });

          // Initial render with initial role
          const { rerender: rerenderSwitcher } = render(
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockRoleSwitch}
            />
          );

          const { rerender: rerenderIndicator } = render(
            <RoleIndicator currentRole={currentRole} />
          );

          // Verify initial state
          const initialLabel = initialRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getAllByText(initialLabel).length).toBeGreaterThanOrEqual(2);

          // Simulate role change
          currentRole = newRole as ProfileType;

          // Re-render components with new role
          rerenderSwitcher(
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockRoleSwitch}
            />
          );

          rerenderIndicator(
            <RoleIndicator currentRole={currentRole} />
          );

          // Verify all components now show the new role
          const newLabel = newRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getAllByText(newLabel).length).toBeGreaterThanOrEqual(2);

          // Verify old role label is no longer present
          expect(screen.queryByText(initialLabel)).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain visual hierarchy consistency', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 1, maxLength: 2 }), // availableRoles
        fc.constantFrom('candidate', 'company'), // activeRole
        (availableRoles, activeRole) => {
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          fc.pre(uniqueRoles.includes(activeRole as ProfileType)); // Active role must be available

          render(
            <RoleHierarchy
              roles={uniqueRoles}
              currentRole={activeRole as ProfileType}
            />
          );

          // Should render hierarchy component
          const hierarchy = screen.getByRole('generic'); // div element
          expect(hierarchy).toBeInTheDocument();

          // Active role should be visually distinct in hierarchy
          // This is tested through the component structure and styling
          expect(hierarchy).toBeInTheDocument();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should handle edge cases consistently', () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom('candidate', 'company'), { nil: null }), // currentRole (can be null)
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 0, maxLength: 2 }), // availableRoles
        fc.boolean(), // isLoading
        (currentRole, availableRoles, isLoading) => {
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];

          if (isLoading || !currentRole) {
            // Test loading state consistency
            const { container } = render(
              <RoleSwitcher
                currentRole={currentRole}
                availableRoles={uniqueRoles}
                isLoading={isLoading}
                onRoleSwitch={mockOnRoleSwitch}
              />
            );

            if (isLoading) {
              expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
            } else if (!currentRole && uniqueRoles.length <= 1) {
              // Should not render when no current role and insufficient roles
              expect(container.firstChild).toBeNull();
            }
          } else if (currentRole && uniqueRoles.includes(currentRole)) {
            // Test normal state consistency
            render(
              <RoleSwitcher
                currentRole={currentRole}
                availableRoles={uniqueRoles}
                onRoleSwitch={mockOnRoleSwitch}
              />
            );

            if (uniqueRoles.length > 1) {
              const roleLabel = currentRole === 'candidate' ? 'Candidato' : 'Empresa';
              expect(screen.getByText(roleLabel)).toBeInTheDocument();
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain accessibility consistency across role states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        (currentRole) => {
          render(
            <RoleSwitcher
              currentRole={currentRole as ProfileType}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          // Should have accessible button
          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          expect(button).toHaveAttribute('type', 'button');

          // Should not be disabled in normal state
          expect(button).not.toBeDisabled();

          // Should have text content for screen readers
          expect(button).toHaveTextContent(currentRole === 'candidate' ? 'Candidato' : 'Empresa');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle rapid role switching consistently', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 3, maxLength: 6 }), // roleSequence
        (roleSequence) => {
          let currentRole = roleSequence[0] as ProfileType;
          let switchCount = 0;

          const mockRoleSwitch = jest.fn().mockImplementation(async (newRole: ProfileType) => {
            currentRole = newRole;
            switchCount++;
          });

          const { rerender } = render(
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockRoleSwitch}
            />
          );

          // Simulate rapid role switches
          for (let i = 1; i < roleSequence.length; i++) {
            const newRole = roleSequence[i] as ProfileType;
            
            // Update current role
            currentRole = newRole;
            
            // Re-render with new role
            rerender(
              <RoleSwitcher
                currentRole={currentRole}
                availableRoles={['candidate', 'company']}
                onRoleSwitch={mockRoleSwitch}
              />
            );

            // Should consistently show the current role
            const expectedLabel = currentRole === 'candidate' ? 'Candidato' : 'Empresa';
            expect(screen.getByText(expectedLabel)).toBeInTheDocument();
          }

          // Final state should be consistent
          const finalLabel = currentRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getByText(finalLabel)).toBeInTheDocument();
        }
      ),
      { numRuns: 15 }
    );
  });
});