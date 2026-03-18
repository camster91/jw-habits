import express from 'express';

const app = express();
const PORT = 3002;

// Simple test endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});