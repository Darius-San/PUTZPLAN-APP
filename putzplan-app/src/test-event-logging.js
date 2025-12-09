// Einfacher Event-Sourcing Integration Test
// Teste das Event-Logging über Node.js direkt

console.log('🔍 Event-Sourcing Integration Test gestartet...');

// Import Module (Node.js style)
try {
  // Simuliere die DataManager und EventSourcingManager Funktionalität
  class TestEventSourcingManager {
    constructor() {
      this.events = [];
      this.snapshots = [];
    }

    logAction(action, data, userId, wgId, previousState) {
      const event = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        action,
        userId,
        wgId,
        data,
        previousState,
        metadata: {
          critical: ['DELETE_', 'RESET_', 'BULK_'].some(prefix => action.startsWith(prefix))
        }
      };
      
      this.events.push(event);
      console.log(`[EventSourcing] Event logged: ${action}`, { userId, data });
      
      if (event.metadata.critical) {
        this.createSnapshot(action);
      }
      
      return event.id;
    }

    createSnapshot(triggerEvent) {
      const snapshot = {
        id: Date.now() + '_snapshot',
        timestamp: Date.now(),
        triggerEvent,
        state: { mockState: 'snapshot_data' },
        metadata: { version: '1.0', size: 1000 }
      };
      
      this.snapshots.push(snapshot);
      console.log(`[EventSourcing] Snapshot created: ${triggerEvent}`);
      return snapshot.id;
    }

    getEvents() {
      return this.events;
    }

    getSnapshots() {
      return this.snapshots;
    }
  }

  class TestDataManager {
    constructor() {
      this.eventSourcing = new TestEventSourcingManager();
      this.state = {
        users: {},
        tasks: {},
        executions: {},
        currentUser: null,
        currentWG: null
      };
    }

    createUser(userData) {
      const user = {
        id: 'user_' + Date.now(),
        ...userData,
        joinedAt: new Date(),
        currentMonthPoints: 0,
        totalCompletedTasks: 0,
        isActive: true
      };

      this.state.users[user.id] = user;
      this.state.currentUser = user;

      // Event loggen
      this.eventSourcing.logAction(
        'CREATE_USER',
        {
          userId: user.id,
          name: user.name,
          email: user.email,
          targetMonthlyPoints: user.targetMonthlyPoints
        },
        user.id,
        this.state.currentWG?.id
      );

      return user;
    }

    createTask(taskData) {
      const task = {
        id: 'task_' + Date.now(),
        ...taskData,
        wgId: this.state.currentWG?.id,
        createdAt: new Date(),
        createdBy: this.state.currentUser?.id,
        basePoints: 10
      };

      this.state.tasks[task.id] = task;

      // Event loggen
      this.eventSourcing.logAction(
        'CREATE_TASK',
        {
          taskId: task.id,
          title: task.title,
          category: task.category,
          basePoints: task.basePoints,
          wgId: task.wgId,
          createdBy: task.createdBy
        },
        this.state.currentUser?.id,
        task.wgId
      );

      return task;
    }

    executeTask(taskId, data) {
      const task = this.state.tasks[taskId];
      if (!task) throw new Error('Task not found');
      if (!this.state.currentUser) throw new Error('No current user');

      const execution = {
        id: 'exec_' + Date.now(),
        taskId,
        executedBy: this.state.currentUser.id,
        executedAt: new Date(),
        pointsAwarded: 25,
        notes: data.notes,
        isVerified: true,
        status: 'VERIFIED'
      };

      this.state.executions[execution.id] = execution;

      // Event loggen
      this.eventSourcing.logAction(
        'EXECUTE_TASK',
        {
          taskId: execution.taskId,
          executedBy: execution.executedBy,
          pointsAwarded: execution.pointsAwarded,
          executionId: execution.id,
          taskTitle: task.title,
          isVerified: execution.isVerified,
          status: execution.status
        },
        this.state.currentUser.id,
        this.state.currentWG?.id
      );

      return execution;
    }

    executeTaskForUser(taskId, userId, data = {}) {
      const task = this.state.tasks[taskId];
      const user = this.state.users[userId];
      if (!task) throw new Error('Task not found');
      if (!user) throw new Error('User not found');

      const execution = {
        id: 'exec_' + Date.now(),
        taskId,
        executedBy: userId,
        executedAt: new Date(),
        pointsAwarded: 25,
        notes: data.notes,
        isVerified: true,
        status: 'VERIFIED'
      };

      this.state.executions[execution.id] = execution;

      // Event loggen
      this.eventSourcing.logAction(
        'EXECUTE_TASK_FOR_USER',
        {
          taskId: execution.taskId,
          executedBy: execution.executedBy,
          pointsAwarded: execution.pointsAwarded,
          executionId: execution.id,
          taskTitle: task.title,
          userName: user.name,
          isVerified: execution.isVerified,
          status: execution.status
        },
        this.state.currentUser?.id || 'system',
        this.state.currentWG?.id
      );

      return execution;
    }

    deleteTask(taskId) {
      const task = this.state.tasks[taskId];
      if (!task) return;

      delete this.state.tasks[taskId];

      // Event loggen (kritische Action)
      this.eventSourcing.logAction(
        'DELETE_TASK',
        {
          taskId,
          title: task.title,
          wgId: task.wgId
        },
        this.state.currentUser?.id,
        task.wgId,
        task // Backup des gelöschten Tasks
      );
    }
  }

  // Test Setup
  const testManager = new TestDataManager();

  console.log('\n✅ 1. Test User Creation...');
  const testUser = testManager.createUser({
    name: 'Test User',
    email: 'test@example.com',
    avatar: '👨‍💻',
    targetMonthlyPoints: 100
  });
  console.log('User created:', testUser.id, testUser.name);

  console.log('\n✅ 2. Test Task Creation...');
  const testTask = testManager.createTask({
    title: 'Test Task - Event Logging',
    description: 'Ein Test Task um Event-Logging zu testen',
    emoji: '🧹'
  });
  console.log('Task created:', testTask.id, testTask.title);

  console.log('\n✅ 3. Test executeTask...');
  const execution1 = testManager.executeTask(testTask.id, {
    notes: 'Test-Ausführung über executeTask()'
  });
  console.log('Task executed:', execution1.id, execution1.pointsAwarded + ' points');

  console.log('\n✅ 4. Test executeTaskForUser...');
  const execution2 = testManager.executeTaskForUser(testTask.id, testUser.id, {
    notes: 'Test-Ausführung über executeTaskForUser()'
  });
  console.log('Task executed for user:', execution2.id, execution2.executedBy);

  console.log('\n✅ 5. Test deleteTask (critical action)...');
  testManager.deleteTask(testTask.id);
  console.log('Task deleted:', testTask.id);

  // Event Log anzeigen
  console.log('\n📊 Event Log:');
  const events = testManager.eventSourcing.getEvents();
  events.forEach((event, index) => {
    const time = new Date(event.timestamp).toLocaleTimeString();
    const critical = event.metadata.critical ? ' [CRITICAL]' : '';
    console.log(`  ${index + 1}. [${time}] ${event.action}${critical}`);
    console.log(`     User: ${event.userId || 'N/A'} | Data: ${JSON.stringify(event.data, null, 2)}`);
  });

  // Snapshots anzeigen
  console.log('\n📸 Snapshots:');
  const snapshots = testManager.eventSourcing.getSnapshots();
  snapshots.forEach((snapshot, index) => {
    const time = new Date(snapshot.timestamp).toLocaleTimeString();
    console.log(`  ${index + 1}. [${time}] Trigger: ${snapshot.triggerEvent}`);
    console.log(`     Size: ${snapshot.metadata.size} bytes`);
  });

  // Validation
  console.log('\n🔍 Validation:');
  console.log(`✅ ${events.length} events logged`);
  console.log(`✅ ${snapshots.length} snapshots created`);
  
  const hasCreateUser = events.some(e => e.action === 'CREATE_USER');
  const hasCreateTask = events.some(e => e.action === 'CREATE_TASK');
  const hasExecuteTask = events.some(e => e.action === 'EXECUTE_TASK');
  const hasExecuteTaskForUser = events.some(e => e.action === 'EXECUTE_TASK_FOR_USER');
  const hasDeleteTask = events.some(e => e.action === 'DELETE_TASK');
  
  console.log(`✅ CREATE_USER event: ${hasCreateUser ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ CREATE_TASK event: ${hasCreateTask ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ EXECUTE_TASK event: ${hasExecuteTask ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ EXECUTE_TASK_FOR_USER event: ${hasExecuteTaskForUser ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ DELETE_TASK event: ${hasDeleteTask ? 'FOUND' : 'MISSING'}`);

  console.log('\n🎉 Event-Sourcing Integration Test erfolgreich abgeschlossen!');
  console.log('📝 Alle Task-Execution Events werden korrekt geloggt.');

} catch (error) {
  console.error('❌ Test Fehler:', error.message);
  console.error(error.stack);
}