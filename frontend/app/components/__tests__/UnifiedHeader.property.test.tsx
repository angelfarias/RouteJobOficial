/**
 * Property-based tests for UnifiedHeader component
 * Feature: Enhanced Profile System, Property 2: Header design consistency
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { render, screen } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import fc from 'fast-check';
import UnifiedHeader from '../UnifiedHeader';
import type { User } from 'firebase/auth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

const mockUser: User = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  phoneNumber: null,
  photoURL: null,
  providerId: '',
};

describe('UnifiedHeader Property Tests', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    jest.clearAllMocks();
  });

  /**
   * Property 2: Header design consistency
   * For any page navigation, the header should maintain consistent typography, 
   * layout, and Smart feature highlighting across all application pages.
   */
  test('Property 2: Header design consistency across all pages', () => {
    fc.assert(
      fc.property(
        fc.record({
          currentPage: fc.constantFrom('dashboard', 'smart-cv', 'smart-match', 'company', 'jobs', 'profile'),
          pathname: fc.constantFrom('/dashboard', '/dashboard/perfil/smart', '/dashboard/mapa', '/company', '/dashboard/jobs', '/dashboard/perfil'),
          showSmartFeatures: fc.boolean(),
          userDisplayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
        }),
        ({ currentPage, pathname, showSmartFeatures, userDisplayName }) => {
          // Setup
          (usePathname as jest.Mock).mockReturnValue(pathname);
          const testUser = { ...mockUser, displayName: userDisplayName };

          // Render header with random configuration
          const { container } = render(
            <UnifiedHeader
              currentPage={currentPage}
              user={testUser}
              showSmartFeatures={showSmartFeatures}
            />
          );

          // Property: Header should always have consistent base structure
          const header = container.querySelector('header');
          expect(header).toBeInTheDocument();
          expect(header).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50', 'h-16');
          expect(header).toHaveClass('bg-white/80', 'backdrop-blur-xl', 'border-b', 'border-zinc-200/60', 'shadow-sm');

          // Property: Logo should always be present and consistent
          const logo = screen.getByAltText('RouteJob');
          expect(logo).toBeInTheDocument();
          const logoContainer = logo.closest('div');
          expect(logoContainer).toHaveClass('relative', 'w-32', 'h-10');

          // Property: Navigation should maintain consistent typography
          const navButtons = container.querySelectorAll('nav button');
          navButtons.forEach(button => {
            expect(button).toHaveClass('font-semibold', 'transition-all');
            // Should have consistent text size (text-sm is applied to nav)
            const nav = button.closest('nav');
            expect(nav).toHaveClass('text-sm');
          });

          // Property: Smart features should be highlighted consistently when enabled
          if (showSmartFeatures) {
            const smartButtons = Array.from(navButtons).filter(button => 
              button.textContent?.includes('Smart CV') || button.textContent?.includes('Smart Match')
            );
            
            smartButtons.forEach(button => {
              // Smart features should have AI badge
              const aiBadge = button.querySelector('span');
              if (aiBadge && aiBadge.textContent === 'AI') {
                expect(aiBadge).toHaveClass('bg-gradient-to-r', 'from-purple-100', 'to-blue-100', 'text-purple-700');
              }
            });
          }

          // Property: User menu should always be present and consistent
          const userMenuButton = container.querySelector('button[class*="rounded-full"][class*="border-zinc-200"]');
          expect(userMenuButton).toBeInTheDocument();
          expect(userMenuButton).toHaveClass('flex', 'items-center', 'gap-2', 'rounded-full', 'border', 'border-zinc-200');

          // Property: Mobile menu toggle should always be present
          const mobileToggle = container.querySelector('button.md\\:hidden');
          expect(mobileToggle).toBeInTheDocument();

          // Property: Notification button should always be present
          const notificationButton = container.querySelector('button[class*="relative"][class*="rounded-full"][class*="p-2"]');
          expect(notificationButton).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Smart feature highlighting consistency
   * For any Smart feature (Smart CV, Smart Match), the highlighting should be 
   * consistent with purple/blue gradient styling when active.
   */
  test('Property: Smart feature highlighting consistency', () => {
    fc.assert(
      fc.property(
        fc.record({
          currentPage: fc.constantFrom('smart-cv', 'smart-match'),
          showSmartFeatures: fc.constant(true),
        }),
        ({ currentPage }) => {
          // Setup
          const pathname = currentPage === 'smart-cv' ? '/dashboard/perfil/smart' : '/dashboard/mapa';
          (usePathname as jest.Mock).mockReturnValue(pathname);

          // Render header
          const { container } = render(
            <UnifiedHeader
              currentPage={currentPage}
              user={mockUser}
              showSmartFeatures={true}
            />
          );

          // Property: Active Smart feature should have purple highlighting
          const activeSmartButton = Array.from(container.querySelectorAll('nav button')).find(button => {
            const isSmartCV = button.textContent?.includes('Smart CV') && currentPage === 'smart-cv';
            const isSmartMatch = button.textContent?.includes('Smart Match') && currentPage === 'smart-match';
            return isSmartCV || isSmartMatch;
          });

          if (activeSmartButton) {
            expect(activeSmartButton).toHaveClass('text-purple-600');
            // Should have gradient underline for active state
            expect(activeSmartButton.className).toMatch(/after:bg-gradient-to-r.*after:from-purple-500.*after:to-blue-500/);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Typography consistency
   * For any navigation state, the typography should remain consistent with 
   * the homepage design patterns.
   */
  test('Property: Typography consistency across navigation states', () => {
    fc.assert(
      fc.property(
        fc.record({
          pages: fc.array(fc.constantFrom('dashboard', 'smart-cv', 'smart-match', 'company', 'jobs', 'profile'), { minLength: 1, maxLength: 6 }),
        }),
        ({ pages }) => {
          pages.forEach(page => {
            // Setup for each page
            const pathMap: Record<string, string> = {
              'dashboard': '/dashboard',
              'smart-cv': '/dashboard/perfil/smart',
              'smart-match': '/dashboard/mapa',
              'company': '/company',
              'jobs': '/dashboard/jobs',
              'profile': '/dashboard/perfil',
            };
            
            (usePathname as jest.Mock).mockReturnValue(pathMap[page]);

            // Render header
            const { container } = render(
              <UnifiedHeader
                currentPage={page}
                user={mockUser}
                showSmartFeatures={true}
              />
            );

            // Property: All navigation text should use consistent font classes
            const navElement = container.querySelector('nav');
            expect(navElement).toHaveClass('text-sm'); // Consistent with homepage

            const navButtons = container.querySelectorAll('nav button');
            navButtons.forEach(button => {
              expect(button).toHaveClass('font-semibold'); // Consistent with homepage
            });

            // Property: Header container should maintain consistent max-width and padding
            const headerContainer = container.querySelector('header > div');
            expect(headerContainer).toHaveClass('mx-auto', 'max-w-7xl', 'px-6'); // Consistent with homepage
          });
        }
      ),
      { numRuns: 30 }
    );
  });
});