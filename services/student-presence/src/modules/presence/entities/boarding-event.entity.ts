import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
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

/**
 * Mirrors `stx_boarding_events` defined by api-gateway
 * (`services/api-gateway/src/modules/student/entities/boarding-event.entity.ts`).
 * DDL is owned by the api-gateway v2 cutover migration; this service is
 * read+write only.
 */
@Entity('stx_boarding_events')
export class BoardingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sta_id', type: 'uuid' })
  staId: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId: string;

  @Column({ name: 'stop_id', type: 'text' })
  stopId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

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

  @Column({
    type: 'enum',
    enum: BoardingEventSource,
    enumName: 'stx_boarding_event_source_enum',
    default: BoardingEventSource.DRIVER_APP,
  })
  source: BoardingEventSource;

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
