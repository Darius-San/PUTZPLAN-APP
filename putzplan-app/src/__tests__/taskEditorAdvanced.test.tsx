import { describe, it, beforeEach, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';

async function enterDashboard() {
  if (screen.queryByTestId('add-task-btn')) return;
  const openBtn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(openBtn);
  await screen.findByTestId('add-task-btn');
}

function openEditor() {
  fireEvent.click(screen.getByTestId('add-task-btn'));
  return screen.findByTestId('task-form-card');
}

function createBasicTask(name: string) {
  const nameInput = screen.getByTestId('task-name-input');
  fireEvent.change(nameInput, { target: { value: name }});
  fireEvent.click(screen.getByRole('button', { name: /Task speichern/i }));
}

describe('Task Editor Advanced', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('persists created tasks and lists them on reopen', async () => {
    render(<App />);
    await enterDashboard();
    await openEditor();
    createBasicTask('Alpha');
    // back to dashboard
    await screen.findByTestId('add-task-btn');
    // reopen
    openEditor();
    const list = await screen.findByTestId('task-list');
    expect(list.textContent).toMatch(/Alpha/);
  });

  it('allows editing an existing task title and min interval', async () => {
    render(<App />);
    await enterDashboard();
    await openEditor();
    createBasicTask('Original');
    await screen.findByTestId('add-task-btn');
    openEditor();
  // Select the dynamically created task "Original" specifically to avoid seeded tasks with existing min interval
  const taskList = await screen.findByTestId('task-list');
  const originalItem = Array.from(taskList.querySelectorAll('li')).find(li => /Original/.test(li.textContent || ''));
  if (!originalItem) throw new Error('Original task list item not found');
  const editBtn = originalItem.querySelector('button[data-testid^="edit-task-"]') as HTMLButtonElement | null;
  if (!editBtn) throw new Error('Edit button for Original task not found');
  fireEvent.click(editBtn);
    // enable min interval
    fireEvent.click(screen.getByTestId('min-interval-toggle'));
    const minInput = await screen.findByTestId('min-interval-input');
    fireEvent.change(minInput, { target: { value: '5' }});
    // change name
    const nameInput = screen.getByTestId('task-name-input');
    fireEvent.change(nameInput, { target: { value: 'Geändert' }});
    fireEvent.click(screen.getByRole('button', { name: /Änderungen speichern/i }));
    await screen.findByTestId('add-task-btn');
    // reopen and assert list shows updated
    openEditor();
    const list = await screen.findByTestId('task-list');
    expect(list.textContent).toMatch(/Geändert/);
    expect(list.textContent).toMatch(/min 5 Tage/);
  });

  it('emoji picker toggles visibility and selects an emoji', async () => {
    render(<App />);
    await enterDashboard();
    await openEditor();
    const toggle = screen.getByTestId('toggle-emoji-picker');
    fireEvent.click(toggle);
    const picker = await screen.findByTestId('emoji-picker');
    // grid layout present
    expect(screen.getByTestId('emoji-grid').children.length).toBeGreaterThan(5);
    const firstOption = picker.querySelector('button');
    if (!firstOption) throw new Error('No emoji option');
    const chosen = firstOption.textContent;
    fireEvent.click(firstOption);
    expect(screen.getByTestId('current-emoji').textContent).toBe(chosen);
  });

  it('allows deleting an existing task from the list', async () => {
    render(<App />);
    await enterDashboard();
    await openEditor();
    createBasicTask('DeleteMe');
    await screen.findByTestId('add-task-btn');
    openEditor();
  const list = await screen.findByTestId('task-list');
  expect(list.textContent).toMatch(/DeleteMe/);
  // find the specific list item containing DeleteMe
  const deleteItem = Array.from(list.querySelectorAll('li')).find(li=> /DeleteMe/.test(li.textContent||''));
  if (!deleteItem) throw new Error('List item with DeleteMe not found');
  const deleteBtn = deleteItem.querySelector('[data-testid^="delete-task-"]') as HTMLButtonElement | null;
  if (!deleteBtn) throw new Error('Delete button for DeleteMe not found');
    // mock confirm
    // @ts-ignore
    window.confirm = () => true;
    fireEvent.click(deleteBtn);
    // wait for list item removal
    await waitFor(() => {
      const latestList = screen.getByTestId('task-list');
      expect(latestList).not.toHaveTextContent(/DeleteMe/);
    });
  });

  it('min interval input enforces lower bound of 1', async () => {
    render(<App />);
    await enterDashboard();
    await openEditor();
    fireEvent.click(screen.getByTestId('min-interval-toggle'));
    const minInput = await screen.findByTestId('min-interval-input');
    fireEvent.change(minInput, { target: { value: '0' }});
    expect((minInput as HTMLInputElement).value).toBe('1');
  });
});
