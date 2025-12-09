import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NumberPicker from '../../../components/ui/NumberPicker';

describe('NumberPicker', () => {
  it('opens modal, enters digits, backspaces and confirms value', () => {
    const onChange = vi.fn();
    render(<NumberPicker value={0} onChange={onChange} min={0} max={9999} label="Test" dataTestId="np-btn" />);

    const btn = screen.getByTestId('np-btn');
    fireEvent.click(btn);

    expect(screen.getByTestId('number-picker-modal')).toBeTruthy();

    // Press 1,2,3 -> should display 123
    fireEvent.click(screen.getByTestId('np-digit-1'));
    fireEvent.click(screen.getByTestId('np-digit-2'));
    fireEvent.click(screen.getByTestId('np-digit-3'));
    expect(screen.getByTestId('np-display').textContent).toBe('123');

    // Backspace -> 12
    fireEvent.click(screen.getByTestId('np-backspace'));
    expect(screen.getByTestId('np-display').textContent).toBe('12');

    // Clear -> 0
    fireEvent.click(screen.getByTestId('np-clear'));
    expect(screen.getByTestId('np-display').textContent).toBe('0');

    // Enter 7, confirm
    fireEvent.click(screen.getByTestId('np-digit-7'));
    fireEvent.click(screen.getByTestId('np-confirm'));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('calls onNext after confirming when Next is pressed', () => {
    const onChange = vi.fn();
    const onNext = vi.fn();
    render(<NumberPicker value={5} onChange={onChange} min={0} max={10} label="NextTest" dataTestId="np2-btn" onNext={onNext} />);

    const btn = screen.getByTestId('np2-btn');
    fireEvent.click(btn);
    fireEvent.click(screen.getByTestId('np-digit-8'));
    fireEvent.click(screen.getByTestId('np-next'));

  expect(onChange).toHaveBeenCalledWith(10); // clamps to max (10)
    expect(onNext).toHaveBeenCalled();
  });
});
