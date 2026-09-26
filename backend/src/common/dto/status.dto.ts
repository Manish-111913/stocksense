import { IsEnum } from 'class-validator';
import { RecordStatus } from '../../generated/prisma/enums.js';

export class UpdateRecordStatusDto {
  @IsEnum(RecordStatus)
  status: RecordStatus;
}
