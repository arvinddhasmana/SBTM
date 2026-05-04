import express, { Express } from 'express';
import v1Routes, { deviceRouter } from './routes/v1';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';

const app: Express = express();

app.use(express.json());
app.use(correlationIdMiddleware);

// Health check endpoint (public — no service auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gps-tracking', timestamp: new Date().toISOString() });
});

// Internal service routes (require service JWT from API gateway)
app.use('/api/v1', v1Routes);

// Dedicated hardware GPS device ingestion (device Bearer token auth — no service JWT)
// This must be mounted SEPARATELY so it bypasses internalServiceAuthMiddleware
app.use('/api/v1', deviceRouter);

export default app;
