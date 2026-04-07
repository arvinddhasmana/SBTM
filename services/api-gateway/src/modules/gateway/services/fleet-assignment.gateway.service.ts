import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { ProposeFleetAssignmentDto } from '../dto/propose-fleet-assignment.dto';
import { Role } from '@sbtm/common';

interface CallerContext {
  id: string;
  role: Role;
  schoolId?: string;
  boardId?: string;
}

@Injectable()
export class FleetAssignmentGatewayService {
  private readonly logger = new Logger(FleetAssignmentGatewayService.name);

  constructor(
    @InjectRepository(FleetAssignment)
    private readonly assignmentRepository: Repository<FleetAssignment>,
  ) {}

  /**
   * Propose a new fleet assignment. Called by OSTA_ADMIN.
   */
  async propose(
    dto: ProposeFleetAssignmentDto,
    caller: CallerContext,
  ): Promise<FleetAssignment> {
    const assignment = this.assignmentRepository.create({
      schoolId: dto.schoolId,
      routeId: dto.routeId,
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      effectiveDate: dto.effectiveDate,
      status: 'PROPOSED',
      proposedByUserId: caller.id,
      reviewNotes: dto.notes,
    });

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log('Fleet assignment proposed', {
      assignmentId: saved.id,
      schoolId: saved.schoolId,
      action: 'fleet-assignment.proposed',
    });

    return saved;
  }

  /**
   * List fleet assignments. OSTA_ADMIN sees all; SCHOOL_ADMIN sees own school.
   */
  async list(caller: CallerContext): Promise<FleetAssignment[]> {
    if (caller.role === Role.SCHOOL_ADMIN) {
      if (!caller.schoolId) {
        throw new ForbiddenException('User is not associated with a school');
      }
      return this.assignmentRepository.find({
        where: { schoolId: caller.schoolId },
        order: { createdAt: 'DESC' },
      });
    }

    // OSTA_ADMIN / SUPER_ADMIN sees all
    return this.assignmentRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Get a single fleet assignment by ID.
   */
  async getById(id: string): Promise<FleetAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('Fleet assignment not found');
    }
    return assignment;
  }

  /**
   * Accept a proposed fleet assignment. Caller must be SCHOOL_ADMIN with matching schoolId.
   */
  async accept(id: string, caller: CallerContext): Promise<FleetAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('Fleet assignment not found');
    }

    if (
      caller.role === Role.SCHOOL_ADMIN &&
      assignment.schoolId !== caller.schoolId
    ) {
      throw new ForbiddenException(
        'You can only accept assignments for your own school',
      );
    }

    assignment.status = 'ACCEPTED';
    assignment.reviewedByUserId = caller.id;
    assignment.reviewedAt = new Date();

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log('Fleet assignment accepted', {
      assignmentId: saved.id,
      schoolId: saved.schoolId,
      callerId: caller.id,
      action: 'fleet-assignment.accepted',
    });

    return saved;
  }

  /**
   * Reject a proposed fleet assignment. Caller must be SCHOOL_ADMIN with matching schoolId.
   */
  async reject(
    id: string,
    caller: CallerContext,
    notes?: string,
  ): Promise<FleetAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('Fleet assignment not found');
    }

    if (
      caller.role === Role.SCHOOL_ADMIN &&
      assignment.schoolId !== caller.schoolId
    ) {
      throw new ForbiddenException(
        'You can only reject assignments for your own school',
      );
    }

    assignment.status = 'REJECTED';
    assignment.reviewedByUserId = caller.id;
    assignment.reviewedAt = new Date();
    if (notes) {
      assignment.reviewNotes = notes;
    }

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log('Fleet assignment rejected', {
      assignmentId: saved.id,
      schoolId: saved.schoolId,
      callerId: caller.id,
      action: 'fleet-assignment.rejected',
    });

    return saved;
  }
}
