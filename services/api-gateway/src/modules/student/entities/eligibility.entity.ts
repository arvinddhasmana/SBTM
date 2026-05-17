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

export enum EligibilityKind {
  MANDATORY = 'mandatory',
  COURTESY = 'courtesy',
  HAZARD_EXEMPTION = 'hazard_exemption',
  MEDICAL = 'medical',
  NONE = 'none',
}

export enum EligibilityDirection {
  AM = 'am',
  PM = 'pm',
  MIDDAY = 'midday',
}

@Entity('stx_eligibility')
export class Eligibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({
    type: 'enum',
    enum: EligibilityDirection,
    enumName: 'stx_eligibility_direction_enum',
  })
  direction: EligibilityDirection;

  @Column({
    name: 'eligibility_kind',
    type: 'enum',
    enum: EligibilityKind,
    enumName: 'stx_eligibility_kind_enum',
  })
  eligibilityKind: EligibilityKind;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
