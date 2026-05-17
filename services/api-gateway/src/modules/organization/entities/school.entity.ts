import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Board } from './board.entity';
import { BellSchedule } from './bell-schedule.entity';

@Entity('stx_schools')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'board_id', type: 'uuid' })
  boardId: string;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'board_id' })
  board?: Board;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  // TODO(phase-B): wire PostGIS column type — geography(Point, 4326)
  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ name: 'time_zone', type: 'text', default: 'America/Toronto' })
  timeZone: string;

  @Column({ name: 'bell_schedule_id', type: 'uuid', nullable: true })
  bellScheduleId: string | null;

  @ManyToOne(() => BellSchedule, { nullable: true })
  @JoinColumn({ name: 'bell_schedule_id' })
  bellSchedule?: BellSchedule | null;

  @Column({ name: 'alerts_enabled', type: 'boolean', default: true })
  alertsEnabled: boolean;

  @Column({ name: 'external_ids', type: 'jsonb', default: () => `'{}'::jsonb` })
  externalIds: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
