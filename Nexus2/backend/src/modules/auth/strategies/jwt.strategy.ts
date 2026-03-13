// @ts-nocheck
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostgresService } from '../../../database/postgres.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private postgresService: PostgresService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Verificar se usuário ainda existe e está ativo
    const sql = `
      SELECT u.id, u.email, u.name, u.is_active, r.name as role_name
      FROM nexus.users u
      LEFT JOIN nexus.roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [payload.sub]);

    if (rows.length === 0 || !rows[0].is_active) {
      throw new UnauthorizedException();
    }

    const user = rows[0];

    // Adicionar claims extras ao request.user
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: [user.role_name], // array para compatibilidade com RolesGuard
      role: {
        id: user.role_id,
        name: user.role_name
      },
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
