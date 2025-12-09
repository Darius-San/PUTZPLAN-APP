// Test configuration - force localStorage mode
export const TEST_CONFIG = {
  STORAGE_MODE: 'localStorage' as const,
  API_BASE_URL: '',
  DEBUG: false,
  APP_VERSION: '1.0.0-test',
  APP_NAME: 'Putzplan App Test'
};

// Override für Tests
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log('🧪 Test mode: Using localStorage configuration');
}