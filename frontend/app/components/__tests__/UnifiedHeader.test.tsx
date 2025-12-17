/**
 * Unit tests for UnifiedHeader component
 * Requirements: 2.1, 2.2, 2.3
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
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

describe('UnifiedHeader', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders header with logo and navigation', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      // Check logo
      expect(screen.getByAltText('RouteJob')).toBeInTheDocument();
      
      // Check navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Buscar empleos')).toBeInTheDocument();
      expect(screen.getByText('Smart Match')).toBeInTheDocument();
      expect(screen.getByText('Smart CV')).toBeInTheDocument();
      expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    });

    test('displays user information correctly', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    test('displays email when displayName is not available', () => {
      const userWithoutName = { ...mockUser, displayName: null };
      render(<UnifiedHeader user={userWithoutName} />);
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('Navigation Highlighting', () => {
    test('highlights dashboard when on dashboard page', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      render(<UnifiedHeader currentPage="dashboard" user={mockUser} />);
      
      const dashboardButton = screen.getByText('Dashboard');
      expect(dashboardButton).toHaveClass('text-emerald-600');
    });

    test('highlights Smart CV when on smart profile page', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard/perfil/smart');
      render(<UnifiedHeader currentPage="smart-cv" user={mockUser} />);
      
      const smartCVButton = screen.getByText('Smart CV');
      expect(smartCVButton).toHaveClass('text-purple-600');
    });

    test('highlights Smart Match when on map page', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard/mapa');
      render(<UnifiedHeader currentPage="smart-match" user={mockUser} />);
      
      const smartMatchButton = screen.getByText('Smart Match');
      expect(smartMatchButton).toHaveClass('text-purple-600');
    });

    test('shows AI badges for Smart features when enabled', () => {
      render(<UnifiedHeader user={mockUser} showSmartFeatures={true} />);
      
      const aiBadges = screen.getAllByText('AI');
      expect(aiBadges).toHaveLength(2); // Smart CV and Smart Match
      
      aiBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-gradient-to-r', 'from-purple-100', 'to-blue-100', 'text-purple-700');
      });
    });

    test('hides AI badges when Smart features are disabled', () => {
      render(<UnifiedHeader user={mockUser} showSmartFeatures={false} />);
      
      expect(screen.queryByText('AI')).not.toBeInTheDocument();
    });
  });

  describe('Company Mode', () => {
    test('shows company navigation when in company mode', () => {
      (usePathname as jest.Mock).mockReturnValue('/company');
      render(<UnifiedHeader currentPage="company" user={mockUser} />);
      
      expect(screen.getByText('Panel empresa')).toBeInTheDocument();
      expect(screen.getByText('Modo candidato')).toBeInTheDocument();
      
      // Should not show regular navigation items
      expect(screen.queryByText('Buscar empleos')).not.toBeInTheDocument();
    });

    test('does not show "Cuenta empresa" button in company mode', () => {
      (usePathname as jest.Mock).mockReturnValue('/company');
      render(<UnifiedHeader currentPage="company" user={mockUser} />);
      
      expect(screen.queryByText('Cuenta empresa')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Actions', () => {
    test('navigates to correct pages when navigation items are clicked', async () => {
      render(<UnifiedHeader user={mockUser} />);
      
      fireEvent.click(screen.getByText('Dashboard'));
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      
      fireEvent.click(screen.getByText('Smart CV'));
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/perfil/smart');
      
      fireEvent.click(screen.getByText('Smart Match'));
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/mapa');
    });

    test('navigates to company page when logo is clicked in company mode', () => {
      (usePathname as jest.Mock).mockReturnValue('/company');
      render(<UnifiedHeader currentPage="company" user={mockUser} />);
      
      const logo = screen.getByAltText('RouteJob');
      fireEvent.click(logo.closest('div')!);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/company');
    });

    test('navigates to dashboard when logo is clicked in candidate mode', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const logo = screen.getByAltText('RouteJob');
      fireEvent.click(logo.closest('div')!);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('User Menu', () => {
    test('opens and closes user menu when clicked', async () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const userMenuButton = screen.getByText('Test User').closest('button')!;
      
      // Menu should not be visible initially
      expect(screen.queryByText('Mi perfil candidato')).not.toBeInTheDocument();
      
      // Click to open menu
      fireEvent.click(userMenuButton);
      await waitFor(() => {
        expect(screen.getByText('Mi perfil candidato')).toBeInTheDocument();
      });
      
      // Click again to close menu
      fireEvent.click(userMenuButton);
      await waitFor(() => {
        expect(screen.queryByText('Mi perfil candidato')).not.toBeInTheDocument();
      });
    });

    test('shows correct menu items in candidate mode', async () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const userMenuButton = screen.getByText('Test User').closest('button')!;
      fireEvent.click(userMenuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Mi perfil candidato')).toBeInTheDocument();
        expect(screen.getByText('Smart CV Assistant')).toBeInTheDocument();
        expect(screen.getByText('Panel empresa')).toBeInTheDocument();
        expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
      });
    });

    test('shows correct menu items in company mode', async () => {
      (usePathname as jest.Mock).mockReturnValue('/company');
      render(<UnifiedHeader currentPage="company" user={mockUser} />);
      
      const userMenuButton = screen.getByText('Test User').closest('button')!;
      fireEvent.click(userMenuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Volver a modo candidato')).toBeInTheDocument();
        expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
        expect(screen.queryByText('Mi perfil candidato')).not.toBeInTheDocument();
      });
    });

    test('calls onLogout when logout is clicked', async () => {
      const mockOnLogout = jest.fn();
      render(<UnifiedHeader user={mockUser} onLogout={mockOnLogout} />);
      
      const userMenuButton = screen.getByText('Test User').closest('button')!;
      fireEvent.click(userMenuButton);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Cerrar sesión');
        fireEvent.click(logoutButton);
      });
      
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  describe('Mobile Menu', () => {
    test('opens and closes mobile menu when toggle is clicked', async () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const mobileToggle = screen.getByRole('button', { name: /menu/i });
      
      // Click to open mobile menu
      fireEvent.click(mobileToggle);
      
      // Mobile menu should show navigation items
      await waitFor(() => {
        const mobileMenuItems = screen.getAllByText('Dashboard');
        expect(mobileMenuItems.length).toBeGreaterThan(1); // Desktop + mobile
      });
    });

    test('closes mobile menu when navigation item is clicked', async () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const mobileToggle = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(mobileToggle);
      
      await waitFor(() => {
        const mobileMenuItems = screen.getAllByText('Dashboard');
        // Click on mobile menu item (should be the second one)
        fireEvent.click(mobileMenuItems[1]);
      });
      
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Responsive Behavior', () => {
    test('shows mobile menu toggle on mobile screens', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const mobileToggle = screen.getByRole('button', { name: /menu/i });
      expect(mobileToggle).toHaveClass('md:hidden');
    });

    test('hides desktop navigation on mobile screens', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const desktopNav = screen.getByText('Dashboard').closest('nav');
      expect(desktopNav).toHaveClass('hidden', 'md:flex');
    });
  });

  describe('Notifications', () => {
    test('shows notification button with badge', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const notificationButton = screen.getByRole('button', { name: /bell/i });
      expect(notificationButton).toBeInTheDocument();
      
      // Check for notification badge
      const badge = notificationButton.querySelector('span');
      expect(badge).toHaveTextContent('3');
      expect(badge).toHaveClass('bg-red-500');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      // Check that buttons have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check that navigation has proper structure
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    test('supports keyboard navigation', () => {
      render(<UnifiedHeader user={mockUser} />);
      
      const firstButton = screen.getByText('Dashboard');
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });
});