export default () => ({
    port: parseInt(process.env.PORT || '3001', 10),
    jwtSecret: process.env.JWT_SECRET || 'dev_secret',
    gpsServiceUrl: process.env.GPS_SERVICE_URL || 'http://localhost:3002',
    alertsServiceUrl: process.env.ALERTS_SERVICE_URL || 'http://localhost:3003',
    presenceServiceUrl: process.env.PRESENCE_SERVICE_URL || 'http://localhost:3004',
    videoServiceUrl: process.env.VIDEO_SERVICE_URL || 'http://localhost:3005',
});
