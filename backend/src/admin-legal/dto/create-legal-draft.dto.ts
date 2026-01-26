import { IsString, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLegalDraftDto {
  @ApiProperty({ example: '1.1' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @ApiProperty({ description: 'Markdown or sanitized HTML content' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ example: '2026-01-26T00:00:00.000Z' })
  @IsDateString()
  effectiveAt: string;
}
