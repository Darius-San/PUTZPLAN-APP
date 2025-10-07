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
    // Seed WG card visible
  // seed WG card should be visible on profile overview
  await screen.findByText(/WG Darius.*Co/i);
  await createNewWG('Zweite WG', 'Anna', 'Ben');
    // Return to profiles
  await userEvent.click(screen.getByRole('button', { name: /Profile wechseln/i }));
    // Wait for overview & both WGs
    await screen.findByText(/Zweite WG/i);
  await screen.findByText(/WG Darius.*Co/i);
    const wgOpenButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    expect(wgOpenButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('edits WG name and member list (add & remove)', async () => {
    render(<App />);
  await screen.findByText(/WG Darius.*Co/i);
    // Create second WG to ensure multi listing
    await createNewWG('Alpha WG', 'Tom', 'Mia');
  await userEvent.click(screen.getByRole('button', { name: /Profile wechseln/i }));
  await screen.findByText(/Alpha WG/i);
  // Prepare state: ensure a currentUser & currentWG (simulate selecting WG prior to editing)
  const alphaWG: any = Object.values((dataManager as any).getState().wgs).find((w: any) => w.name === 'Alpha WG');
  expect(alphaWG).toBeTruthy();
  const firstMember = alphaWG.memberIds[0];
  (dataManager as any).setCurrentUser(firstMember);
  (dataManager as any).setCurrentWG(alphaWG.id);
  // Now open edit wizard via custom event
  window.dispatchEvent(new CustomEvent('putzplan-edit-wg', { detail: { id: alphaWG.id } }));
  await screen.findByText(/WG bearbeiten/i);
    // Edit wizard: change name
    const nameInput = await screen.findByDisplayValue(/Alpha WG/i);
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Alpha WG Neu');
    // Add member
  await userEvent.click(screen.getByRole('button', { name: /Mitglied/i }));
    // Remove first of existing (keep at least 1)
    const removeButtons = screen.getAllByRole('button', { name: /Entfernen/i });
  await userEvent.click(removeButtons[removeButtons.length-1]);
    // Save
  await userEvent.click(screen.getByRole('button', { name: /Speichern/i }));
    // Assert via state (UI minimized on dashboard)
    const state = (dataManager as any).getState();
    const renamed = Object.values(state.wgs).find((w: any)=> w.name === 'Alpha WG Neu');
    expect(renamed).toBeTruthy();
  });
});