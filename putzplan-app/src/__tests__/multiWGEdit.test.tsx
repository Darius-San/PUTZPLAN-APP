import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Helper to open WG creation wizard and create a basic WG with 2 members
async function createNewWG(name: string, member1: string, member2: string) {
  await userEvent.click(await screen.findByRole('button', { name: /Neue WG erstellen/i }));
  // Step 1 Name
  const nameInput = await screen.findByPlaceholderText(/z\.B\. Sonnen WG/i);
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, name);
  await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
  // Step 2 Size: default is 3, set to 2 explicitly then continue
  const sizeInput = await screen.findByRole('spinbutton');
  await userEvent.clear(sizeInput);
  await userEvent.type(sizeInput, '2');
  await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
  // Step 3 Members (now exactly 2 member inputs)
  const memberInputs = await screen.findAllByPlaceholderText(/Mitglied \d+ Name/i);
  expect(memberInputs.length).toBe(2);
  await userEvent.clear(memberInputs[0]);
  await userEvent.type(memberInputs[0], member1);
  await userEvent.clear(memberInputs[1]);
  await userEvent.type(memberInputs[1], member2);
  await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
  // Step 4 Summary -> Create
  await screen.findByTestId('step-summary');
  await userEvent.click(screen.getByRole('button', { name: /WG erstellen/i }));
  // Arrive at minimal dashboard
  await screen.findByTestId('add-task-btn');
}

describe('Multi WG & Edit Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure confirmation dialogs auto-accept in tests
    // @ts-ignore
    window.confirm = () => true;
  });

  it('creates a second WG and shows both on overview', async () => {
    render(<App />);
    // Wait seed WG via its open button testid pattern
    const seedOpen = await screen.findByTestId(/open-wg-/);
    expect(seedOpen).toBeTruthy();
    await createNewWG('Zweite WG', 'Anna', 'Ben');
    // Return to profiles (profile switch button on dashboard)
    await userEvent.click(await screen.findByRole('button', { name: /Profile wechseln/i }));
    // Verify both WG open buttons present
    const openBtns = await screen.findAllByTestId(/open-wg-/);
    expect(openBtns.length).toBeGreaterThanOrEqual(2);
  }, 15000);

  it('edits WG name and member list (add & remove)', async () => {
    render(<App />);
    // Wait for the seeded default WG to appear (more specific than regex to avoid multiple match error)
    await screen.findByTestId('open-wg-wg-darius');
    await createNewWG('Alpha WG', 'Tom', 'Mia');
    await userEvent.click(await screen.findByRole('button', { name: /Profile wechseln/i }));
    // Collect WG IDs
    const state1 = (dataManager as any).getState();
    const alphaWG: any = Object.values(state1.wgs).find((w: any) => w.name === 'Alpha WG');
    expect(alphaWG).toBeTruthy();
    // Simulate selecting Alpha WG
    (dataManager as any).setCurrentUser(alphaWG.memberIds[0]);
    (dataManager as any).setCurrentWG(alphaWG.id);
    // Trigger edit
    window.dispatchEvent(new CustomEvent('putzplan-edit-wg', { detail: { id: alphaWG.id } }));
    await screen.findByText(/WG bearbeiten/i);
    const nameInput = await screen.findByDisplayValue(/Alpha WG/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Alpha WG Neu');
    await userEvent.click(screen.getByRole('button', { name: /Mitglied/i }));
    const removeButtons = screen.getAllByRole('button', { name: /Entfernen/i });
    if (removeButtons.length > 0) await userEvent.click(removeButtons[removeButtons.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /Speichern/i }));
    const state2 = (dataManager as any).getState();
    const renamed = Object.values(state2.wgs).find((w: any) => w.name === 'Alpha WG Neu');
    expect(renamed).toBeTruthy();
  }, 15000);
});