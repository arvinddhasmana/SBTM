import api from './api.service';

export const EmergencyService = {
    triggerPanic: async (
        vehicleId: string,
        routeId: string,
        location: { lat: number; lng: number },
        driverId?: string,
    ) => {
        try {
            await api.post('/emergency-events', {
                vehicleId,
                routeId,
                eventType: 'PANIC_BUTTON',
                timestamp: new Date().toISOString(),
                location,
                driverId,
            });
            console.log('Emergency event sent');
        } catch (error) {
            console.error('Failed to send emergency event', error);
            // TODO: Queue for retry if offline
        }
    }
};
