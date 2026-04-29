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

  @Column({ type: 'varchar', length: 50 })
  actionName: string;

  @Column({ type: 'varchar', length: 20 })
  allowedForTier: string;

  @Column({ type: 'varchar', length: 50 })
  allowedForStatus: string;

  @Column({ type: 'varchar', length: 50 })
  requiredRole: string;

  @Column({ type: 'boolean', default: false })
  requiresNotes: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  statusTransition: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
