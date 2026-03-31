import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EmergencyEventType {
  PANIC_BUTTON = 'PANIC_BUTTON',
  ROUTE_DEVIATION = 'ROUTE_DEVIATION',
  INCIDENT = 'INCIDENT',
  OTHER = 'OTHER',
}

export enum EmergencyAlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
}

@Entity()
export class EmergencyAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  schoolId: string;

  @Column()
  vehicleId: string;

  @Column()
  routeId: string;

  @Column()
  driverId: string;

  @Column()
  timestamp: Date;

  @Column('float')
  lat: number;

  @Column('float')
  lng: number;

  @Column({
    type: 'enum',
    enum: EmergencyEventType,
    enumName: 'emergency_alert_eventtype_enum',
    default: EmergencyEventType.PANIC_BUTTON,
  })
  eventType: EmergencyEventType;

  @Column({
    type: 'enum',
    enum: EmergencyAlertStatus,
    enumName: 'emergency_alert_status_enum',
    default: EmergencyAlertStatus.ACTIVE,
  })
  status: EmergencyAlertStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
