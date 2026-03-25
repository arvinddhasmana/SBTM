
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PresenceNotificationChannel {
    PUSH = 'PUSH',
    EMAIL = 'EMAIL',
    SMS = 'SMS',
}

export enum PresenceNotificationStatus {
    SENT = 'SENT',
    FAILED = 'FAILED',
}

@Entity('presence_notification_logs')
export class PresenceNotificationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    presenceEventId: string;

    @Column()
    studentId: string;

    @Column()
    routeId: string;

    @Column()
    schoolId: string;

    @Column()
    recipientUserId: string;

    @Column()
    eventType: string;

    @Column({
        type: 'enum',
        enum: PresenceNotificationChannel,
        default: PresenceNotificationChannel.PUSH,
    })
    channel: PresenceNotificationChannel;

    @Column({
        type: 'enum',
        enum: PresenceNotificationStatus,
    })
    status: PresenceNotificationStatus;

    @CreateDateColumn()
    timestamp: Date;
}
