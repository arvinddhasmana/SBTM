import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Mirror of api-gateway `stx_alerts`. The emergency-alerts service owns the
 * schema for this table and writes to it directly. ManyToOne joins (Sta, User)
 * present in the gateway entity are intentionally omitted here — this service
 * does not project those entities.
 */

export enum AlertCategory {
  ROUTE_CANCELLED = 'route_cancelled',
  ROUTE_DELAYED = 'route_delayed',
  ROUTE_DEVIATION = 'route_deviation',
  SAFETY = 'safety',
  WEATHER = 'weather',
  GENERAL = 'general',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertScopeKind {
  STA = 'sta',
  BOARD = 'board',
  SCHOOL = 'school',
  ROUTE = 'route',
  TRIP = 'trip',
  RUN = 'run',
  STOP = 'stop',
  STUDENT = 'student',
}

export enum AlertStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('stx_alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sta_id', type: 'uuid' })
  staId: string;

  @Column({
    type: 'enum',
    enum: AlertCategory,
    enumName: 'stx_alert_category_enum',
  })
  category: AlertCategory;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    enumName: 'stx_alert_severity_enum',
    default: AlertSeverity.INFO,
  })
  severity: AlertSeverity;

  @Column({
    name: 'scope_kind',
    type: 'enum',
    enum: AlertScopeKind,
    enumName: 'stx_alert_scope_kind_enum',
  })
  scopeKind: AlertScopeKind;

  @Column({ name: 'scope_ref', type: 'text' })
  scopeRef: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    enumName: 'stx_alert_status_enum',
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({ name: 'starts_at', type: 'timestamptz', default: () => 'now()' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ name: 'service_date', type: 'date', nullable: true })
  serviceDate: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
