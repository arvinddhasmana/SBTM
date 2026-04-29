import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('alert_workflow_config')
@Unique(['actionName', 'allowedForTier', 'allowedForStatus'])
export class AlertWorkflowConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'action_name', type: 'varchar', length: 50 })
  actionName: string;

  @Column({ name: 'allowed_for_tier', type: 'varchar', length: 20 })
  allowedForTier: string;

  @Column({ name: 'allowed_for_status', type: 'varchar', length: 50 })
  allowedForStatus: string;

  @Column({ name: 'required_role', type: 'varchar', length: 50 })
  requiredRole: string;

  @Column({ name: 'requires_notes', type: 'boolean', default: false })
  requiresNotes: boolean;

  @Column({
    name: 'status_transition',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  statusTransition: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
