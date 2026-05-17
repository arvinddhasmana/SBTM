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
import { User } from '../../auth/entities/user.entity';

export enum AbsenceRouteType {
  AM = 'AM',
  PM = 'PM',
  BOTH = 'BOTH',
}

export enum AbsenceStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('stx_student_absences')
export class StudentAbsence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'trip_date', type: 'date' })
  tripDate: string;

  @Column({
    name: 'route_type',
    type: 'enum',
    enum: AbsenceRouteType,
    enumName: 'stx_absence_route_type_enum',
  })
  routeType: AbsenceRouteType;

  @Column({
    name: 'confirmation_status',
    type: 'enum',
    enum: AbsenceStatus,
    enumName: 'stx_absence_status_enum',
    default: AbsenceStatus.PENDING,
  })
  confirmationStatus: AbsenceStatus;

  @Column({ name: 'reported_by_user_id', type: 'uuid', nullable: true })
  reportedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedByUser?: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
