import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role, AesGcmPiiCrypto, type PiiCrypto } from '@sbtm/common';
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

function makeTx(responder: (sql: string) => Record<string, unknown>[]): {
  tx: EntityManager;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];
  const tx = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (/SET LOCAL/i.test(sql)) return [];
      return responder(sql);
    },
  } as unknown as EntityManager;
  return { tx, calls };
}

function makeService(
  responder: (sql: string) => Record<string, unknown>[],
  pii: PiiCrypto | null = null,
): {
  svc: DriverGatewayService;
  calls: QueryCall[];
  ctx: RequestContextService;
} {
  const { tx, calls } = makeTx(responder);
  const ds = {
    transaction: async <T>(fn: (m: EntityManager) => Promise<T>) => fn(tx),
  } as unknown as DataSource;
  const ctx = new RequestContextService();
  const rls = new RlsContextService(ds, ctx);
  const config = {
    getOrThrow: () => 'http://presence:3000',
  } as unknown as ConfigService;
  const http = {} as HttpClientService;
  const svc = new DriverGatewayService(http, config, ds, rls, pii);
  return { svc, calls, ctx };
}

function rowsFor(rows: Record<string, unknown>[]) {
  return () => rows;
}

describe('DriverGatewayService.getScheduleForDriver', () => {
  it('forbids non-driver anchors', async () => {
    const { svc, ctx } = makeService(rowsFor([]));
    await expect(
      ctx.runWith({ ...driver, anchorKind: 'school' }, () =>
        svc.getScheduleForDriver({ ...driver, anchorKind: 'school' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids drivers with no anchorId', async () => {
    const { svc, ctx } = makeService(rowsFor([]));
    await expect(
      ctx.runWith({ ...driver, anchorId: null }, () =>
        svc.getScheduleForDriver({ ...driver, anchorId: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns runs for the anchored driver on today', async () => {
    const scheduleRows = [
      {
        route_id: 'R-OCDSB-101',
        route_short_name: '101',
        route_long_name: 'Maplewood AM',
        direction: 'am',
        start_time: '07:30:00',
        vehicle_id: 'veh-1',
        run_id: undefined,
        school_id: 'sch-1',
        school_name: 'Maplewood Secondary',
        school_lat: 45.42,
        school_lng: -75.69,
      },
    ];
    const { svc, ctx, calls } = makeService((sql) =>
      /FROM shapes/i.test(sql) ? [] : scheduleRows,
    );
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
        runId: undefined,
        schoolId: 'sch-1',
        schoolName: 'Maplewood Secondary',
        schoolLat: 45.42,
        schoolLng: -75.69,
        path: undefined,
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
    const { svc, ctx } = makeService(
      rowsFor([
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
      ]),
    );
    const out = await ctx.runWith(driver, () =>
      svc.getScheduleForDriver(driver),
    );
    expect(out.map((r) => r.name)).toEqual(['1', 'R-2']);
    expect(out[0].schoolLat).toBeUndefined();
    expect(out[0].schoolLng).toBeUndefined();
  });

  it('returns empty array when driver has no runs today', async () => {
    const { svc, ctx } = makeService(rowsFor([]));
    const out = await ctx.runWith(driver, () =>
      svc.getScheduleForDriver(driver),
    );
    expect(out).toEqual([]);
  });
});

describe('DriverGatewayService.getRouteStudents', () => {
  const fixedKey = Buffer.alloc(32, 7);
  const pii = new AesGcmPiiCrypto(fixedKey);

  function responder(
    stops: Record<string, unknown>[],
    students: Record<string, unknown>[],
  ) {
    return (sql: string) => {
      if (/FROM stx_ridership/.test(sql)) return students;
      if (/FROM stx_runs run/.test(sql)) return stops;
      return [];
    };
  }

  it('forbids non-driver anchors', async () => {
    const { svc, ctx } = makeService(responder([], []), pii);
    await expect(
      ctx.runWith({ ...driver, anchorKind: 'parent' }, () =>
        svc.getRouteStudents('R-1', { ...driver, anchorKind: 'parent' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids drivers with no anchorId', async () => {
    const { svc, ctx } = makeService(responder([], []), pii);
    await expect(
      ctx.runWith({ ...driver, anchorId: null }, () =>
        svc.getRouteStudents('R-1', { ...driver, anchorId: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns empty stops + students for a route the driver is not assigned to', async () => {
    const { svc, ctx } = makeService(responder([], []), pii);
    const out = await ctx.runWith(driver, () =>
      svc.getRouteStudents('R-1', driver),
    );
    expect(out).toEqual({ stops: [], students: [], direction: '' });
  });

  it('returns stops sorted by sequence and students with decrypted preferred name', async () => {
    const stops = [
      {
        id: 'stop-b',
        stop_name: 'Stop B',
        sequence: 2,
        arrival_time: '07:35:00',
        lat: 45.42,
        lng: -75.69,
        direction: 'am',
      },
      {
        id: 'stop-a',
        stop_name: 'Stop A',
        sequence: 1,
        arrival_time: '07:30:00',
        lat: 45.4,
        lng: -75.7,
        direction: 'am',
      },
    ];
    const students = [
      {
        student_id: 'stu-1',
        legal_name: pii.encrypt('Alex Legal'),
        preferred_name: pii.encrypt('Alex'),
        stop_id: 'stop-a',
        stop_name: 'Stop A',
        stop_sequence: 1,
      },
      {
        student_id: 'stu-2',
        legal_name: pii.encrypt('Beatrice Legal'),
        preferred_name: null,
        stop_id: 'stop-b',
        stop_name: 'Stop B',
        stop_sequence: 2,
      },
    ];
    const { svc, ctx, calls } = makeService(responder(stops, students), pii);
    const out = await ctx.runWith(driver, () =>
      svc.getRouteStudents('R-OCDSB-101', driver),
    );
    expect(out.direction).toBe('am');
    expect(out.stops.map((s) => s.id)).toEqual(['stop-a', 'stop-b']);
    expect(out.stops[0].arrivalTime).toBe('07:30:00');
    expect(out.students).toEqual([
      {
        id: 'stu-1',
        name: 'Alex',
        status: 'NOT_BOARDED',
        stopId: 'stop-a',
        stopName: 'Stop A',
        stopSequence: 1,
      },
      {
        id: 'stu-2',
        name: 'Beatrice Legal',
        status: 'NOT_BOARDED',
        stopId: 'stop-b',
        stopName: 'Stop B',
        stopSequence: 2,
      },
    ]);
    // RLS GUCs set, then stops query, then ridership query — all under runAsCurrent.
    expect(calls[0].sql).toMatch(/SET LOCAL sbtm\.user_anchor_kind/);
    expect(calls[2].sql).toMatch(/FROM stx_runs run/);
    expect(calls[2].params).toEqual([
      'drv-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      'R-OCDSB-101',
    ]);
    expect(calls[3].sql).toMatch(/FROM stx_ridership/);
    expect(calls[3].params?.[0]).toBe('R-OCDSB-101');
    expect(calls[3].params?.[2]).toBe('drv-1');
  });

  it('falls back to student id when pii crypto is not provided', async () => {
    const stops = [
      {
        id: 'stop-a',
        stop_name: 'Stop A',
        sequence: 1,
        arrival_time: '07:30:00',
        lat: null,
        lng: null,
        direction: 'pm',
      },
    ];
    const students = [
      {
        student_id: 'stu-1',
        legal_name: Buffer.from([1, 2, 3]),
        preferred_name: null,
        stop_id: 'stop-a',
        stop_name: 'Stop A',
        stop_sequence: 1,
      },
    ];
    const { svc, ctx } = makeService(responder(stops, students), null);
    const out = await ctx.runWith(driver, () =>
      svc.getRouteStudents('R-1', driver),
    );
    expect(out.students[0].name).toBe('stu-1');
    expect(out.direction).toBe('pm');
  });
});
