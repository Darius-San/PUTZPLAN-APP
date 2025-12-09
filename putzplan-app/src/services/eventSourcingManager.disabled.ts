// Temporary Fix: Disabled Event Sourcing Manager to prevent localStorage conflicts
// This prevents different data between Simple Browser and normal browser

console.warn('🚨 [Event Sourcing] DISABLED to prevent browser storage conflicts');

export const eventSourcingManager = {
  logAction: (action: string, data: any) => {
    // DISABLED: Event sourcing is temporarily disabled to fix browser inconsistencies
    console.log(`📝 [Event Sourcing DISABLED] Would log: ${action}`, data);
  },
  
  getEvents: () => {
    console.log('📖 [Event Sourcing DISABLED] getEvents called');
    return [];
  },
  
  getSnapshots: () => {
    console.log('📸 [Event Sourcing DISABLED] getSnapshots called');
    return [];
  },
  
  createSnapshot: () => {
    console.log('📸 [Event Sourcing DISABLED] createSnapshot called');
  }
};

export default eventSourcingManager;