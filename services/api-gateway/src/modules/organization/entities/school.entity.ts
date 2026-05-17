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
import {
  geographyPointTransformer,
  type LatLng,
} from '../../../common/transformers/geography-point.transformer';

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

  // PostGIS `geography(Point, 4326)`. Raw-SQL callers should use
  // `ST_X(location::geometry)` / `ST_Y(location::geometry)` and
  // `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`; the transformer
  // covers the repository `find` / `save` paths only.
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    transformer: geographyPointTransformer,
  })
  location: LatLng | null;

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
