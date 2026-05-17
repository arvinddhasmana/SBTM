import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('calendar')
export class Calendar {
  @PrimaryColumn({ name: 'service_id', type: 'text' })
  serviceId: string;

  @Column({ type: 'boolean', default: false })
  monday: boolean;

  @Column({ type: 'boolean', default: false })
  tuesday: boolean;

  @Column({ type: 'boolean', default: false })
  wednesday: boolean;

  @Column({ type: 'boolean', default: false })
  thursday: boolean;

  @Column({ type: 'boolean', default: false })
  friday: boolean;

  @Column({ type: 'boolean', default: false })
  saturday: boolean;

  @Column({ type: 'boolean', default: false })
  sunday: boolean;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;
}
