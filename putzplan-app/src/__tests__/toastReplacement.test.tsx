import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ToastProvider, useToast } from '../components/ui/ToastContext'

function TestComponent() {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.success('Erfolgreich!')}>success</button>
      <button onClick={() => toast.error('Fehler!')}>error</button>
    </div>
  )
}

describe('ToastProvider', () => {
  it('shows success and error toasts in the DOM', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await userEvent.click(screen.getByText('success'))
    expect(await screen.findByText('Erfolgreich!')).toBeDefined()

    await userEvent.click(screen.getByText('error'))
    expect(await screen.findByText('Fehler!')).toBeDefined()
  })
})
