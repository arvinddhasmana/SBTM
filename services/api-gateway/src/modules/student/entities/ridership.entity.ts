import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from './student.entity';

export enum RidershipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  REVOKED = 'revoked',
}

@Entity('stx_ridership')
export class Ridership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'trip_id', type: 'text' })
  tripId: string;

  @Column({ name: 'stop_id', type: 'text' })
  stopId: string;

  @Column({ name: 'direction_id', type: 'int', default: 0 })
  directionId: number;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({
    type: 'enum',
    enum: RidershipStatus,
    enumName: 'stx_ridership_status_enum',
    default: RidershipStatus.ACTIVE,
  })
  status: RidershipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
