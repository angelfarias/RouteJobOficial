// frontend/app/components/__tests__/role-selector-visibility.spec.ts
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import RoleSwitcher from '../RoleSwitcher';
import RoleSelector from '../RoleSelector';
import { ProfileType } from '../../../lib/types/unified-email.types';

/**
 * Property Test 5.1: Role selector visibility
 * Validates: Requirements 2.1
 * 
 * Property: Role selector should only be visible when users have multiple profiles
 * and should be hidden when users have no profiles or only one profile.
 */

describe('Role Selector Visibility Properties', () => {
  const mockOnRoleSwitch = jest.fn();
  const mockOnRoleSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 4: Role selector visibility
   */
  it('should only show role switcher when user has multiple profiles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 0, maxLength: 2 }), // availableRoles
        (currentRole, availableRoles) => {
          // Ensure unique roles
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          
          const { container } = render(
            <RoleSwitcher
              currentRole={currentRole as ProfileType}
              availableRoles={uniqueRoles}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          // Property: RoleSwitcher should only render when there are multiple roles
          if (uniqueRoles.length <= 1) {
            // Should not render anything
            expect(container.firstChild).toBeNull();
          } else {
            // Should render the role switcher
            expect(container.firstChild).not.toBeNull();
            
            // Should show current role
            expect(screen.getByText(currentRole === 'candidate' ? 'Candidato' : 'Empresa')).toBeInTheDocument();
            
            // Should be clickable (have dropdown functionality)
            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).not.toBeDisabled();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should show appropriate content in role selector based on available roles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 0, maxLength: 2 }), // availableRoles
        fc.option(fc.constantFrom('candidate', 'company'), { nil: null }), // recommendedRole
        (availableRoles, recommendedRole) => {
          // Ensure unique roles
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          
          const { container } = render(
            <RoleSelector
              availableRoles={uniqueRoles}
              recommendedRole={recommendedRole as ProfileType | null}
              onRoleSelect={mockOnRoleSelect}
            />
          );

          if (uniqueRoles.length === 0) {
            // Should show "no profiles available" message
            expect(screen.getByText(/No hay perfiles disponibles/i)).toBeInTheDocument();
            expect(screen.getByText(/Crear perfil/i)).toBeInTheDocument();
          } else {
            // Should show role selection options
            uniqueRoles.forEach(role => {
              const roleLabel = role === 'candidate' ? 'Candidato' : 'Empresa';
              expect(screen.getByText(roleLabel)).toBeInTheDocument();
            });

            // Should show selection buttons for each role
            const continueButtons = screen.getAllByText(/Continuar como/i);
            expect(continueButtons).toHaveLength(uniqueRoles.length);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle loading states correctly', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isLoading
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 0, maxLength: 2 }), // availableRoles
        (isLoading, availableRoles) => {
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          
          if (isLoading) {
            // Test RoleSwitcher loading state
            render(
              <RoleSwitcher
                currentRole={null}
                availableRoles={uniqueRoles}
                isLoading={true}
                onRoleSwitch={mockOnRoleSwitch}
              />
            );
            
            expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
            
            // Test RoleSelector loading state
            const { rerender } = render(
              <RoleSelector
                availableRoles={uniqueRoles}
                onRoleSelect={mockOnRoleSelect}
                isLoading={true}
              />
            );
            
            expect(screen.getByText(/Cargando roles disponibles/i)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain visibility consistency across component states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 2, maxLength: 2 }), // availableRoles (always 2)
        fc.boolean(), // isOpen state
        (currentRole, availableRoles, isOpen) => {
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          
          // Skip if we don't have exactly 2 unique roles
          fc.pre(uniqueRoles.length === 2);
          
          const { container } = render(
            <RoleSwitcher
              currentRole={currentRole as ProfileType}
              availableRoles={uniqueRoles}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          // Should always render when multiple roles are available
          expect(container.firstChild).not.toBeNull();
          
          // Should show current role label
          const currentRoleLabel = currentRole === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getByText(currentRoleLabel)).toBeInTheDocument();
          
          // Should have a clickable button
          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          expect(button).not.toBeDisabled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should show correct role indicators for each profile type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // profileType
        (profileType) => {
          const { container } = render(
            <RoleSwitcher
              currentRole={profileType as ProfileType}
              availableRoles={['candidate', 'company']}
              onRoleSwitch={mockOnRoleSwitch}
            />
          );

          // Should render the component
          expect(container.firstChild).not.toBeNull();
          
          // Should show correct role label
          const expectedLabel = profileType === 'candidate' ? 'Candidato' : 'Empresa';
          expect(screen.getByText(expectedLabel)).toBeInTheDocument();
          
          // Should have appropriate styling classes based on role type
          const button = screen.getByRole('button');
          if (profileType === 'candidate') {
            expect(button).toHaveClass('text-emerald-600');
          } else {
            expect(button).toHaveClass('text-blue-600');
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});