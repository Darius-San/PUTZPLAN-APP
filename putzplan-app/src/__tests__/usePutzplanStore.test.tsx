import { renderHook, act } from '@testing-library/react'
import { usePutzplanStore } from '../hooks/usePutzplanStore'
import { dataManager } from '../services/dataManager'

// Helper: reset state before each test
function resetData() {
  dataManager.clearAllData()
}

describe('usePutzplanStore', () => {
  beforeEach(() => {
    resetData()
  })

  it('creates a user and WG, then a task and executes it', () => {
    const { result } = renderHook(() => usePutzplanStore())

    // Create user
    act(() => {
      result.current.createUser({ name: 'Anna', targetMonthlyPoints: 100 })
    })
    expect(result.current.state.currentUser?.name).toBe('Anna')

    // Create WG
    act(() => {
      result.current.createWG({ name: 'WG Alpha', monthlyPointsTarget: 400 })
    })
    expect(result.current.state.currentWG?.name).toBe('WG Alpha')

    // Create Task
    act(() => {
      result.current.createTask({
        title: 'Bad putzen',
        description: 'Reinigen',
        emoji: '🛁',
        category: 'bathroom' as any,
        timeEstimate: 30,
        difficultyScore: 5,
        unpleasantnessScore: 5,
        maxDaysBetween: 7,
        requiresPhoto: false,
        minDaysBetween: 1
      })
    })
    const taskIds = Object.keys(result.current.state.tasks)
    expect(taskIds.length).toBe(1)

    const taskId = taskIds[0]

    // Execute task
    act(() => {
      result.current.executeTask(taskId, { notes: 'Erledigt' })
    })

    const executions = Object.values(result.current.state.executions)
    expect(executions.length).toBe(1)
    const exec = executions[0]
    expect(exec.taskId).toBe(taskId)
    expect(result.current.state.currentUser?.totalCompletedTasks).toBe(1)
  })
})
