import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { TaskSelectionModal } from '../../../components/alarm/TaskSelectionModal';
import { Task } from '../../../types';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('TaskSelectionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectTask = vi.fn();

  const mockTasks: Task[] = [
    {
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
    },
    {
      id: '2',
      title: 'Bathroom Cleaning',
      description: 'Clean the bathroom',
      pointsPerExecution: 15,
      monthlyFrequency: 2,
      totalMonthlyPoints: 30,
      emoji: '🚿',
      category: 'bathroom' as any,
      averageMinutes: 45,
      averagePainLevel: 3,
      averageImportance: 4,
      isActive: true,
      createdAt: new Date(),
      basePoints: 15,
      difficultyScore: 3,
      unpleasantnessScore: 2,
      constraints: { maxDaysBetween: 30, requiresPhoto: false },
      createdBy: 'user1',
      setupComplete: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <TaskSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTask={mockOnSelectTask}
        tasks={mockTasks}
      />
    );
    
  expect(screen.getByText('🚨 Dringenden Task auswählen')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Bathroom Cleaning')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TaskSelectionModal
        isOpen={false}
        onClose={mockOnClose}
        onSelectTask={mockOnSelectTask}
        tasks={mockTasks}
      />
    );
    
    expect(screen.queryByText('🚨 Dringend: Task auswählen')).not.toBeInTheDocument();
  });

  it('should call onSelectTask when task is clicked', () => {
    render(
      <TaskSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTask={mockOnSelectTask}
        tasks={mockTasks}
      />
    );
    
    const kitchenTask = screen.getByText('Kitchen Cleaning');
    fireEvent.click(kitchenTask);
    
    expect(mockOnSelectTask).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('should call onClose when backdrop is clicked', () => {
    render(
      <TaskSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTask={mockOnSelectTask}
        tasks={mockTasks}
      />
    );
    
  const backdrop = screen.getByTestId('task-selection-modal-backdrop');
    fireEvent.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});