import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../infrastructure/database/database.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.db.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
        status: { in: ['ACTIVE'] },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return payload;
  }
}
