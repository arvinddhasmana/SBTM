import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Run } from '../../fleet/entities/run.entity';
import { Driver } from '../../fleet/entities/driver.entity';
import { Student } from './student.entity';
import { Sta } from '../../organization/entities/sta.entity';
import {
  geographyPointTransformer,
  type LatLng,
} from '../../../common/transformers/geography-point.transformer';

export enum BoardingEventKind {
  BOARDED = 'boarded',
  ALIGHTED = 'alighted',
  NO_SHOW = 'no_show',
  BOARDED_AT_ALT_STOP = 'boarded_at_alt_stop',
  REFUSED = 'refused',
}

export enum BoardingEventSource {
  DRIVER_APP = 'driver_app',
  RFID = 'rfid',
  SMARTTAG = 'smarttag',
}

@Entity('stx_boarding_events')
export class BoardingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sta_id', type: 'uuid' })
  staId: string;

  @ManyToOne(() => Sta)
  @JoinColumn({ name: 'sta_id' })
  sta?: Sta;

  @Column({ name: 'run_id', type: 'uuid' })
  runId: string;

  @ManyToOne(() => Run)
  @JoinColumn({ name: 'run_id' })
  run?: Run;

  @Column({ name: 'stop_id', type: 'text' })
  stopId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({
    name: 'event_kind',
    type: 'enum',
    enum: BoardingEventKind,
    enumName: 'stx_boarding_event_kind_enum',
  })
  eventKind: BoardingEventKind;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'recorded_by_driver_id', type: 'uuid', nullable: true })
  recordedByDriverId: string | null;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'recorded_by_driver_id' })
  recordedByDriver?: Driver | null;

  @Column({
    type: 'enum',
    enum: BoardingEventSource,
    enumName: 'stx_boarding_event_source_enum',
    default: BoardingEventSource.DRIVER_APP,
  })
  source: BoardingEventSource;

  // PostGIS `geography(Point, 4326)` — see geographyPointTransformer for
  // serialisation; raw-SQL callers should use ST_X/ST_Y and ST_MakePoint.
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    transformer: geographyPointTransformer,
  })
  location: LatLng | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
