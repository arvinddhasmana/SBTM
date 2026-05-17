import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Trip } from './trip.entity';
import { Stop } from './stop.entity';

@Entity('stop_times')
export class StopTime {
  @PrimaryColumn({ name: 'trip_id', type: 'text' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip?: Trip;

  @PrimaryColumn({ name: 'stop_sequence', type: 'int' })
  stopSequence: number;

  @Column({ name: 'arrival_time', type: 'text' })
  arrivalTime: string;

  @Column({ name: 'departure_time', type: 'text' })
  departureTime: string;

  @Column({ name: 'stop_id', type: 'text' })
  stopId: string;

  @ManyToOne(() => Stop)
  @JoinColumn({ name: 'stop_id' })
  stop?: Stop;

  @Column({ name: 'pickup_type', type: 'int', default: 0 })
  pickupType: number;

  @Column({ name: 'drop_off_type', type: 'int', default: 0 })
  dropOffType: number;

  @Column({ name: 'stx_dwell_seconds', type: 'int', nullable: true })
  stxDwellSeconds: number | null;
}
