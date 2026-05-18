import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '@sbtm/common';
import {
  GpsGatewayService,
  CreateLocationDto,
  RouteLifecycleEventDto,
} from './gps.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { RequestContextService } from '../../../common/services/request-context.service';
import { RlsContextService } from '../../../common/services/rls-context.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

const parent: AuthenticatedUser = {
  id: 'guardian-1',
  email: 'p@example.com',
  role: Role.PARENT,
  anchorKind: 'parent',
  anchorId: 'guardian-1',
  preferredLanguage: 'en',
};
const driver: AuthenticatedUser = {
  id: 'u-driver',
  email: 'd@example.com',
  role: Role.DRIVER,
  anchorKind: 'driver',
  anchorId: 'drv-1',
  preferredLanguage: 'en',
};
const schoolAdmin: AuthenticatedUser = {
  id: 'u-sa',
  email: 'sa@example.com',
  role: Role.SCHOOL_ADMIN,
  anchorKind: 'school',
  anchorId: 'sch-1',
  preferredLanguage: 'en',
};
const superAdmin: AuthenticatedUser = {
  id: 'u-super',
  email: 'sup@example.com',
  role: Role.SUPER_ADMIN,
  anchorKind: 'super',
  anchorId: 'u-super',
  preferredLanguage: 'en',
};

interface QueryCall {
  sql: string;
  params?: unknown[];
}

function makeService(
  responder: (sql: string, params?: unknown[]) => unknown[],
) {
  const calls: QueryCall[] = [];
  const tx = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (/SET LOCAL/i.test(sql)) return [];
      return responder(sql, params);
    },
  } as unknown as EntityManager;
  const ds = {
    transaction: async <T>(fn: (m: EntityManager) => Promise<T>) => fn(tx),
  } as unknown as DataSource;
  const httpClient = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as HttpClientService & {
    get: jest.Mock;
    post: jest.Mock;
  };
  const configService = {
    get: (_key: string, dflt: string) => dflt,
  } as unknown as ConfigService;
  const ctx = new RequestContextService();
  const rls = new RlsContextService(ds, ctx);
  const svc = new GpsGatewayService(httpClient, configService, rls);
  return { svc, calls, ctx, httpClient };
}

describe('GpsGatewayService.checkRouteAccess', () => {
  it('short-circuits for admin roles without hitting the DB', async () => {
    const { svc, calls, ctx } = makeService(() => []);
    await ctx.runWith(superAdmin, () =>
      svc.checkRouteAccess('R-1', superAdmin),
    );
    await ctx.runWith(schoolAdmin, () =>
      svc.checkRouteAccess('R-1', schoolAdmin),
    );
    expect(calls).toHaveLength(0);
  });

  it('allows a parent whose guarded student rides the route today', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/FROM stx_student_guardians/.test(sql)) return [{ '?column?': 1 }];
      return [];
    });
    await expect(
      ctx.runWith(parent, () => svc.checkRouteAccess('R-1', parent)),
    ).resolves.toBeUndefined();
  });

  it('rejects a parent with no active ridership on the route', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(parent, () => svc.checkRouteAccess('R-1', parent)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a driver whose run today references a trip on the route', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/FROM stx_runs/.test(sql)) return [{ '?column?': 1 }];
      return [];
    });
    await expect(
      ctx.runWith(driver, () => svc.checkRouteAccess('R-1', driver)),
    ).resolves.toBeUndefined();
  });

  it('rejects a driver whose runs today have no matching trip', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(driver, () => svc.checkRouteAccess('R-1', driver)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a DRIVER without a driver anchor', async () => {
    const { svc, ctx } = makeService(() => []);
    const broken: AuthenticatedUser = {
      ...driver,
      anchorKind: 'school',
      anchorId: 'sch-1',
    };
    await expect(
      ctx.runWith(broken, () => svc.checkRouteAccess('R-1', broken)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('GpsGatewayService.getLiveLocation', () => {
  it('enriches status=emergency when an active safety alert exists for the route', async () => {
    const { svc, ctx, httpClient } = makeService((sql) => {
      if (/FROM stx_alerts/.test(sql)) return [{ category: 'safety' }];
      return [];
    });
    httpClient.get.mockResolvedValue({
      routeId: 'R-1',
      vehicleId: 'V-1',
      lastUpdate: '2026-05-17T08:00:00Z',
      position: { lat: 45, lng: -75 },
      etaToNextStopMinutes: 5,
    });

    const out = await ctx.runWith(superAdmin, () =>
      svc.getLiveLocation('R-1', superAdmin),
    );

    expect(out.status).toBe('emergency');
    expect(httpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/routes/R-1/live-location'),
    );
  });

  it('enriches status=delay for non-safety active alerts and status=normal when none', async () => {
    const { svc, ctx, httpClient } = makeService((sql) => {
      if (/FROM stx_alerts/.test(sql)) return [{ category: 'route_delayed' }];
      return [];
    });
    httpClient.get.mockResolvedValue({
      routeId: 'R-1',
      vehicleId: 'V-1',
      lastUpdate: 't',
      position: { lat: 45, lng: -75 },
      etaToNextStopMinutes: 0,
    });
    const delayed = await ctx.runWith(superAdmin, () =>
      svc.getLiveLocation('R-1', superAdmin),
    );
    expect(delayed.status).toBe('delay');

    const empty = makeService(() => []);
    empty.httpClient.get.mockResolvedValue({
      routeId: 'R-2',
      vehicleId: 'V-2',
      lastUpdate: 't',
      position: { lat: 45, lng: -75 },
      etaToNextStopMinutes: 0,
    });
    const normal = await empty.ctx.runWith(superAdmin, () =>
      empty.svc.getLiveLocation('R-2', superAdmin),
    );
    expect(normal.status).toBe('normal');
  });

  it('returns { active: false } when GPS service reports 404 for the route', async () => {
    const { svc, ctx, httpClient } = makeService(() => []);
    httpClient.get.mockRejectedValue(
      new NotFoundException('no active location'),
    );
    const out = await ctx.runWith(superAdmin, () =>
      svc.getLiveLocation('R-1', superAdmin),
    );
    expect(out).toEqual({ active: false, routeId: 'R-1' });
  });
});

describe('GpsGatewayService.ingestLocation', () => {
  it('rejects a parent attempting to push GPS', async () => {
    const { svc } = makeService(() => []);
    const dto: CreateLocationDto = {
      vehicleId: 'V-1',
      routeId: 'R-1',
      timestamp: 't',
      lat: 0,
      lng: 0,
    };
    await expect(svc.ingestLocation(dto, parent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('passes through DRIVER ingest without forcing schoolId', async () => {
    const { svc, httpClient } = makeService(() => []);
    httpClient.post.mockResolvedValue({ status: 'ok' });
    const dto: CreateLocationDto = {
      vehicleId: 'V-1',
      routeId: 'R-1',
      timestamp: 't',
      lat: 0,
      lng: 0,
    };
    await svc.ingestLocation(dto, driver);
    expect(httpClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/locations'),
      expect.not.objectContaining({ schoolId: expect.anything() }),
    );
  });

  it('forces schoolId from anchor for SCHOOL_ADMIN', async () => {
    const { svc, httpClient } = makeService(() => []);
    httpClient.post.mockResolvedValue({ status: 'ok' });
    const dto: CreateLocationDto = {
      vehicleId: 'V-1',
      routeId: 'R-1',
      timestamp: 't',
      lat: 0,
      lng: 0,
    };
    await svc.ingestLocation(dto, schoolAdmin);
    expect(httpClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/locations'),
      expect.objectContaining({ schoolId: 'sch-1' }),
    );
  });
});

describe('GpsGatewayService.recordRouteLifecycleEvent', () => {
  const dto: RouteLifecycleEventDto = {
    routeId: 'R-1',
    vehicleId: 'V-1',
    eventType: 'ROUTE_STARTED',
    timestamp: '2026-05-17T08:00:00Z',
  };

  it('rejects non-driver, non-admin callers', async () => {
    const { svc } = makeService(() => []);
    await expect(
      svc.recordRouteLifecycleEvent(dto, parent),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enforces driver route access before forwarding to gps-tracking', async () => {
    const { svc, ctx, httpClient } = makeService(() => []);
    httpClient.post.mockResolvedValue({ status: 'ok' });
    await expect(
      ctx.runWith(driver, () => svc.recordRouteLifecycleEvent(dto, driver)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('forwards SUPER_ADMIN lifecycle event without route-access check', async () => {
    const { svc, ctx, httpClient } = makeService(() => []);
    httpClient.post.mockResolvedValue({ status: 'ok' });
    await ctx.runWith(superAdmin, () =>
      svc.recordRouteLifecycleEvent(dto, superAdmin),
    );
    expect(httpClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/routes/lifecycle'),
      expect.objectContaining({
        routeId: 'R-1',
        eventType: 'ROUTE_STARTED',
        driverId: 'u-super',
      }),
    );
  });
});

describe('GpsGatewayService.getActiveRoutes', () => {
  it('returns [] short-circuit when parent has no ridership today', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/FROM stx_student_guardians/.test(sql)) return [];
      return [];
    });
    const out = await ctx.runWith(parent, () => svc.getActiveRoutes(parent));
    expect(out).toEqual([]);
    // Only the accessible-route-id lookup ran; the main active-routes query was skipped.
    expect(
      calls.some((c) => /FROM stx_runs run\s+JOIN trips/.test(c.sql)),
    ).toBe(false);
  });

  it('returns mapped route summaries for admin (no route-id filter)', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/FROM stx_runs run\s+JOIN trips/.test(sql)) {
        return [
          {
            route_id: 'R-1',
            route_name: 'Route One',
            vehicle_id: 'V-1',
            start_time: '08:00:00',
            school_id: 'sch-1',
            school_name: 'School One',
            school_lat: 45,
            school_lng: -75,
            direction: 'AM',
          },
        ];
      }
      if (/FROM stop_times st\s+JOIN trips/.test(sql)) {
        return [
          {
            route_id: 'R-1',
            stop_id: 'S-1',
            stop_sequence: 1,
            stop_name: 'Stop One',
            stop_lat: 45.1,
            stop_lon: -75.1,
            arrival_time: '08:05:00',
          },
        ];
      }
      return [];
    });
    const out = (await ctx.runWith(superAdmin, () =>
      svc.getActiveRoutes(superAdmin),
    )) as Array<{ id: string; stops: unknown[] }>;
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('R-1');
    expect(out[0].stops).toHaveLength(1);
  });
});

describe('GpsGatewayService.getReferenceRouteById', () => {
  it('throws NotFound when the route does not exist', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(superAdmin, () =>
        svc.getReferenceRouteById('R-missing', superAdmin),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the route summary for an accessible route', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/FROM routes r\s+LEFT JOIN stx_schools/.test(sql)) {
        return [
          {
            route_id: 'R-1',
            route_name: 'Route One',
            school_id: 'sch-1',
            school_name: 'School One',
            school_lat: 45,
            school_lng: -75,
            direction: 'AM',
          },
        ];
      }
      if (/FROM stop_times st\s+JOIN trips/.test(sql)) return [];
      return [];
    });
    const out = (await ctx.runWith(superAdmin, () =>
      svc.getReferenceRouteById('R-1', superAdmin),
    )) as { id: string; schoolName: string };
    expect(out.id).toBe('R-1');
    expect(out.schoolName).toBe('School One');
  });
});
