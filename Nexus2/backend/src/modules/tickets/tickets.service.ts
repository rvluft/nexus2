// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import { CreateTicketDto, UpdateTicketDto, AddEventDto, SlaStatsQueryDto } from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private pg: PostgresService) {}

  // ── CRUD ──────────────────────────────────────────────────────

  async findAll(query: any) {
    const conditions: string[] = [];
    const params: any[] = [];

    const add = (expr: string, val: any) => { conditions.push(expr.replace('?', `$${params.length + 1}`)); params.push(val); };

    if (query.status)              add('t.status = ?', query.status);
    if (query.domain_id)           add('t.domain_id = ?::uuid', query.domain_id);
    if (query.specialist_whatsapp) add('t.specialist_whatsapp = ?', query.specialist_whatsapp);
    if (query.priority)            add('t.priority = ?', query.priority);
    if (query.date_from)           add('t.opened_at >= ?', query.date_from);
    if (query.date_to)             add('t.opened_at <= ?', query.date_to);
    if (query.search)              add("(t.ticket_number ILIKE ? OR t.requester_name ILIKE ? OR t.subject ILIKE ?)",
                                       ...Array(3).fill(`%${query.search}%`));

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(parseInt(query.limit) || 50, 200);
    const page  = parseInt(query.page) || 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT t.id, t.ticket_number, t.status, t.priority,
             t.requester_number, t.requester_name, t.subject, t.message_preview,
             t.specialist_name, t.specialist_whatsapp,
             t.opened_at, t.first_response_at, t.resolved_at, t.closed_at,
             t.first_response_minutes, t.resolution_minutes,
             t.first_response_breached, t.resolution_breached,
             t.source, t.created_at,
             d.name as domain_name, d.color as domain_color
      FROM nexus.support_tickets t
      LEFT JOIN nexus.domains d ON t.domain_id = d.id
      ${where}
      ORDER BY t.opened_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    const { rows } = await this.pg.query(sql, params);

    const countSql = `SELECT COUNT(*) as total FROM nexus.support_tickets t ${where}`;
    const { rows: cr } = await this.pg.query(countSql, params.slice(0, -2));
    return { data: rows, total: parseInt(cr[0].total, 10), page, limit };
  }

  async findOne(id: string) {
    const { rows } = await this.pg.query(`
      SELECT t.*, d.name as domain_name, d.color as domain_color
      FROM nexus.support_tickets t
      LEFT JOIN nexus.domains d ON t.domain_id = d.id
      WHERE t.id = $1
    `, [id]);
    if (!rows.length) throw new NotFoundException('Ticket não encontrado');
    const ticket = rows[0];
    const { rows: events } = await this.pg.query(
      `SELECT * FROM nexus.ticket_events WHERE ticket_id = $1 ORDER BY created_at ASC`, [id],
    );
    return { ...ticket, events };
  }

  async create(dto: CreateTicketDto, userId?: string) {
    const sql = `
      INSERT INTO nexus.support_tickets
        (requester_number, requester_name, domain_id, specialist_name, specialist_whatsapp,
         subject, message_preview, priority, source, created_by, opened_at, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW(), NOW())
      RETURNING *
    `;
    const { rows } = await this.pg.query(sql, [
      dto.requester_number,
      dto.requester_name || null,
      dto.domain_id || null,
      dto.specialist_name || null,
      dto.specialist_whatsapp || null,
      dto.subject || null,
      dto.message_preview || null,
      dto.priority || 'normal',
      dto.source || 'whatsapp',
      userId || null,
    ]);
    const ticket = rows[0];
    // Auto-check SLA breach thresholds
    await this.checkSlaBreachFlags(ticket.id, ticket.domain_id, ticket.priority);
    await this.addEvent(ticket.id, { event_type: 'opened', actor: 'system', actor_type: 'system' });
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.findOne(id);
    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    const set = (col: string, val: any) => { updates.push(`${col} = $${params.length + 1}`); params.push(val); };

    if (dto.status !== undefined) {
      set('status', dto.status);
      if (dto.status === 'resolved' && !ticket.resolved_at)   set('resolved_at', new Date().toISOString());
      if (dto.status === 'closed'   && !ticket.closed_at)     set('closed_at', new Date().toISOString());
    }
    if (dto.priority            !== undefined) set('priority', dto.priority);
    if (dto.specialist_name     !== undefined) set('specialist_name', dto.specialist_name || null);
    if (dto.specialist_whatsapp !== undefined) set('specialist_whatsapp', dto.specialist_whatsapp || null);
    if (dto.subject             !== undefined) set('subject', dto.subject || null);
    if (dto.first_response_at   !== undefined) set('first_response_at', dto.first_response_at);
    if (dto.resolved_at         !== undefined) set('resolved_at', dto.resolved_at);

    params.push(id);
    const { rows } = await this.pg.query(
      `UPDATE nexus.support_tickets SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    await this.checkSlaBreachFlags(id, rows[0].domain_id, rows[0].priority);
    return rows[0];
  }

  async addEvent(ticketId: string, dto: Partial<AddEventDto>) {
    const { rows } = await this.pg.query(`
      INSERT INTO nexus.ticket_events (ticket_id, event_type, actor, actor_type, note)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [ticketId, dto.event_type, dto.actor || null, dto.actor_type || 'system', dto.note || null]);

    // Se evento é first_response e ticket ainda não tem first_response_at, registrar
    if (dto.event_type === 'first_response' || dto.event_type === 'message_sent') {
      await this.pg.query(`
        UPDATE nexus.support_tickets
        SET first_response_at = COALESCE(first_response_at, NOW()), updated_at = NOW()
        WHERE id = $1
      `, [ticketId]);
    }
    return rows[0];
  }

  // ── SLA Config ───────────────────────────────────────────────

  async getSlaConfig() {
    const { rows } = await this.pg.query(`
      SELECT s.*, d.name as domain_name
      FROM nexus.sla_config s
      LEFT JOIN nexus.domains d ON s.domain_id = d.id
      WHERE s.is_active = true
      ORDER BY s.domain_id NULLS FIRST, s.priority
    `);
    return rows;
  }

  async upsertSlaConfig(domainId: string | null, priority: string, firstResponseMinutes: number, resolutionMinutes: number) {
    const { rows } = await this.pg.query(`
      INSERT INTO nexus.sla_config (domain_id, priority, first_response_minutes, resolution_minutes, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (domain_id, priority)
      DO UPDATE SET first_response_minutes = $3, resolution_minutes = $4, updated_at = NOW()
      RETURNING *
    `, [domainId, priority, firstResponseMinutes, resolutionMinutes]);
    return rows[0];
  }

  private async checkSlaBreachFlags(ticketId: string, domainId: string | null, priority: string) {
    // Busca SLA aplicável (domínio > global)
    const { rows: slaRows } = await this.pg.query(`
      SELECT first_response_minutes, resolution_minutes FROM nexus.sla_config
      WHERE (domain_id = $1 OR domain_id IS NULL) AND priority = $2 AND is_active = true
      ORDER BY domain_id NULLS LAST LIMIT 1
    `, [domainId, priority]);
    if (!slaRows.length) return;
    const sla = slaRows[0];

    await this.pg.query(`
      UPDATE nexus.support_tickets SET
        first_response_breached = CASE
          WHEN first_response_at IS NULL AND EXTRACT(EPOCH FROM (NOW() - opened_at))/60 > $1 THEN true
          WHEN first_response_at IS NOT NULL AND first_response_minutes > $1 THEN true
          ELSE false END,
        resolution_breached = CASE
          WHEN resolved_at IS NULL AND status NOT IN ('resolved','closed') AND EXTRACT(EPOCH FROM (NOW() - opened_at))/60 > $2 THEN true
          WHEN resolved_at IS NOT NULL AND resolution_minutes > $2 THEN true
          ELSE false END
      WHERE id = $3
    `, [sla.first_response_minutes, sla.resolution_minutes, ticketId]);
  }

  // ── Webhook n8n ──────────────────────────────────────────────

  async webhookCreateOrUpdate(body: any) {
    // Se ticket_number fornecido, atualiza existente
    if (body.ticket_number) {
      const { rows } = await this.pg.query(
        `SELECT id FROM nexus.support_tickets WHERE ticket_number = $1`, [body.ticket_number],
      );
      if (rows.length) {
        const event = body.event_type || 'message_received';
        await this.addEvent(rows[0].id, {
          event_type: event,
          actor: body.actor || body.specialist_whatsapp,
          actor_type: body.actor_type || 'specialist',
          note: body.note,
        });
        if (body.status) await this.update(rows[0].id, { status: body.status });
        if (event === 'first_response' || event === 'message_sent') {
          await this.update(rows[0].id, { first_response_at: new Date().toISOString() });
        }
        return { action: 'updated', ticket_id: rows[0].id };
      }
    }
    // Senão cria novo
    const ticket = await this.create(body);
    return { action: 'created', ticket_id: ticket.id, ticket_number: ticket.ticket_number };
  }

  // ── Relatórios SLA ───────────────────────────────────────────

  private periodClause(query: SlaStatsQueryDto): { where: string; params: any[] } {
    const params: any[] = [];
    const conditions: string[] = [];

    const dateFrom = query.date_from || this.periodStart(query.period || 'month');
    const dateTo   = query.date_to   || new Date().toISOString();

    conditions.push(`t.opened_at >= $${params.length + 1}`); params.push(dateFrom);
    conditions.push(`t.opened_at <= $${params.length + 1}`); params.push(dateTo);

    if (query.domain_id)           { conditions.push(`t.domain_id = $${params.length + 1}::uuid`);   params.push(query.domain_id); }
    if (query.specialist_whatsapp) { conditions.push(`t.specialist_whatsapp = $${params.length + 1}`); params.push(query.specialist_whatsapp); }

    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
  }

  private periodStart(period: string): string {
    const now = new Date();
    switch (period) {
      case 'today':    return new Date(now.setHours(0,0,0,0)).toISOString();
      case 'week':     now.setDate(now.getDate() - 7);   return now.toISOString();
      case 'month':    now.setMonth(now.getMonth() - 1); return now.toISOString();
      case '3months':  now.setMonth(now.getMonth() - 3); return now.toISOString();
      case '6months':  now.setMonth(now.getMonth() - 6); return now.toISOString();
      case 'year':     now.setFullYear(now.getFullYear() - 1); return now.toISOString();
      default:         now.setMonth(now.getMonth() - 1); return now.toISOString();
    }
  }

  async getOverviewStats(query: SlaStatsQueryDto) {
    const { where, params } = this.periodClause(query);
    const base = `FROM nexus.support_tickets t LEFT JOIN nexus.domains d ON t.domain_id = d.id ${where}`;

    const [overview, byStatus, byPriority] = await Promise.all([
      this.pg.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE t.status IN ('resolved','closed')) as resolved,
          COUNT(*) FILTER (WHERE t.first_response_breached = true) as fr_breached,
          COUNT(*) FILTER (WHERE t.resolution_breached = true) as res_breached,
          ROUND(AVG(t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as avg_first_response_min,
          ROUND(AVG(t.resolution_minutes) FILTER (WHERE t.resolution_minutes IS NOT NULL)) as avg_resolution_min,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as median_first_response_min,
          ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as p90_first_response_min
        ${base}
      `, params),
      this.pg.query(`SELECT t.status, COUNT(*) as count ${base} GROUP BY t.status ORDER BY count DESC`, params),
      this.pg.query(`SELECT t.priority, COUNT(*) as count ${base} GROUP BY t.priority ORDER BY count DESC`, params),
    ]);

    return {
      overview: overview.rows[0],
      by_status: byStatus.rows,
      by_priority: byPriority.rows,
    };
  }

  async getBySpecialist(query: SlaStatsQueryDto) {
    const { where, params } = this.periodClause(query);
    const { rows } = await this.pg.query(`
      SELECT
        COALESCE(t.specialist_name, 'Não atribuído') as specialist_name,
        t.specialist_whatsapp,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.status IN ('resolved','closed')) as resolved,
        COUNT(*) FILTER (WHERE t.first_response_breached = true) as fr_breached,
        COUNT(*) FILTER (WHERE t.resolution_breached = true) as res_breached,
        ROUND(AVG(t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as avg_first_response_min,
        ROUND(AVG(t.resolution_minutes) FILTER (WHERE t.resolution_minutes IS NOT NULL)) as avg_resolution_min
      FROM nexus.support_tickets t
      LEFT JOIN nexus.domains d ON t.domain_id = d.id
      ${where}
      GROUP BY t.specialist_name, t.specialist_whatsapp
      ORDER BY total DESC
    `, params);
    return rows;
  }

  async getByDomain(query: SlaStatsQueryDto) {
    const { where, params } = this.periodClause(query);
    const { rows } = await this.pg.query(`
      SELECT
        COALESCE(d.name, 'Sem domínio') as domain_name,
        d.color as domain_color,
        t.domain_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.status IN ('resolved','closed')) as resolved,
        COUNT(*) FILTER (WHERE t.first_response_breached = true) as fr_breached,
        COUNT(*) FILTER (WHERE t.resolution_breached = true) as res_breached,
        ROUND(AVG(t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as avg_first_response_min,
        ROUND(AVG(t.resolution_minutes) FILTER (WHERE t.resolution_minutes IS NOT NULL)) as avg_resolution_min
      FROM nexus.support_tickets t
      LEFT JOIN nexus.domains d ON t.domain_id = d.id
      ${where}
      GROUP BY t.domain_id, d.name, d.color
      ORDER BY total DESC
    `, params);
    return rows;
  }

  async getCross(query: SlaStatsQueryDto) {
    // Cruzamento especialista × domínio
    const { where, params } = this.periodClause(query);
    const { rows } = await this.pg.query(`
      SELECT
        COALESCE(t.specialist_name, 'Não atribuído') as specialist_name,
        t.specialist_whatsapp,
        COALESCE(d.name, 'Sem domínio') as domain_name,
        d.color as domain_color,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.status IN ('resolved','closed')) as resolved,
        COUNT(*) FILTER (WHERE t.first_response_breached = true) as fr_breached,
        ROUND(AVG(t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as avg_first_response_min
      FROM nexus.support_tickets t
      LEFT JOIN nexus.domains d ON t.domain_id = d.id
      ${where}
      GROUP BY t.specialist_name, t.specialist_whatsapp, t.domain_id, d.name, d.color
      ORDER BY total DESC
    `, params);
    return rows;
  }

  async getTimeSeries(query: SlaStatsQueryDto) {
    const { where, params } = this.periodClause(query);
    const trunc = query.group_by === 'week' ? 'week' : query.group_by === 'month' ? 'month' : 'day';
    const { rows } = await this.pg.query(`
      SELECT
        DATE_TRUNC('${trunc}', t.opened_at) as period,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.status IN ('resolved','closed')) as resolved,
        COUNT(*) FILTER (WHERE t.first_response_breached = true) as fr_breached,
        ROUND(AVG(t.first_response_minutes) FILTER (WHERE t.first_response_minutes IS NOT NULL)) as avg_first_response_min
      FROM nexus.support_tickets t
      LEFT JOIN nexus.domains d ON t.domain_id = d.id
      ${where}
      GROUP BY 1
      ORDER BY 1 ASC
    `, params);
    return rows;
  }

  async getSpecialistList() {
    const { rows } = await this.pg.query(`
      SELECT DISTINCT specialist_name, specialist_whatsapp
      FROM nexus.support_tickets
      WHERE specialist_whatsapp IS NOT NULL
      ORDER BY specialist_name
    `);
    return rows;
  }
}
