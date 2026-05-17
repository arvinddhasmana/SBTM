import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '@sbtm/common';
import { AbsenceGatewayService } from './absence.gateway.service';
import { RequestContextService } from '../../../common/services/request-context.service';
import { RlsContextService } from '../../../common/services/rls-context.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

const parent: AuthenticatedUser = {
  id: 'u-parent',
  email: 'parent@example.com',
  role: Role.PARENT,
  anchorKind: 'parent',
  anchorId: 'grd-1',
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

const boardAdmin: AuthenticatedUser = {
  id: 'u-ba',
  email: 'ba@example.com',
  role: Role.BOARD_ADMIN,
  anchorKind: 'board',
  anchorId: 'brd-1',
  preferredLanguage: 'en',
};

const staAdmin: AuthenticatedUser = {
  id: 'u-sta',
  email: 'sta@example.com',
  role: Role.STA_ADMIN,
  anchorKind: 'sta',
  anchorId: 'sta-1',
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

interface QueryCall {
  sql: string;
  params?: unknown[];
}

function makeTx(responder: (sql: string, params?: unknown[]) => unknown[]): {
  tx: EntityManager;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];
  const tx = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (/SET LOCAL/i.test(sql)) return [];
      return responder(sql, params);
    },
  } as unknown as EntityManager;
  return { tx, calls };
}

function makeService(
  responder: (sql: string, params?: unknown[]) => unknown[],
) {
  const { tx, calls } = makeTx(responder);
  const ds = {
    transaction: async <T>(fn: (m: EntityManager) => Promise<T>) => fn(tx),
  } as unknown as DataSource;
  const ctx = new RequestContextService();
  const rls = new RlsContextService(ds, ctx);
  const svc = new AbsenceGatewayService(ds, rls);
  return { svc, calls, ctx };
}

const baseDto = {
  studentId: '30000000-0000-0001-0000-000000000001',
  tripDate: '2026-05-18',
  routeType: 'AM' as const,
  notes: 'sick',
};

describe('AbsenceGatewayService.reportAbsence', () => {
  it('rejects non-parents', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(schoolAdmin, () => svc.reportAbsence(baseDto, schoolAdmin)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects parents without a guardian anchor', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith({ ...parent, anchorId: null }, () =>
        svc.reportAbsence(baseDto, { ...parent, anchorId: null }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when guardian is not linked to the student', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/FROM stx_student_guardians/.test(sql)) return [];
      return [];
    });
    await expect(
      ctx.runWith(parent, () => svc.reportAbsence(baseDto, parent)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate absence for same student/date/route', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/FROM stx_student_guardians/.test(sql)) return [{ '?column?': 1 }];
      if (/SELECT id FROM stx_student_absences/.test(sql))
        return [{ id: 'abs-existing' }];
      return [];
    });
    await expect(
      ctx.runWith(parent, () => svc.reportAbsence(baseDto, parent)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('inserts a pending absence row and returns the DTO', async () => {
    const now = new Date('2026-05-17T10:00:00Z');
    const { svc, ctx, calls } = makeService((sql) => {
      if (/FROM stx_student_guardians/.test(sql)) return [{ '?column?': 1 }];
      if (/SELECT id FROM stx_student_absences/.test(sql)) return [];
      if (/INSERT INTO stx_student_absences/.test(sql)) {
        return [
          {
            id: 'abs-1',
            student_id: baseDto.studentId,
            trip_date: baseDto.tripDate,
            route_type: 'AM',
            confirmation_status: 'pending',
            reported_by_user_id: parent.id,
            notes: 'sick',
            created_at: now,
            updated_at: now,
          },
        ];
      }
      return [];
    });
    const out = await ctx.runWith(parent, () =>
      svc.reportAbsence(baseDto, parent),
    );
    expect(out).toEqual({
      id: 'abs-1',
      studentId: baseDto.studentId,
      tripDate: baseDto.tripDate,
      routeType: 'AM',
      confirmationStatus: 'pending',
      reportedByUserId: parent.id,
      notes: 'sick',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    const insertCall = calls.find((c) =>
      /INSERT INTO stx_student_absences/.test(c.sql),
    );
    expect(insertCall?.params).toEqual([
      baseDto.studentId,
      baseDto.tripDate,
      'AM',
      parent.id,
      'sick',
    ]);
  });
});

describe('AbsenceGatewayService.listAbsencesForAdmin', () => {
  const sampleRow = {
    id: 'abs-1',
    student_id: 's-1',
    trip_date: '2026-05-18',
    route_type: 'AM',
    confirmation_status: 'pending',
    reported_by_user_id: 'u-parent',
    notes: null,
    created_at: new Date('2026-05-17T10:00:00Z'),
    updated_at: new Date('2026-05-17T10:00:00Z'),
  };

  it('forbids parents', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(parent, () => svc.listAbsencesForAdmin(parent)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes school admins to their own school and ignores schoolId param', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/FROM stx_student_absences a/.test(sql)) return [sampleRow];
      return [];
    });
    const out = await ctx.runWith(schoolAdmin, () =>
      svc.listAbsencesForAdmin(schoolAdmin, '2026-05-18', 'sch-OTHER'),
    );
    expect(out).toHaveLength(1);
    const listCall = calls.find((c) =>
      /FROM stx_student_absences a/.test(c.sql),
    );
    expect(listCall?.sql).toMatch(/stu\.school_id = \$2::uuid/);
    expect(listCall?.params).toEqual(['2026-05-18', 'sch-1']);
  });

  it('scopes board admins via stx_schools.board_id', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/FROM stx_student_absences a/.test(sql)) return [];
      return [];
    });
    await ctx.runWith(boardAdmin, () =>
      svc.listAbsencesForAdmin(boardAdmin, undefined, 'sch-7'),
    );
    const listCall = calls.find((c) =>
      /FROM stx_student_absences a/.test(c.sql),
    );
    expect(listCall?.sql).toMatch(/sch\.board_id = \$1::uuid/);
    expect(listCall?.sql).toMatch(/stu\.school_id = \$2::uuid/);
    expect(listCall?.params).toEqual(['brd-1', 'sch-7']);
  });

  it('scopes sta admins via stx_boards.sta_id subquery', async () => {
    const { svc, ctx, calls } = makeService(() => []);
    await ctx.runWith(staAdmin, () =>
      svc.listAbsencesForAdmin(staAdmin, '2026-05-18'),
    );
    const listCall = calls.find((c) =>
      /FROM stx_student_absences a/.test(c.sql),
    );
    expect(listCall?.sql).toMatch(
      /sch\.board_id IN \(SELECT id FROM stx_boards WHERE sta_id = \$2::uuid\)/,
    );
    expect(listCall?.params).toEqual(['2026-05-18', 'sta-1']);
  });

  it('drivers see absences for students on their runs that day', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/FROM stx_student_absences a/.test(sql)) return [sampleRow];
      return [];
    });
    const out = await ctx.runWith(driver, () =>
      svc.listAbsencesForAdmin(driver, '2026-05-18'),
    );
    expect(out).toHaveLength(1);
    const listCall = calls.find((c) =>
      /FROM stx_student_absences a/.test(c.sql),
    );
    expect(listCall?.sql).toMatch(/JOIN stx_ridership/);
    expect(listCall?.sql).toMatch(/JOIN stx_runs/);
    expect(listCall?.params).toEqual(['drv-1', '2026-05-18']);
  });
});

describe('AbsenceGatewayService.confirmAbsence / rejectAbsence', () => {
  const pendingRow = {
    id: 'abs-1',
    confirmation_status: 'pending',
    school_id: 'sch-1',
  };
  const updatedRow = {
    id: 'abs-1',
    student_id: 's-1',
    trip_date: '2026-05-18',
    route_type: 'AM',
    confirmation_status: 'confirmed',
    reported_by_user_id: 'u-parent',
    notes: null,
    created_at: new Date('2026-05-17T10:00:00Z'),
    updated_at: new Date('2026-05-17T11:00:00Z'),
  };

  it('forbids non-school-admins', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(boardAdmin, () => svc.confirmAbsence('abs-1', boardAdmin)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s on missing absence', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(schoolAdmin, () => svc.confirmAbsence('ghost', schoolAdmin)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects absences in another school', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/JOIN stx_students stu/.test(sql))
        return [{ ...pendingRow, school_id: 'sch-OTHER' }];
      return [];
    });
    await expect(
      ctx.runWith(schoolAdmin, () => svc.confirmAbsence('abs-1', schoolAdmin)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-pending absences', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/JOIN stx_students stu/.test(sql))
        return [{ ...pendingRow, confirmation_status: 'confirmed' }];
      return [];
    });
    await expect(
      ctx.runWith(schoolAdmin, () => svc.confirmAbsence('abs-1', schoolAdmin)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms pending absence and returns updated DTO', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/JOIN stx_students stu/.test(sql)) return [pendingRow];
      if (/UPDATE stx_student_absences/.test(sql)) return [updatedRow];
      return [];
    });
    const out = await ctx.runWith(schoolAdmin, () =>
      svc.confirmAbsence('abs-1', schoolAdmin),
    );
    expect(out.confirmationStatus).toBe('confirmed');
    const updateCall = calls.find((c) =>
      /UPDATE stx_student_absences/.test(c.sql),
    );
    expect(updateCall?.params?.[0]).toBe('confirmed');
    expect(updateCall?.params?.[2]).toBe('abs-1');
  });

  it('rejectAbsence persists notes via COALESCE', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/JOIN stx_students stu/.test(sql)) return [pendingRow];
      if (/UPDATE stx_student_absences/.test(sql))
        return [
          { ...updatedRow, confirmation_status: 'rejected', notes: 'no proof' },
        ];
      return [];
    });
    const out = await ctx.runWith(schoolAdmin, () =>
      svc.rejectAbsence('abs-1', schoolAdmin, 'no proof'),
    );
    expect(out.confirmationStatus).toBe('rejected');
    expect(out.notes).toBe('no proof');
    const updateCall = calls.find((c) =>
      /UPDATE stx_student_absences/.test(c.sql),
    );
    expect(updateCall?.params).toEqual(['rejected', 'no proof', 'abs-1']);
  });
});

describe('AbsenceGatewayService.deleteAbsence', () => {
  const ownRow = {
    id: 'abs-1',
    reported_by_user_id: parent.id,
    confirmation_status: 'pending',
    school_id: 'sch-1',
    board_id: 'brd-1',
  };

  it('404s on missing absence', async () => {
    const { svc, ctx } = makeService(() => []);
    await expect(
      ctx.runWith(schoolAdmin, () => svc.deleteAbsence('ghost', schoolAdmin)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('parents may cancel their own pending absence', async () => {
    const { svc, ctx, calls } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql)) return [ownRow];
      return [];
    });
    await ctx.runWith(parent, () => svc.deleteAbsence('abs-1', parent));
    expect(
      calls.some((c) => /DELETE FROM stx_student_absences/.test(c.sql)),
    ).toBe(true);
  });

  it("parents cannot cancel another parent's report", async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql))
        return [{ ...ownRow, reported_by_user_id: 'u-other' }];
      return [];
    });
    await expect(
      ctx.runWith(parent, () => svc.deleteAbsence('abs-1', parent)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('parents cannot cancel a processed absence', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql))
        return [{ ...ownRow, confirmation_status: 'confirmed' }];
      return [];
    });
    await expect(
      ctx.runWith(parent, () => svc.deleteAbsence('abs-1', parent)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('school admins can delete absences in their own school only', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql)) return [ownRow];
      return [];
    });
    await ctx.runWith(schoolAdmin, () =>
      svc.deleteAbsence('abs-1', schoolAdmin),
    );
  });

  it('school admins cannot delete absences in another school', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql))
        return [{ ...ownRow, school_id: 'sch-OTHER' }];
      return [];
    });
    await expect(
      ctx.runWith(schoolAdmin, () => svc.deleteAbsence('abs-1', schoolAdmin)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sta admins succeed when board belongs to their STA', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql)) return [ownRow];
      if (/FROM stx_boards/.test(sql)) return [{ '?column?': 1 }];
      return [];
    });
    await ctx.runWith(staAdmin, () => svc.deleteAbsence('abs-1', staAdmin));
  });

  it('sta admins fail when board not in their STA', async () => {
    const { svc, ctx } = makeService((sql) => {
      if (/SELECT a\.id, a\.reported_by_user_id/.test(sql)) return [ownRow];
      if (/FROM stx_boards/.test(sql)) return [];
      return [];
    });
    await expect(
      ctx.runWith(staAdmin, () => svc.deleteAbsence('abs-1', staAdmin)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
