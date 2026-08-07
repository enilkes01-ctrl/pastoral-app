import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import memberRoutes from './routes/members';
import contactRoutes from './routes/contacts';
import visitRoutes from './routes/visits';
import churchRoutes from './routes/churches';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigins?.length ? corsOrigins : true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/churches', churchRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
