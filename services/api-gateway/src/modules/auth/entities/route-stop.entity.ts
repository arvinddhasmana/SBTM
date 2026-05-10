import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Route } from './route.entity';

@Entity('route_stops')
export class RouteStop {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    routeId: string;

    @ManyToOne(() => Route, (route) => route.stops, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'routeId' })
    route: Route;

    @Column('int')
    sequence: number;

    @Column()
    address: string;

    @Index({ spatial: true })
    @Column({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
    })
    location: string; // Will store as "POINT(lng lat)"

    // Add lat/lng columns for easier access by frontend
    // These are redundant with location but improve compatibility
    @Column({ type: 'double precision', nullable: true })
    lat?: number;

    @Column({ type: 'double precision', nullable: true })
    lng?: number;
}
