import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export const NOTIFICATION_EVENT_TYPES = [
  'BOARD',
  'ALIGHT',
  'EMERGENCY',
  'ROUTE_DEVIATION',
  'LATE_ARRIVAL',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['PUSH', 'EMAIL', 'SMS'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

@Entity('notification_preferences')
@Unique(['userId', 'eventType', 'channel'])
@Index(['userId', 'schoolId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  schoolId: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: string;

  @Column({ type: 'varchar', length: 10 })
  channel: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
