import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import memberRoutes from './routes/members';
import contactRoutes from './routes/contacts';
import visitRoutes from './routes/visits';
import churchRoutes from './routes/churches';
import suggestionRoutes from './routes/suggestions';
import tagRoutes from './routes/tags';
import taskRoutes from './routes/tasks';
import templateRoutes from './routes/templates';
import preachingRoutes from './routes/preaching';
import userRoutes from './routes/users';
import calendarRoutes from './routes/calendar';

// Última defensa: si algo se escapa sin manejar (ej. un rechazo de promesa
// fuera de una ruta), registrar y seguir vivo en vez de tumbar el servidor.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigins?.length ? corsOrigins : true }));
// Límite ampliado (por defecto 100kb) para admitir fotos de miembros en base64
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preaching', preachingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);

// Manejador de errores: cualquier error de una ruta (ej. la base de datos no
// respondió) termina aquí como un 500 normal, en vez de tumbar el servidor.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo en unos segundos.' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
