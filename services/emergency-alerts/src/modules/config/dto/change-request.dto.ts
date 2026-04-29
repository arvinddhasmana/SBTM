import { IsString, IsUUID, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChangeRequestDto {
  @ApiProperty({ example: 'ESCALATION_TIMING', description: 'Type of configuration to change' })
  @IsString()
  configType: string;

  @ApiProperty({ example: 'Request to reduce confirmation timeout to 90 seconds', description: 'Description of the change' })
  @IsString()
  changeDescription: string;

  @ApiProperty({ example: { confirmationTimeoutMs: 90000 }, description: 'Requested configuration values' })
  @IsObject()
  requestedConfig: Record<string, any>;

  @ApiProperty({ example: 'Our school needs faster response time', required: false })
  @IsString()
  @IsOptional()
  justification?: string;
}

export class ReviewChangeRequestDto {
  @ApiProperty({ example: 'APPROVED', enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  action: 'APPROVED' | 'REJECTED';

  @ApiProperty({ example: 'Approved based on school response capabilities', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
