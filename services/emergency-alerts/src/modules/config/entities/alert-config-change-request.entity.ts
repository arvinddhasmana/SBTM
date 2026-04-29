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

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @Column({ type: 'varchar', length: 50 })
  requestedByRole: string;

  @Column({ type: 'varchar', length: 100 })
  configType: string;

  @Column({ type: 'text' })
  changeDescription: string;

  @Column({ type: 'jsonb', nullable: true })
  currentConfig: Record<string, any> | null;

  @Column({ type: 'jsonb' })
  requestedConfig: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
