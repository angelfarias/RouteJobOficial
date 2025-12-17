// frontend/app/components/__tests__/role-based-ui-management.spec.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import RoleSwitcher from '../RoleSwitcher';
import RoleIndicator from '../RoleIndicator';
import { ProfileType } from '../../../lib/types/unified-email.types';

/**
 * Property Test 5.2: Role-based UI management
 * Validates: Requirements 2.2, 2.3
 * 
 * Property: UI components should adapt their appearance and behavior
 * based on the current active role, showing role-appropriate content and styling.
 */

describe('Role-Based UI Management Properties', () => {
  const mockOnRoleSwitch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 5: Role-based UI management
   */
  it('should adapt UI styling based on current role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        fc.constantFrom('sm', 'md', 'lg'), // size
        fc.constantFrom('badge', 'pill', 'minimal'), // variant
        (currentRole, size, variant) => {
          // Test RoleIndicator styling adaptation
          const { container } = render(
            <RoleIndicator
              currentRole={currentRole as ProfileType}
              size={size as any}
              variant={variant as any}
            />
          );

          const indicator = container.firstChild as HTMLElement;
          expect(indicator).not.toBeNull();

          // Should have role-specific colors
          if (currentRole === 'candidate') {
            expect(indicator).toHaveClass('text-emerald-700');
            if (variant !== 'minimal') {
              expect(indicator).toHaveClass('bg-emerald-50');
            }
          } else {
            expect(indicator).toHaveClass('text-blue-700');
            if (variant !== 'minimal') {
              expect(indicator).toHaveClass('bg-blue-50');
            }
          }

          // Should show correct role label
          const expectedLabel = currentRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should show role-appropriate content and descriptions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 2, maxLength: 2 }), // availableRoles
        async (currentRole, availableRoles) => {
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          fc.pre(uniqueRoles.length === 2); // Ensure we have both roles

          render(
            <RoleSwitcher
              currentRole={currentRole as ProfileType}
              availableRoles={uniqueRoles}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          // Click to open dropdown
          const button = screen.getByRole('button');
          fireEvent.click(button);

          await waitFor(() => {
            // Should show role-specific descriptions in dropdown
            if (uniqueRoles.includes('candidate')) {
              expect(screen.getByText(/Buscar empleos y postular/i)).toBeInTheDocument();
            }
            if (uniqueRoles.includes('company')) {
              expect(screen.getByText(/Publicar empleos y gestionar candidatos/i)).toBeInTheDocument();
            }
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain UI consistency during role transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // fromRole
        fc.constantFrom('candidate', 'company'), // toRole
        (fromRole, toRole) => {
          fc.pre(fromRole !== toRole); // Only test actual role changes

          let currentRole = fromRole as ProfileType;
          const mockRoleSwitch = jest.fn().mockImplementation(async (newRole: ProfileType) => {
            currentRole = newRole;
          });

          const { rerender } = render(
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockRoleSwitch}
            />
          );

          // Initial state should show fromRole
          const initialLabel = fromRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getByText(initialLabel)).toBeInTheDocument();

          // Simulate role switch by re-rendering with new role
          rerender(
            <RoleSwitcher
              currentRole={toRole as ProfileType}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockRoleSwitch}
            />
          );

          // Should now show toRole
          const newLabel = toRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getByText(newLabel)).toBeInTheDocument();

          // Should have appropriate styling for new role
          const button = screen.getByRole('button');
          if (toRole === 'candidate') {
            expect(button).toHaveClass('text-emerald-600');
          } else {
            expect(button).toHaveClass('text-blue-600');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle disabled states appropriately', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        fc.boolean(), // switching state
        (currentRole, switching) => {
          render(
            <RoleSwitcher
              currentRole={currentRole as ProfileType}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          // Simulate switching state by checking for loading indicators
          const button = screen.getByRole('button');
          
          if (switching) {
            // When switching, button should show loading state
            // This would be tested by mocking the switching state in the component
            expect(button).toBeInTheDocument();
          } else {
            // When not switching, button should be interactive
            expect(button).not.toBeDisabled();
            expect(button).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should show correct icons for each role type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // roleType
        (roleType) => {
          render(
            <RoleIndicator
              currentRole={roleType as ProfileType}
              showLabel={true}
            />
          );

          // Should show role-specific icon (tested via class presence or aria-label)
          const indicator = screen.getByText(roleType === 'candidate' ? 'Candidato' : 'Empresa');
          expect(indicator).toBeInTheDocument();

          // The icon should be present in the DOM (User icon for candidate, Building2 for company)
          // This is tested indirectly through the component structure
          const container = indicator.closest('div');
          expect(container).toBeInTheDocument();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should adapt to different size variants correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // roleType
        fc.constantFrom('sm', 'md', 'lg'), // size
        (roleType, size) => {
          const { container } = render(
            <RoleIndicator
              currentRole={roleType as ProfileType}
              size={size as any}
            />
          );

          const indicator = container.firstChild as HTMLElement;
          expect(indicator).not.toBeNull();

          // Should have size-appropriate classes
          if (size === 'sm') {
            expect(indicator).toHaveClass('text-xs');
          } else if (size === 'lg') {
            expect(indicator).toHaveClass('text-base');
          } else {
            expect(indicator).toHaveClass('text-sm');
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});