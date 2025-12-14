export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    jwtSecret: process.env.JWT_SECRET || 'dev_secret',
    gpsServiceUrl: process.env.GPS_SERVICE_URL || 'http://localhost:3001',
    alertsServiceUrl: process.env.ALERTS_SERVICE_URL || 'http://localhost:3004',
    presenceServiceUrl: process.env.PRESENCE_SERVICE_URL || 'http://localhost:3006',
    videoServiceUrl: process.env.VIDEO_SERVICE_URL || 'http://localhost:3005',
});
