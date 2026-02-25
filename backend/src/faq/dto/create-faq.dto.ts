import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ example: 'General Information' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'What is ForexAiXchange?' })
  @IsString()
  question: string;

  @ApiProperty({ example: 'ForexAiXchange is an AI-powered prediction game...' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
