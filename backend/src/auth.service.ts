import { ConflictException, Inject, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'local-development-secret-change-me';
const EXPIRES_IN_SECONDS = 8 * 60 * 60;

function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) throw new UnprocessableEntityException({ code: 'WEAK_PASSWORD', message: 'La contraseña debe tener al menos 8 caracteres' });
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private token(user: { id: string; tenantId: string; email: string; role: 'admin' | 'user' }) {
    return { accessToken: jwt.sign({ sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: EXPIRES_IN_SECONDS }), expiresIn: EXPIRES_IN_SECONDS };
  }

  async signup(body: Record<string, unknown>) {
    const tenant = body.tenant as Record<string, unknown> | undefined;
    const user = body.user as Record<string, unknown> | undefined;
    const tenantName = typeof tenant?.name === 'string' ? tenant.name.trim() : '';
    const taxId = typeof tenant?.taxId === 'string' ? tenant.taxId.trim() : '';
    const name = typeof user?.name === 'string' ? user.name.trim() : '';
    const email = normalizeEmail(user?.email);
    if (!tenantName || !taxId || !name || !email) throw new UnprocessableEntityException('tenant.name, tenant.taxId, user.name y user.email son obligatorios');
    const password = user?.password;
    validatePassword(password);
    const passwordHash = await argon2.hash(password as string, { type: argon2.argon2id });
    try {
      const created = await this.prisma.$transaction(async tx => {
        const tenantCreated = await tx.tenant.create({ data: { name: tenantName, legalName: typeof tenant?.legalName === 'string' ? tenant.legalName.trim() : undefined, taxId } });
        const userCreated = await tx.user.create({ data: { tenantId: tenantCreated.id, name, email, passwordHash, role: 'admin' } });
        // Sin lista base no se puede cotizar, y sin cotizar no se puede vender:
        // toda empresa nace con una. Las demás listas (mayorista, por cliente)
        // se crean después desde Precios y pueden derivar de ésta.
        await tx.priceList.create({ data: { tenantId: tenantCreated.id, name: 'Mostrador', isDefault: true } });
        return { tenant: tenantCreated, user: userCreated };
      });
      return { ...this.token(created.user), user: { id: created.user.id, name: created.user.name, email: created.user.email, role: created.user.role }, tenant: { id: created.tenant.id, name: created.tenant.name } };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El taxId o email ya está registrado');
      throw error;
    }
  }

  async login(body: Record<string, unknown>) {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.password !== 'string') throw new UnauthorizedException('Credenciales inválidas');
    const user = await this.prisma.user.findUnique({ where: { email }, include: { tenant: true, warehouse: true } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, body.password))) throw new UnauthorizedException('Credenciales inválidas');
    return { ...this.token(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, warehouseId: user.warehouseId }, tenant: { id: user.tenant.id, name: user.tenant.name } };
  }

  async createUser(tenantId: string, body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    if (!name || !email) throw new UnprocessableEntityException('name y email son obligatorios');
    validatePassword(body.password);
    const passwordHash = await argon2.hash(body.password as string, { type: argon2.argon2id });
    try {
      const warehouseId = typeof body.warehouseId === 'string' ? body.warehouseId : undefined;
      if (warehouseId && !(await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } }))) throw new UnprocessableEntityException('warehouseId no pertenece al tenant');
      const user = await this.prisma.user.create({ data: { tenantId, name, email, passwordHash, warehouseId } });
      return { id: user.id, name: user.name, email: user.email, tenantId: user.tenantId, role: user.role, isActive: user.isActive };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El email ya está registrado');
      throw error;
    }
  }

  /**
   * Un cajero normal no puede anular un ítem del carrito solo: necesita que un
   * supervisor (rol admin, hasta que exista un sistema de rangos) apruebe con
   * sus propias credenciales. No emite token — es sólo un sí/no para
   * desbloquear la acción en la pantalla que ya está abierta.
   */
  async authorizeSupervisor(tenantId: string, body: Record<string, unknown>) {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.password !== 'string') throw new UnauthorizedException('Credenciales de supervisor inválidas');
    const supervisor = await this.prisma.user.findUnique({ where: { email } });
    if (!supervisor || !supervisor.isActive || supervisor.tenantId !== tenantId || supervisor.role !== 'admin' || !(await argon2.verify(supervisor.passwordHash, body.password))) {
      throw new UnauthorizedException('Credenciales de supervisor inválidas');
    }
    return { authorized: true, supervisorName: supervisor.name };
  }

  async authenticate(token: string) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
      if (!payload.sub) throw new Error('Invalid token');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new Error('Inactive user');
      return { id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, role: user.role, warehouseId: user.warehouseId };
    } catch { throw new UnauthorizedException('Token inválido o vencido'); }
  }
}
