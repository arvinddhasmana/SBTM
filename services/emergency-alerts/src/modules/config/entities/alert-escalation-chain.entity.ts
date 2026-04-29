import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('alert_escalation_chain')
@Unique(['configName', 'sequenceOrder'])
export class AlertEscalationChain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_name', type: 'varchar', length: 100 })
  configName: string;

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder: number;

  @Column({ name: 'escalation_level', type: 'varchar', length: 50 })
  escalationLevel: string;

  @Column({ name: 'time_threshold_ms', type: 'integer' })
  timeThresholdMs: number;

  @Column({ name: 'notification_channels', type: 'jsonb', nullable: true })
  notificationChannels: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
