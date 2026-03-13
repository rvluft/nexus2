// @ts-nocheck
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PostgresService } from '../../database/postgres.service';
import { LoginDto, RegisterDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private postgresService: PostgresService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<any> {
    console.log('[AuthService] validateCredentials START', { email });
    const sql = `
      SELECT u.id, u.email, u.password_hash, u.is_active, r.name as role_name
      FROM nexus.users u
      LEFT JOIN nexus.roles r ON u.role_id = r.id
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [email]);
    console.log('[AuthService] query returned rows:', rows.length, rows[0] ? { id: rows[0].id, email: rows[0].email, active: rows[0].is_active } : 'none');

    if (rows.length === 0 || !rows[0].is_active) {
      console.log('[AuthService] user not found or inactive');
      return null;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    console.log('[AuthService] password comparison result:', valid);
    
    if (!valid) {
      console.log('[AuthService] invalid password');
      return null;
    }

    console.log('[AuthService] returning user:', { id: user.id, email: user.email, role: user.role_name });
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role_name 
    };
  }

  async login(user: any) {
    console.log('[AuthService] login START with user:', user);
    // Buscar dados completos do usuário para o payload do JWT
    const sql = `
      SELECT u.id, u.email, u.name, u.role_id, u.team_id, r.name as role_name
      FROM nexus.users u
      LEFT JOIN nexus.roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const { rows } = await this.postgresService.query(sql, [user.id]);
    const userData = rows[0];

    const payload = {
      sub: userData.id,
      email: userData.email,
      name: userData.name,
      role: {
        id: userData.role_id,
        name: userData.role_name
      },
      team: userData.team_id ? { id: userData.team_id } : null,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    console.log('[AuthService] login success, returning token');
    return {
      access_token: token,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: payload.role,
        team: payload.team,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Verificar se email já existe
    const checkSql = 'SELECT id FROM nexus.users WHERE email = $1 AND deleted_at IS NULL';
    const { rows: existing } = await this.postgresService.query(checkSql, [email]);

    if (existing.length > 0) {
      throw new ConflictException('Email já cadastrado');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12);

    // Buscar role padrão (viewer)
    const roleSql = "SELECT id FROM nexus.roles WHERE name = 'viewer'";
    const { rows: roleRows } = await this.postgresService.query(roleSql);
    const roleId = roleRows[0]?.id;

    // Criar usuário
    const insertSql = `
      INSERT INTO nexus.users (email, name, password_hash, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role_id
    `;
    const { rows: inserted } = await this.postgresService.query(insertSql, [
      email,
      name,
      passwordHash,
      roleId,
      true
    ]);

    const newUser = inserted[0];

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: {
        id: newUser.role_id,
        name: 'viewer'
      }
    };
  }

  async validateUser(id: string) {
    const sql = `
      SELECT u.id, u.email, u.name, u.is_active, u.role_id, r.name as role_name
      FROM nexus.users u
      LEFT JOIN nexus.roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [id]);

    if (rows.length === 0 || !rows[0].is_active) {
      return null;
    }

    const user = rows[0];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: {
        id: user.role_id,
        name: user.role_name
      }
    };
  }

  async me(userId: string) {
    return this.validateUser(userId);
  }
}
