import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Placeholder routes (se implementarán en StackBlitz)
app.get('/api', (req, res) => {
  res.json({
    message: 'Pastoral App Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      members: '/api/members/*',
      visits: '/api/visits/*',
      contacts: '/api/contacts/*',
      users: '/api/users/*',
      churches: '/api/churches/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
