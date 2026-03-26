import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, DataSource } from 'typeorm';

/**
 * TenantContextSubscriber propagates the current tenant's school_id to the
 * PostgreSQL session variable `app.current_school_id` before TypeORM executes
 * a query.
 *
 * IMPORTANT: This subscriber uses `SET LOCAL` which scopes the variable to the
 * current transaction. All tenant-scoped operations MUST be wrapped in a
 * transaction for the RLS policy to apply correctly.
 *
 * Usage: inject `DataSource` and call `setTenantContext(schoolId)` before
 * executing any tenant-scoped query. See TenantContextService.
 */
@EventSubscriber()
export class TenantContextSubscriber implements EntitySubscriberInterface {
    private schoolId: string | null = null;

    constructor(dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }

    setSchoolId(schoolId: string | null): void {
        this.schoolId = schoolId;
    }

    beforeInsert(event: InsertEvent<unknown>): void | Promise<void> {
        return this.applyContext(event.queryRunner?.connection?.driver ? event : null);
    }

    beforeUpdate(event: UpdateEvent<unknown>): void | Promise<void> {
        return this.applyContext(event.queryRunner?.connection?.driver ? event : null);
    }

    beforeRemove(event: RemoveEvent<unknown>): void | Promise<void> {
        return this.applyContext(event.queryRunner?.connection?.driver ? event : null);
    }

    private async applyContext(event: { queryRunner?: { query: (sql: string, params?: unknown[]) => Promise<unknown> } } | null): Promise<void> {
        if (!this.schoolId || !event?.queryRunner) {
            return;
        }
        // SET LOCAL scopes the variable to the current transaction only.
        await event.queryRunner.query(
            `SET LOCAL app.current_school_id = $1`,
            [this.schoolId],
        );
    }
}
