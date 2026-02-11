import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Route } from '../../auth/entities/route.entity';

interface DriverUser {
    id: string;
    assignedRouteIds?: string[];
}

interface DriverRouteDto {
    routeId: string;
    name: string;
    direction: string;
    startTime: string;
    vehicleId?: string;
    schoolId: string;
}

@Injectable()
export class DriverGatewayService {
    constructor(
        @InjectRepository(Route)
        private readonly routeRepository: Repository<Route>,
    ) {}

    async getScheduleForDriver(user: DriverUser): Promise<DriverRouteDto[]> {
        const routeIds = user.assignedRouteIds || [];
        if (routeIds.length === 0) {
            return [];
        }

        const routes = await this.routeRepository.findBy({ id: In(routeIds) });
        return routes.map((route) => ({
            routeId: route.id,
            name: route.name,
            direction: route.direction,
            startTime: route.startTime,
            vehicleId: route.vehicleId,
            schoolId: route.schoolId,
        }));
    }
}
