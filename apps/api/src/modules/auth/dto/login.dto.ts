import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@omnichannel.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123456' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean = false;
}
