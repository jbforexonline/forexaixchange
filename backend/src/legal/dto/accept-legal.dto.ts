import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptLegalDto {
  @ApiProperty({ description: 'Explicit acceptance', example: true })
  @IsBoolean()
  accept: boolean;
}
