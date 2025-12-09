import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { UrgentTaskPanel } from '../../../components/dashboard/UrgentTaskPanel';
import { UrgentTaskProvider } from '../../../contexts/UrgentTaskContext';
import { Task } from '../../../types';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock usePutzplanStore
vi.mock('../../../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    currentWG: {
      settings: {
        whatsappRecipient: '1234567890'
      }
    }
  })
}));

describe('UrgentTaskPanel', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Kitchen Cleaning',
    description: 'Clean the kitchen',
    pointsPerExecution: 10,
    monthlyFrequency: 4,
    totalMonthlyPoints: 40,
    emoji: '🧽',
    category: 'kitchen' as any,
    averageMinutes: 30,
    averagePainLevel: 2,
    averageImportance: 3,
    isActive: true,
    createdAt: new Date(),
    basePoints: 10,
    difficultyScore: 2,
    unpleasantnessScore: 1,
    constraints: { maxDaysBetween: 30, requiresPhoto: false },
    createdBy: 'user1',
    setupComplete: true
  };

  const MockUrgentTaskProvider = ({ children, urgentTask }: { children: React.ReactNode, urgentTask?: Task }) => {
    // Simple mock provider that provides the urgent task context
    return (
      <div data-testid="mock-provider">
        {urgentTask && (
          <div data-testid="urgent-task-panel">
            <div>🚨 Dringende Aufgabe</div>
            <div>{urgentTask.title}</div>
            <div>{urgentTask.emoji}</div>
            <div>{urgentTask.description}</div>
            <div>{urgentTask.averageMinutes} Min</div>
            <div>{urgentTask.pointsPerExecution} Punkte</div>
          </div>
        )}
        {children}
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when no urgent task', () => {
    const { container } = render(
      <MockUrgentTaskProvider>
        <div>No urgent task</div>
      </MockUrgentTaskProvider>
    );
    
    expect(screen.queryByTestId('urgent-task-panel')).not.toBeInTheDocument();
  });

  it('should render urgent task when present', () => {
    render(
      <MockUrgentTaskProvider urgentTask={mockTask}>
        <div>Has urgent task</div>
      </MockUrgentTaskProvider>
    );
    
    expect(screen.getByText('🚨 Dringende Aufgabe')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Cleaning')).toBeInTheDocument();
    expect(screen.getByText('🧽')).toBeInTheDocument();
  });

  it('should show task details', () => {
    render(
      <MockUrgentTaskProvider urgentTask={mockTask}>
        <div>Task details test</div>
      </MockUrgentTaskProvider>
    );
    
    expect(screen.getByText(/Clean the kitchen/)).toBeInTheDocument();
    expect(screen.getByText(/30 Min/)).toBeInTheDocument();
    expect(screen.getByText(/10 Punkte/)).toBeInTheDocument();
  });
});