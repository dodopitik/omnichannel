import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
