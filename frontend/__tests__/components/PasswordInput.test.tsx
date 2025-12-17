import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordInput from '@/app/components/PasswordInput';

describe('PasswordInput Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders password input with placeholder', () => {
    render(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        placeholder="Enter password"
      />
    );

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility when eye icon is clicked', () => {
    render(
      <PasswordInput
        value="test123"
        onChange={mockOnChange}
        placeholder="Password"
      />
    );

    const input = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByLabelText('Mostrar contraseña');

    // Initially should be password type
    expect(input).toHaveAttribute('type', 'password');

    // Click to show password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');

    // Click to hide password again
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when input value changes', () => {
    render(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        placeholder="Password"
      />
    );

    const input = screen.getByPlaceholderText('Password');
    fireEvent.change(input, { target: { value: 'newpassword' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('applies error styling when hasError is true', () => {
    render(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        placeholder="Password"
        hasError={true}
      />
    );

    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveClass('border-red-300');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        placeholder="Password"
        size="sm"
      />
    );

    let input = screen.getByPlaceholderText('Password');
    expect(input).toHaveClass('text-sm');

    rerender(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        placeholder="Password"
        size="lg"
      />
    );

    input = screen.getByPlaceholderText('Password');
    expect(input).toHaveClass('text-base');
  });
});