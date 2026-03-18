import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3009;

app.use(cors());
app.use(express.json());

app.get('/api/news', async (req, res) => {
  console.log('News API called - RSS feed disabled for compliance');
  res.status(200).json({
    success: true,
    message: 'RSS feed functionality has been replaced with daily check feature for app store compliance.',
    items: [],
    source: 'disabled',
    fetchedAt: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Simple API server running on http://localhost:${PORT}`);
  console.log(`Note: RSS feed functionality has been disabled for app store compliance.`);
  console.log(`News endpoint returns empty array. Daily check feature is now used instead.`);
});