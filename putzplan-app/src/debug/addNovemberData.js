// Debug Script: Add November 2025 Test Executions
// Run in browser console to add current month data

function addNovemberTestExecutions() {
  const now = new Date();
  const november = new Date(2025, 10, 16); // November 16, 2025 (current date)
  
  console.log('🗓️ Adding November 2025 test executions for demonstration...');

  // Simulate some task executions for November
  const testExecutions = [
    {
      id: 'nov_test_1',
      taskId: 'task_bathroom', // Assuming bathroom task exists
      userId: 'user_current', // Current user
      pointsAwarded: 25,
      date: november.toISOString(),
      executedAt: november.toISOString()
    },
    {
      id: 'nov_test_2', 
      taskId: 'task_kitchen', // Assuming kitchen task exists
      userId: 'user_current',
      pointsAwarded: 30,
      date: new Date(2025, 10, 10).toISOString(), // November 10
      executedAt: new Date(2025, 10, 10).toISOString()
    },
    {
      id: 'nov_test_3',
      taskId: 'task_vacuum', // Assuming vacuum task exists  
      userId: 'user_other', // Another user
      pointsAwarded: 20,
      date: new Date(2025, 10, 5).toISOString(), // November 5
      executedAt: new Date(2025, 10, 5).toISOString()
    }
  ];

  // Add to localStorage if using DataManager
  try {
    const dataKey = 'putzplan_state';
    const currentState = JSON.parse(localStorage.getItem(dataKey) || '{}');
    
    if (!currentState.executions) {
      currentState.executions = {};
    }

    // Add test executions
    testExecutions.forEach(execution => {
      currentState.executions[execution.id] = execution;
    });

    localStorage.setItem(dataKey, JSON.stringify(currentState));
    
    console.log(`✅ Added ${testExecutions.length} November executions to localStorage`);
    console.log('💾 Total executions now:', Object.keys(currentState.executions).length);
    console.log('🔄 Please refresh the page to see the November 2025 tab');
    
    return testExecutions;
    
  } catch (error) {
    console.error('❌ Error adding test executions:', error);
    return null;
  }
}

// Auto-run when script is loaded
console.log('📊 November Test Data Creator Ready');
console.log('📝 Run: addNovemberTestExecutions() to add current month data');

// Export for console use
window.addNovemberTestExecutions = addNovemberTestExecutions;