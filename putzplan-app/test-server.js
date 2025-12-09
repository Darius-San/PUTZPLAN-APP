// Simple test server to debug the issue
import express from 'express';

const app = express();
const PORT = 5173;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Test server is running!');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

console.log('Starting test server...');

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});

process.on('SIGINT', () => {
  console.log('\n📴 Shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});