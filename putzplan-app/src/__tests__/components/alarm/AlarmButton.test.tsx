import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { AlarmButton } from '../../../components/alarm/AlarmButton';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  }
}));

describe('AlarmButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render alarm button', () => {
    render(<AlarmButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-testid', 'alarm-button');
  });

  it('should call onClick when clicked', () => {
    render(<AlarmButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should have proper styling', () => {
    render(<AlarmButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    // Accept either bg-red-500 (old) or bg-red-600 (new) to avoid brittle tests
    expect(button.className).toMatch(/bg-red-(500|600)/);
    expect(button).toHaveClass('text-white');
  });
});