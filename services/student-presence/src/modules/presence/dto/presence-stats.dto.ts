export class RouteStatsDto {
    routeId: string;
    routeName: string;
    boarded: number;
    alighted: number;
}

export class PresenceStatsDto {
    totalStudents: number;
    boarded: number;
    alighted: number;
    unknown: number;
    byRoute: RouteStatsDto[];
}
