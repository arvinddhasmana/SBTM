import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Board } from './board.entity';

@Entity('stx_bell_schedules')
@Unique(['boardId', 'code'])
export class BellSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'board_id', type: 'uuid' })
  boardId: string;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'board_id' })
  board?: Board;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'am_bell', type: 'time', nullable: true })
  amBell: string | null;

  @Column({ name: 'midday_bell', type: 'time', nullable: true })
  middayBell: string | null;

  @Column({ name: 'pm_bell', type: 'time', nullable: true })
  pmBell: string | null;

  @Column({ name: 'kindergarten_am_bell', type: 'time', nullable: true })
  kindergartenAmBell: string | null;

  @Column({ name: 'kindergarten_pm_bell', type: 'time', nullable: true })
  kindergartenPmBell: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
