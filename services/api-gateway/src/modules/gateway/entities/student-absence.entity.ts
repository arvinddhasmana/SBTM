import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AbsenceRouteType = 'AM' | 'PM' | 'BOTH';

@Entity('student_absences')
@Index(['schoolId', 'tripDate'])
@Index(['studentId', 'tripDate'])
export class StudentAbsence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** T4 — referenced by ID only in logs */
  @Column()
  studentId: string;

  /** T4 — the guardian user who reported the absence */
  @Column()
  guardianUserId: string;

  @Column()
  schoolId: string;

  @Column({ type: 'date' })
  tripDate: string;

  @Column({
    type: 'enum',
    enum: ['AM', 'PM', 'BOTH'],
    default: 'BOTH',
  })
  routeType: AbsenceRouteType;

  @Column({ nullable: true, length: 500 })
  notes?: string;

  @Column({ default: 'PENDING' })
  confirmationStatus: string;

  @Column({ nullable: true })
  confirmedByUserId?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  confirmedAt?: Date;

  @Column({ nullable: true, length: 500 })
  confirmationNotes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
