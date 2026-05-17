import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Driver } from './driver.entity';

export enum RunStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

@Entity('stx_runs')
export class Run {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_date', type: 'date' })
  serviceDate: string;

  @Column({ name: 'trip_ids', type: 'text', array: true })
  tripIds: string[];

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver?: Driver;

  @Column({ name: 'backup_driver_id', type: 'uuid', nullable: true })
  backupDriverId: string | null;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'backup_driver_id' })
  backupDriver?: Driver | null;

  @Column({
    type: 'enum',
    enum: RunStatus,
    enumName: 'stx_run_status_enum',
    default: RunStatus.SCHEDULED,
  })
  status: RunStatus;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
