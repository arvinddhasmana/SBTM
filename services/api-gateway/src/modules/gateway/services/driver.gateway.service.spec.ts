import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotImplementedException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '@sbtm/common';
import { DriverGatewayService } from './driver.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { RequestContextService } from '../../../common/services/request-context.service';
import { RlsContextService } from '../../../common/services/rls-context.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

const driver: AuthenticatedUser = {
  id: 'u-driver',
  email: 'driver@example.com',
  role: Role.DRIVER,
  anchorKind: 'driver',
  anchorId: 'drv-1',
  preferredLanguage: 'en',
};

interface QueryCall {
  sql: string;
  params?: unknown[];
}

function makeTx(rows: Record<string, unknown>[]): {
  tx: EntityManager;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];
  const tx = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (/SET LOCAL/i.test(sql)) return [];
      return rows;
    },
  } as unknown as EntityManager;
  return { tx, calls };
}

function makeService(rows: Record<string, unknown>[]): {
  svc: DriverGatewayService;
  calls: QueryCall[];
  ctx: RequestContextService;
} {
  const { tx, calls } = makeTx(rows);
  const ds = {
    transaction: async <T>(fn: (m: EntityManager) => Promise<T>) => fn(tx),
  } as unknown as DataSource;
  const ctx = new RequestContextService();
  const rls = new RlsContextService(ds, ctx);
  const config = {
    getOrThrow: () => 'http://presence:3000',
  } as unknown as ConfigService;
  const http = {} as HttpClientService;
  const svc = new DriverGatewayService(http, config, ds, rls);
  return { svc, calls, ctx };
}

describe('DriverGatewayService.getScheduleForDriver', () => {
  it('forbids non-driver anchors', async () => {
    const { svc, ctx } = makeService([]);
    await expect(
      ctx.runWith({ ...driver, anchorKind: 'school' }, () =>
        svc.getScheduleForDriver({ ...driver, anchorKind: 'school' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids drivers with no anchorId', async () => {
    const { svc, ctx } = makeService([]);
    await expect(
      ctx.runWith({ ...driver, anchorId: null }, () =>
        svc.getScheduleForDriver({ ...driver, anchorId: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns runs for the anchored driver on today', async () => {
    const { svc, ctx, calls } = makeService([
      {
        route_id: 'R-OCDSB-101',
        route_short_name: '101',
        route_long_name: 'Maplewood AM',
        direction: 'am',
        start_time: '07:30:00',
        vehicle_id: 'veh-1',
        school_id: 'sch-1',
        school_name: 'Maplewood Secondary',
        school_lat: 45.42,
        school_lng: -75.69,
      },
    ]);
    const out = await ctx.runWith(driver, () =>
      svc.getScheduleForDriver(driver),
    );
    expect(out).toEqual([
      {
        routeId: 'R-OCDSB-101',
        name: 'Maplewood AM',
        direction: 'am',
        startTime: '07:30:00',
        vehicleId: 'veh-1',
        schoolId: 'sch-1',
        schoolName: 'Maplewood Secondary',
        schoolLat: 45.42,
        schoolLng: -75.69,
      },
    ]);
    // First two queries are SET LOCAL (RLS GUCs), then the main schedule query.
    expect(calls[0].sql).toMatch(/SET LOCAL sbtm\.user_anchor_kind/);
    expect(calls[0].params).toEqual(['driver']);
    expect(calls[1].sql).toMatch(/SET LOCAL sbtm\.user_anchor_id/);
    expect(calls[1].params).toEqual(['drv-1']);
    expect(calls[2].sql).toMatch(/FROM stx_runs run/);
    expect(calls[2].params?.[0]).toBe('drv-1');
    expect(calls[2].params?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('falls back to route_short_name then route_id when long name missing', async () => {
    const { svc, ctx } = makeService([
      {
        route_id: 'R-1',
        route_short_name: '1',
        route_long_name: null,
        direction: 'pm',
        start_time: '15:30:00',
        vehicle_id: 'v',
        school_id: 's',
        school_name: 'X',
        school_lat: null,
        school_lng: null,
      },
      {
        route_id: 'R-2',
        route_short_name: null,
        route_long_name: null,
        direction: 'pm',
        start_time: '15:45:00',
        vehicle_id: 'v',
        school_id: 's',
        school_name: 'X',
        school_lat: null,
        school_lng: null,
      },
    ]);
    const out = await ctx.runWith(driver, () =>
      svc.getScheduleForDriver(driver),
    );
    expect(out.map((r) => r.name)).toEqual(['1', 'R-2']);
    expect(out[0].schoolLat).toBeUndefined();
    expect(out[0].schoolLng).toBeUndefined();
  });

  it('returns empty array when driver has no runs today', async () => {
    const { svc, ctx } = makeService([]);
    const out = await ctx.runWith(driver, () =>
      svc.getScheduleForDriver(driver),
    );
    expect(out).toEqual([]);
  });
});

describe('DriverGatewayService.getRouteStudents', () => {
  it('still 501s pending the student↔stop assignment model', async () => {
    const { svc, ctx } = makeService([]);
    await expect(
      ctx.runWith(driver, () => svc.getRouteStudents('R-1', driver)),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });

  it('forbids non-driver anchors before throwing 501', async () => {
    const { svc, ctx } = makeService([]);
    await expect(
      ctx.runWith({ ...driver, anchorKind: 'parent' }, () =>
        svc.getRouteStudents('R-1', { ...driver, anchorKind: 'parent' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
