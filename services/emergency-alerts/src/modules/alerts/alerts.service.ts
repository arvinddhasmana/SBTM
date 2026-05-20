import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Alert, AlertScopeKind, AlertStatus } from './entities/alert.entity';
import { AlertAudit } from './entities/alert-audit.entity';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { AlertClassifierService } from './alert-classifier.service';
import { WebsocketGateway } from '../realtime/websocket.gateway';

/**
 * Shape returned by `findForRoute` — consumed by the parent app via the
 * api-gateway proxy. Field names preserved from v1 for wire compatibility.
 */
export interface RouteAlertView {
  routeId: string;
  alertActive: boolean;
  message: string;
  id?: string;
  category?: string;
  severity?: string;
  title?: string;
  body?: string | null;
  status?: string;
  createdAt?: Date;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepo: Repository<Alert>,
    @InjectRepository(AlertAudit)
    private readonly auditRepo: Repository<AlertAudit>,
    @InjectQueue('alerts') private readonly alertsQueue: Queue,
    private readonly wsGateway: WebsocketGateway,
    private readonly classifier: AlertClassifierService,
  ) {}

  /**
   * Create a new alert from an incoming emergency event.
   *
   * v1 → v2 mapping:
   *   • scope_kind  = 'route'
   *   • scope_ref   = routeId
   *   • sta_id      = dto.staId (resolved by api-gateway from school→board→sta)
   *   • category/severity from the classifier
   *   • status      = 'active' (v1 PENDING_CONFIRMATION/Tier escalation
   *                   workflow removed — see Phase B decisions)
   *
   * Extra v1 fields (vehicleId, driverId, lat, lng, timestamp) are captured
   * in the initial audit row's `payload` JSONB since the Alert entity itself
   * has no context column.
   */
  async create(dto: CreateEmergencyEventDto): Promise<Alert> {
    const { category, severity } = this.classifier.classify(dto.eventType);

    const alert = this.alertsRepo.create({
      staId: dto.staId,
      category,
      severity,
      scopeKind: AlertScopeKind.ROUTE,
      scopeRef: dto.routeId,
      title: this.buildTitle(dto),
      body: dto.description ?? null,
      status: AlertStatus.ACTIVE,
      startsAt: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      endsAt: null,
      serviceDate: null,
      createdByUserId: null,
    });
    const saved = await this.alertsRepo.save(alert);

    await this.writeAudit(saved.id, 'created', {
      eventType: dto.eventType,
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      lat: dto.lat,
      lng: dto.lng,
      timestamp: dto.timestamp,
    });

    // Wire-compat: still enqueue under queue name `alerts`, job `emergency-event`.
    await this.alertsQueue.add('emergency-event', {
      id: saved.id,
      alertId: saved.id,
      staId: saved.staId,
      routeId: dto.routeId,
      schoolId: dto.schoolId,
      category: saved.category,
      severity: saved.severity,
      eventType: dto.eventType,
    });

    this.wsGateway.broadcastAlert(this.toWireShape(saved));
    return saved;
  }

  /**
   * Mark an existing alert as resolved. Writes a `resolved` audit row.
   */
  async resolve(
    id: string,
    actorUserId?: string,
    actorRole?: string,
    notes?: string,
  ): Promise<Alert> {
    const alert = await this.alertsRepo.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }
    alert.status = AlertStatus.RESOLVED;
    alert.endsAt = new Date();
    const saved = await this.alertsRepo.save(alert);

    await this.writeAudit(id, 'resolved', {
      actorUserId,
      actorRole,
      notes,
    });

    this.wsGateway.broadcastAlert(this.toWireShape(saved));
    return saved;
  }

  /**
   * v1 `confirm` lifecycle action. v2 alerts are already `active` on
   * creation, so this records an audit row only — no status change.
   */
  async confirm(
    alertId: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<Alert> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    await this.writeAudit(alertId, 'confirmed', {
      actorUserId,
      actorRole,
    });

    this.wsGateway.broadcastAlert(this.toWireShape(alert));
    return alert;
  }

  /**
   * v1 `falseAlarm` → v2 status = 'cancelled'. Writes a `cancelled` audit row.
   */
  async falseAlarm(
    alertId: string,
    actorUserId?: string,
    actorRole?: string,
    notes?: string,
  ): Promise<Alert> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }
    alert.status = AlertStatus.CANCELLED;
    alert.endsAt = new Date();
    const saved = await this.alertsRepo.save(alert);

    await this.writeAudit(alertId, 'cancelled', {
      actorUserId,
      actorRole,
      notes,
      reason: 'false_alarm',
    });

    this.wsGateway.broadcastAlert(this.toWireShape(saved));
    return saved;
  }

  /** Records an `info_requested` audit row, no status change. */
  async requestInfo(
    alertId: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<Alert> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }
    await this.writeAudit(alertId, 'info_requested', {
      actorUserId,
      actorRole,
    });
    return alert;
  }

  async getAuditLog(alertId: string): Promise<AlertAudit[]> {
    return this.auditRepo.find({
      where: { alertId },
      order: { createdAt: 'ASC' },
    });
  }

  async findAll(staId?: string): Promise<Alert[]> {
    const where = staId ? { staId } : {};
    return this.alertsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findAllActive(staId?: string): Promise<Alert[]> {
    const qb = this.alertsRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: AlertStatus.ACTIVE })
      .orderBy('a.created_at', 'DESC');
    if (staId) {
      qb.andWhere('a.sta_id = :staId', { staId });
    }
    return qb.getMany();
  }

  /**
   * Add a status update (operational note) to an alert that is still active.
   * Records a `status_update` audit row with the provided notes.
   */
  async addStatusUpdate(
    alertId: string,
    notes: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<AlertAudit> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }
    if (alert.status !== AlertStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot add status update to alert in ${alert.status} state`,
      );
    }
    const entry = await this.writeAudit(alertId, 'status_update', {
      actorUserId,
      actorRole,
      notes,
    });
    this.wsGateway.broadcastAlert(this.toWireShape(alert));
    return entry;
  }

  async findOne(id: string): Promise<Alert | null> {
    return this.alertsRepo.findOneBy({ id });
  }

  /**
   * Parent-app endpoint: return the most recent operationally active alert
   * for a given route (scope_kind=route, scope_ref=routeId).
   */
  async findForRoute(routeId: string): Promise<RouteAlertView> {
    const active = await this.alertsRepo.findOne({
      where: {
        scopeKind: AlertScopeKind.ROUTE,
        scopeRef: routeId,
        status: AlertStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    if (active) {
      const message = active.body ?? active.title;
      return {
        id: active.id,
        routeId,
        category: active.category,
        severity: active.severity,
        title: active.title,
        body: active.body,
        message,
        status: active.status,
        createdAt: active.createdAt,
        alertActive: true,
      };
    }
    return {
      routeId,
      alertActive: false,
      message: 'No active alerts.',
    };
  }

  async findByRoutes(routeIds: string[]): Promise<Alert[]> {
    if (routeIds.length === 0) return [];
    return this.alertsRepo.find({
      where: {
        scopeKind: AlertScopeKind.ROUTE,
        scopeRef: In(routeIds),
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildTitle(dto: CreateEmergencyEventDto): string {
    const label = dto.eventType.replace(/_/g, ' ').toLowerCase();
    return `${label} on route ${dto.routeId}`;
  }

  private async writeAudit(
    alertId: string,
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<AlertAudit> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined) clean[k] = v;
    }
    const entry = this.auditRepo.create({
      alertId,
      action,
      actorUserId:
        typeof payload.actorUserId === 'string' ? payload.actorUserId : null,
      payload: clean,
    });
    return this.auditRepo.save(entry);
  }

  private toWireShape(alert: Alert): Record<string, unknown> {
    return {
      id: alert.id,
      staId: alert.staId,
      category: alert.category,
      severity: alert.severity,
      scopeKind: alert.scopeKind,
      scopeRef: alert.scopeRef,
      title: alert.title,
      body: alert.body,
      status: alert.status,
      startsAt: alert.startsAt,
      endsAt: alert.endsAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
