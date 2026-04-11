import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SchoolBoard } from './school-board.entity';
import { User } from './user.entity';

@Entity('schools')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  boardId: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ type: 'double precision', nullable: true })
  lat: number;

  @Column({ type: 'double precision', nullable: true })
  lng: number;

  @ManyToOne(() => SchoolBoard, (board) => board.schools)
  @JoinColumn({ name: 'boardId' })
  board: SchoolBoard;

  @OneToMany(() => User, (user) => user.school)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
