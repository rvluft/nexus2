// @ts-nocheck
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private postgresService: PostgresService) {}

  async findAll() {
    const sql = `
      SELECT u.id, u.email, u.name, u.is_active, u.created_at, u.updated_at,
             r.id as role_id, r.name as role_name
      FROM nexus.users u
      LEFT JOIN nexus.roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `;
    const { rows } = await this.postgresService.query(sql);
    return rows.map(this.mapUserWithRole);
  }

  async findOne(id: string) {
    const sql = `
      SELECT u.id, u.email, u.name, u.is_active, u.created_at, u.updated_at,
             r.id as role_id, r.name as role_name
      FROM nexus.users u
      LEFT JOIN nexus.roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.mapUserWithRole(rows[0]);
  }

  async create(createUserDto: CreateUserDto) {
    // Verificar duplicidade
    const { rows: existing } = await this.postgresService.query(
      'SELECT id FROM nexus.users WHERE email = $1 AND deleted_at IS NULL',
      [createUserDto.email]
    );
    if (existing.length > 0) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);
    const roleId = createUserDto.role_id;

    const sql = `
      INSERT INTO nexus.users (email, name, password_hash, role_id, team_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, is_active, created_at, updated_at, role_id
    `;
    const { rows } = await this.postgresService.query(sql, [
      createUserDto.email,
      createUserDto.name,
      passwordHash,
      roleId,
      createUserDto.team_id || null,
      createUserDto.is_active ?? true,
    ]);

    const newUser = rows[0];
    return await this.findOne(newUser.id);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    if (updateUserDto.name) {
      updates.push(`name = $${params.length + 1}`);
      params.push(updateUserDto.name);
    }
    if (updateUserDto.role_id) {
      updates.push(`role_id = $${params.length + 1}`);
      params.push(updateUserDto.role_id);
    }
    if (updateUserDto.team_id !== undefined) {
      updates.push(`team_id = $${params.length + 1}`);
      params.push(updateUserDto.team_id);
    }
    if (updateUserDto.is_active !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(updateUserDto.is_active);
    }
    if (updateUserDto.password) {
      const passwordHash = await bcrypt.hash(updateUserDto.password, 12);
      updates.push(`password_hash = $${params.length + 1}`);
      params.push(passwordHash);
    }

    params.push(id);
    const sql = `
      UPDATE nexus.users
      SET ${updates.join(', ')}
      WHERE id = $${params.length} AND deleted_at IS NULL
      RETURNING id, email, name, is_active, created_at, updated_at, role_id
    `;
    const { rows } = await this.postgresService.query(sql, params);
    if (rows.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return await this.findOne(rows[0].id);
  }

  async softDelete(id: string) {
    const sql = `
      UPDATE nexus.users
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return { message: 'Usuário removido com sucesso' };
  }

  async count() {
    const { rows } = await this.postgresService.query(
      'SELECT COUNT(*) as count FROM nexus.users WHERE deleted_at IS NULL'
    );
    return parseInt(rows[0].count, 10);
  }

  private mapUserWithRole(row: any) {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role: row.role_id ? { id: row.role_id, name: row.role_name } : null,
    };
  }
}
