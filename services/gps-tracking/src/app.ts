import express from 'express';
import v1Routes from './routes/v1';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);

// Health check endpoint (public — no service auth required)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gps-tracking', timestamp: new Date().toISOString() });
});

app.use('/api/v1', v1Routes);

export default app;
