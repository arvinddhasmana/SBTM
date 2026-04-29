import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alert_config_change_request')
export class AlertConfigChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId: string;

  @Column({ name: 'requested_by_role', type: 'varchar', length: 50 })
  requestedByRole: string;

  @Column({ name: 'config_type', type: 'varchar', length: 100 })
  configType: string;

  @Column({ name: 'change_description', type: 'text' })
  changeDescription: string;

  @Column({ name: 'current_config', type: 'jsonb', nullable: true })
  currentConfig: Record<string, any> | null;

  @Column({ name: 'requested_config', type: 'jsonb' })
  requestedConfig: Record<string, any>;

  @Column({ name: 'justification', type: 'text', nullable: true })
  justification: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
