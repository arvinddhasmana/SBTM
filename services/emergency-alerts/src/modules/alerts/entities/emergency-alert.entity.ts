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
  LATE_ARRIVAL = 'LATE_ARRIVAL',
  ROUTE_DIVERSION = 'ROUTE_DIVERSION',
  PANIC_ALERT = 'PANIC_ALERT',
  MEDICAL = 'MEDICAL',
  LATE_DEPARTURE = 'LATE_DEPARTURE',
  COMPLIANCE = 'COMPLIANCE',
  OTHER = 'OTHER',
}

export enum EmergencyAlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  AUTO_ESCALATED = 'AUTO_ESCALATED',
  FALSE_ALARM = 'FALSE_ALARM',
}

export enum AlertTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export enum AlertEscalationLevel {
  SCHOOL = 'SCHOOL',
  BOARD = 'BOARD',
  OSTA = 'OSTA',
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

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EmergencyAlertStatus,
    enumName: 'emergency_alert_status_enum',
    default: EmergencyAlertStatus.ACTIVE,
  })
  status: EmergencyAlertStatus;

  @Column({
    type: 'enum',
    enum: AlertTier,
    enumName: 'emergency_alert_tier_enum',
    nullable: true,
  })
  tier: AlertTier | null;

  @Column({ nullable: true })
  confirmedBy: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  confirmedAt: Date | null;

  @Column({
    type: 'enum',
    enum: AlertEscalationLevel,
    enumName: 'emergency_alert_escalation_level_enum',
    nullable: true,
  })
  escalationLevel: AlertEscalationLevel | null;

  @Column({ nullable: true, type: 'timestamptz' })
  autoEscalatedAt: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  parentNotifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
