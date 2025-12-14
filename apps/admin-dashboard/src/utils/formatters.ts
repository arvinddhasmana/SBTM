/**
 * Format a date string to relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

/**
 * Format a timestamp to a readable format
 */
export function formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format ETA in minutes
 */
export function formatEta(minutes: number): string {
    if (minutes < 1) {
        return 'Arriving';
    }
    if (minutes === 1) {
        return '1 min';
    }
    return `${minutes} mins`;
}

/**
 * Format event type to display name
 */
export function formatEventType(eventType: string): string {
    const typeMap: Record<string, string> = {
        PANIC_BUTTON: 'Panic Button',
        INCIDENT: 'Incident',
        DEVIATION: 'Route Deviation',
        OTHER: 'Other',
        BOARD: 'Boarded',
        ALIGHT: 'Alighted',
    };
    return typeMap[eventType] || eventType;
}

/**
 * Format status badge color class
 */
export function getStatusColorClass(status: 'normal' | 'delay' | 'emergency' | string): string {
    switch (status) {
        case 'normal':
            return 'bg-green-500';
        case 'delay':
            return 'bg-yellow-500';
        case 'emergency':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
}
