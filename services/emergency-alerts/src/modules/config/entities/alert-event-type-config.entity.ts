import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alert_event_type_config')
export class AlertEventTypeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  eventType: string;

  @Column({ type: 'varchar', length: 20 })
  tier: string;

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  requiresConfirmation: boolean;

  @Column({ type: 'boolean', default: false })
  notifyParents: boolean;

  @Column({ type: 'boolean', default: false })
  isSystemDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
