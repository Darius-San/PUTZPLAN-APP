import { render, screen } from '@testing-library/react'
import React from 'react'
import { usePutzplanStore } from '../hooks/usePutzplanStore'
import { Dashboard } from '../components/dashboard/Dashboard'

const BootstrapUser: React.FC = () => {
  const { state, createUser, createWG } = usePutzplanStore()
  if (!state.currentUser) {
    createUser({ name: 'Lisa', targetMonthlyPoints: 120 })
  }
  if (!state.currentWG) {
    createWG({ name: 'WG React', monthlyPointsTarget: 500 })
  }
  return <Dashboard />
}

describe('Dashboard', () => {
  it('renders loading without user', () => {
    render(<Dashboard />)
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it('renders user greeting after bootstrap', () => {
    render(<BootstrapUser />)
    expect(screen.getByText(/Hi Lisa/i)).toBeInTheDocument()
    expect(screen.getByText(/WG React/)).toBeInTheDocument()
  })
})
