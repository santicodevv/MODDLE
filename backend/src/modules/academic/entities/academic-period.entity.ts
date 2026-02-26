import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReEnrolmentRequest } from './re-enrolment-request.entity';

export enum AcademicPeriodStatus {
  PLANNED = 'planned',
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('academic_periods')
export class AcademicPeriod {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  code: string; // 2024-1, 2024-Q1, etc.

  @Column({ type: 'varchar', length: 255 })
  name: string; // Primer Cuatrimestre 2024

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: AcademicPeriodStatus.PLANNED,
  })
  @Index()
  status: AcademicPeriodStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Información adicional

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => ReEnrolmentRequest,
    (request) => request.period,
  )
  reEnrolmentRequests: ReEnrolmentRequest[];
}
