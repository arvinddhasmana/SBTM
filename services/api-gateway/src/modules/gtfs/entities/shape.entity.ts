import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('shapes')
export class Shape {
  @PrimaryColumn({ name: 'shape_id', type: 'text' })
  shapeId: string;

  @Column({ name: 'shape_pt_lat', type: 'double precision' })
  shapePtLat: number;

  @Column({ name: 'shape_pt_lon', type: 'double precision' })
  shapePtLon: number;

  @PrimaryColumn({ name: 'shape_pt_sequence', type: 'int' })
  shapePtSequence: number;

  @Column({
    name: 'shape_dist_traveled',
    type: 'double precision',
    nullable: true,
  })
  shapeDistTraveled: number | null;
}
