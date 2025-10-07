import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Basic smoke & flow tests for WGCreationWizard.

describe('WG Creation Wizard', () => {
	beforeEach(() => {
		// Clear localStorage AND in-memory data manager state to avoid phase leakage
		window.localStorage.clear();
		(dataManager as any).clearAllData();
	});

	const startWizard = async () => {
		render(<App />);
		// If dashboard is shown (previous test leakage), navigate back first
		const addTask = screen.queryByTestId('add-task-btn');
		if (addTask) {
			// @ts-ignore
			window.confirm = () => true;
			await userEvent.click(screen.getByRole('button', { name: /Profile wechseln/i }));
		}
		const newBtn = await screen.findByTestId('create-wg-btn');
		await userEvent.click(newBtn);
	};

 	it('walks through all steps and creates a WG', async () => {
		await startWizard();

		// Step 0: Name
		const nameStep = screen.getByTestId('step-name');
		const input = within(nameStep).getByPlaceholderText(/z\.B\./i);
		await userEvent.clear(input);
		await userEvent.type(input, 'Test WG');
		const next = screen.getByTestId('next-btn');
		await userEvent.click(next);

		// Step 1: Size
		const sizeStep = screen.getByTestId('step-size');
		const sizeInput = within(sizeStep).getByRole('spinbutton');
		await userEvent.clear(sizeInput);
		await userEvent.type(sizeInput, '2');
		await userEvent.click(screen.getByTestId('next-btn'));

		// Step 2: Members
		const memberStep = screen.getByTestId('step-members');
		const memberInputs = within(memberStep).getAllByPlaceholderText(/Mitglied \d+ Name/);
		await userEvent.clear(memberInputs[0]);
		await userEvent.type(memberInputs[0], 'Alice');
		await userEvent.clear(memberInputs[1]);
		await userEvent.type(memberInputs[1], 'Bob');
		await userEvent.click(screen.getByTestId('next-btn'));

		// Step 3: Summary
		const summary = screen.getByTestId('step-summary');
		expect(within(summary).getByText(/Test WG/)).toBeInTheDocument();
		const createBtn = screen.getByRole('button', { name: /WG erstellen/i });
		await userEvent.click(createBtn);

			// Should land on minimal dashboard (look for add-task button)
			expect(screen.getByTestId('add-task-btn')).toBeInTheDocument();
	});

	it('validates duplicate member names', async () => {
		await startWizard();
		// Name
		await userEvent.clear(screen.getByPlaceholderText(/z\.B\./i));
		await userEvent.type(screen.getByPlaceholderText(/z\.B\./i), 'Dup WG');
		await userEvent.click(screen.getByTestId('next-btn'));
		// Size 2
		await userEvent.clear(screen.getByRole('spinbutton'));
		await userEvent.type(screen.getByRole('spinbutton'), '2');
		await userEvent.click(screen.getByTestId('next-btn'));
		// Members
		const memberStep = screen.getByTestId('step-members');
		const memberInputs = within(memberStep).getAllByPlaceholderText(/Mitglied \d+ Name/);
		await userEvent.clear(memberInputs[0]);
		await userEvent.type(memberInputs[0], 'Same');
		await userEvent.clear(memberInputs[1]);
		await userEvent.type(memberInputs[1], 'Same');
		// Next should be disabled
		const next = screen.getByTestId('next-btn');
		expect(next).toBeDisabled();
		expect(screen.getByText(/Doppelte Namen/i)).toBeInTheDocument();
	});

	it('allows going back to adjust size', async () => {
		await startWizard();
		await userEvent.clear(screen.getByPlaceholderText(/z\.B\./i));
		await userEvent.type(screen.getByPlaceholderText(/z\.B\./i), 'Back WG');
		await userEvent.click(screen.getByTestId('next-btn'));
		await userEvent.clear(screen.getByRole('spinbutton'));
		await userEvent.type(screen.getByRole('spinbutton'), '4');
		await userEvent.click(screen.getByTestId('next-btn'));
		// Now on members
		expect(screen.getByTestId('step-members')).toBeInTheDocument();
		// Go back
		await userEvent.click(screen.getByRole('button', { name: /Zurück/i }));
		// Size step again
		expect(screen.getByTestId('step-size')).toBeInTheDocument();
	});
});

