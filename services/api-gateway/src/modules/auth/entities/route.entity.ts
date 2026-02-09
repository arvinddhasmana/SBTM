import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { School } from './school.entity';
import { Vehicle } from './vehicle.entity';
import { RouteStop } from './route-stop.entity';

export enum RouteDirection {
    AM = 'AM',
    PM = 'PM'
}

@Entity('routes')
@Unique(['schoolId', 'name'])
export class Route {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    schoolId: string;

    @ManyToOne(() => School)
    @JoinColumn({ name: 'schoolId' })
    school: School;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: RouteDirection
    })
    direction: RouteDirection;

    @Column({ nullable: true })
    vehicleId: string;

    @ManyToOne(() => Vehicle, (vehicle) => vehicle.routes)
    @JoinColumn({ name: 'vehicleId' })
    vehicle: Vehicle;

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'int', default: 60 }) // Duration in minutes
    estimatedDuration: number;

    @OneToMany(() => RouteStop, (stop) => stop.route, { cascade: true })
    stops: RouteStop[];
}
