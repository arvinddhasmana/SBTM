import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

const ALLOWED_EVENT_TYPES = ['ROUTE_STARTED', 'STOP_REACHED', 'ROUTE_COMPLETED'] as const;

const lifecycleSchema = z.object({
  schoolId: z.string().min(1),
  routeId: z.string().min(1),
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  eventType: z.enum(ALLOWED_EVENT_TYPES),
  timestamp: z.string().datetime(),
  stopId: z.string().optional(),
});

/**
 * POST /api/v1/routes/lifecycle
 * Records a route lifecycle event (start, stop, completion).
 * schoolId is required in the body; the gateway always derives it from JWT.
 */
export const recordLifecycleEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = lifecycleSchema.parse(req.body);

    await prisma.routeLifecycleEvent.create({
      data: {
        schoolId: data.schoolId,
        routeId: data.routeId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        eventType: data.eventType,
        stopId: data.stopId ?? null,
        timestamp: new Date(data.timestamp),
      },
    });

    // Maintain the stx_runs.status projection consumed by the live dashboard.
    // See docs/Design/ADR-0001-active-run-projection.md.
    // vehicleId in events is text; stx_runs.vehicle_id is uuid — cast both sides.
    if (data.eventType === 'ROUTE_STARTED' || data.eventType === 'ROUTE_COMPLETED') {
      const nextStatus = data.eventType === 'ROUTE_STARTED' ? 'in_progress' : 'completed';
      const serviceDate = new Date(data.timestamp).toISOString().slice(0, 10);
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE stx_runs
                       SET status = $1::stx_run_status_enum,
                           updated_at = now()
                     WHERE vehicle_id = $2::uuid
                       AND service_date = $3::date
                       AND deleted_at IS NULL
                       AND status NOT IN ('cancelled')`,
          nextStatus,
          data.vehicleId,
          serviceDate,
        );
      } catch (err) {
        // Projection update is best-effort; the event log remains the source of truth.
        console.warn('stx_runs status projection update failed', {
          routeId: data.routeId,
          eventType: data.eventType,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Log IDs and event type only – no T4 data in logs
    console.info('Route lifecycle event recorded', {
      routeId: data.routeId,
      eventType: data.eventType,
    });

    res.status(201).json({ status: 'recorded' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Failed to record lifecycle event', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

/**
 * GET /api/v1/routes/:routeId/lifecycle
 * Returns lifecycle events for a route.
 */
export const getRouteLifecycle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { routeId } = req.params;
    const schoolId = req.query.schoolId as string | undefined;

    const events = await prisma.routeLifecycleEvent.findMany({
      where: {
        routeId,
        ...(schoolId ? { schoolId } : {}),
      },
      orderBy: { timestamp: 'asc' },
    });

    res.json(events);
  } catch (error) {
    console.error('Failed to get lifecycle events', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
