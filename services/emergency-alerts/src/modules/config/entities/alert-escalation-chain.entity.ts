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

  @Column({ type: 'varchar', length: 100 })
  configName: string;

  @Column({ type: 'integer' })
  sequenceOrder: number;

  @Column({ type: 'varchar', length: 50 })
  escalationLevel: string;

  @Column({ type: 'integer' })
  timeThresholdMs: number;

  @Column({ type: 'jsonb', nullable: true })
  notificationChannels: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
