import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Student } from './student.entity';
import { Guardian } from './guardian.entity';

@Entity('stx_student_guardians')
@Unique(['studentId', 'guardianId'])
export class StudentGuardian {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'guardian_id', type: 'uuid' })
  guardianId: string;

  @ManyToOne(() => Guardian)
  @JoinColumn({ name: 'guardian_id' })
  guardian?: Guardian;

  @Column({ type: 'text' })
  relationship: string;

  @Column({ name: 'is_primary_pickup', type: 'boolean', default: false })
  isPrimaryPickup: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
