import express from 'express';
import v1Routes from './routes/v1';

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gps-tracking', timestamp: new Date().toISOString() });
});

app.use('/api/v1', v1Routes);

export default app;
