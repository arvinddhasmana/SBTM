export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return secret;
  })(),
  gpsServiceUrl: process.env.GPS_SERVICE_URL || 'http://localhost:3002',
  alertsServiceUrl: process.env.ALERTS_SERVICE_URL || 'http://localhost:3003',
  presenceServiceUrl:
    process.env.PRESENCE_SERVICE_URL || 'http://localhost:3004',
  videoServiceUrl: process.env.VIDEO_SERVICE_URL || 'http://localhost:3005',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ],
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
});
