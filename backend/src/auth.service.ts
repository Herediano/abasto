import { ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { sembrarRangosDeFabrica } from './rangos.util';
import type { AuthUser } from './auth.types';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'local-development-secret-change-me';

/** El rango de fábrica que manda: único que ve y toca la configuración de la empresa. */
const OWNER_RANGO = 'Dueño';

/** Zonas horarias que ofrece Ajustes (IANA). Argentina primero. */
const TIMEZONES = new Set([
  'America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza',
  'America/Argentina/Salta', 'America/Argentina/Tucuman', 'America/Argentina/Ushuaia',
  'America/Montevideo', 'America/Santiago', 'America/Asuncion', 'America/La_Paz', 'America/Sao_Paulo',
]);

function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) throw new UnprocessableEntityException({ code: 'WEAK_PASSWORD', message: 'La contraseña debe tener al menos 8 caracteres' });
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Sin vencimiento: en este rubro no hay turnos de 8 horas de sesión, hay
   * gente que se loguea una vez y se queda. La seguridad no depende de que
   * el token venza — depende de que cada pedido valide en vivo contra la
   * base (activo, rango, permisos), así que sacarle acceso a alguien pega al
   * toque sin esperar a que un token viejo caduque solo.
   */
  private token(user: { id: string; tenantId: string; email: string }) {
    return { accessToken: jwt.sign({ sub: user.id, tenantId: user.tenantId, email: user.email }, JWT_SECRET) };
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
        // Los 7 rangos de fábrica nacen con la empresa; quien la crea queda
        // como Dueño (todos los permisos), no un flag de admin aparte.
        const rangos = await sembrarRangosDeFabrica(tx, tenantCreated.id);
        // Toda empresa nace operable: una sucursal con su depósito y su caja, y
        // el Dueño asignado. Sin esto, abrir caja (y por lo tanto vender) es un
        // callejón sin salida hasta configurar varias pantallas a mano.
        const sucursal = await tx.branch.create({ data: { tenantId: tenantCreated.id, name: 'Casa Central', code: 'CC' } });
        const deposito = await tx.warehouse.create({ data: { tenantId: tenantCreated.id, branchId: sucursal.id, name: 'Depósito', code: 'CC-DEP' } });
        await tx.cashRegister.create({ data: { tenantId: tenantCreated.id, warehouseId: deposito.id, name: 'Caja 1' } });
        const userCreated = await tx.user.create({ data: { tenantId: tenantCreated.id, name, email, passwordHash, rangoId: rangos.get('Dueño')!, branchId: sucursal.id, warehouseId: deposito.id } });
        // Sin lista base no se puede cotizar, y sin cotizar no se puede vender:
        // toda empresa nace con una. Las demás listas (mayorista, por cliente)
        // se crean después desde Precios y pueden derivar de ésta.
        await tx.priceList.create({ data: { tenantId: tenantCreated.id, name: 'Mostrador', isDefault: true } });
        return { tenant: tenantCreated, user: userCreated, sucursal };
      });
      const permisos = await this.prisma.rangoPermission.findMany({ where: { rangoId: created.user.rangoId }, select: { key: true } });
      return {
        ...this.token(created.user),
        user: { id: created.user.id, name: created.user.name, email: created.user.email, rangoId: created.user.rangoId, rangoName: 'Dueño', permissions: permisos.map(p => p.key), warehouseId: created.user.warehouseId, branch: { id: created.sucursal.id, name: created.sucursal.name }, homeBranch: { id: created.sucursal.id, name: created.sucursal.name }, canNavigateBranches: permisos.some(p => p.key === 'sucursales.navegar'), preferences: {} },
        tenant: { id: created.tenant.id, name: created.tenant.name, logo: created.tenant.logo, timezone: created.tenant.timezone },
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El taxId o email ya está registrado');
      throw error;
    }
  }

  private static readonly SESSION_INCLUDE = {
    tenant: true,
    rango: { include: { permissions: { select: { key: true } } } },
    branch: { select: { id: true, name: true } },
    warehouse: { select: { branch: { select: { id: true, name: true } } } },
  } as const;

  /** La sucursal propia del usuario: la asignada, o —para datos viejos— la de su depósito. */
  private static home(user: { branch: { id: string; name: string } | null; warehouse: { branch: { id: string; name: string } } | null }) {
    return user.branch ?? user.warehouse?.branch ?? null;
  }

  async login(body: Record<string, unknown>) {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.password !== 'string') throw new UnauthorizedException('Credenciales inválidas');
    const user = await this.prisma.user.findUnique({ where: { email }, include: AuthService.SESSION_INCLUDE });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, body.password))) throw new UnauthorizedException('Credenciales inválidas');
    const canNav = user.rango.permissions.some(p => p.key === 'sucursales.navegar');
    return { ...this.token(user), ...this.shape(user, AuthService.home(user), canNav) };
  }

  /**
   * Mismo shape que login/signup, para refrescar la sesión sin volver a pedir
   * contraseña. Recibe el usuario ya resuelto por el guard, así sabe cuál es la
   * sucursal activa (la propia, o la que se está mirando).
   */
  async me(actor: { id: string; branchId?: string | null; canNavigateBranches?: boolean; warehouseId?: string | null }) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.id }, include: AuthService.SESSION_INCLUDE });
    const home = AuthService.home(user);
    const activa =
      actor.branchId && actor.branchId !== home?.id
        ? await this.prisma.branch.findUnique({ where: { id: actor.branchId }, select: { id: true, name: true } })
        : home;
    // El depósito operativo de la sucursal activa lo resolvió el guard.
    return this.shape({ ...user, warehouseId: actor.warehouseId ?? user.warehouseId }, activa ?? home, actor.canNavigateBranches ?? false);
  }

  /** El `{ user, tenant }` que consume el frontend, con las mismas claves en login, signup y me. */
  private shape(
    user: {
      id: string; name: string; email: string; rangoId: string; warehouseId: string | null; preferences: unknown;
      rango: { name: string; permissions: { key: string }[] };
      tenant: { id: string; name: string; logo: string | null; timezone: string };
      branch: { id: string; name: string } | null;
      warehouse: { branch: { id: string; name: string } } | null;
    },
    activeBranch: { id: string; name: string } | null,
    canNavigateBranches: boolean,
  ) {
    const home = AuthService.home(user);
    return {
      user: {
        id: user.id, name: user.name, email: user.email, rangoId: user.rangoId, rangoName: user.rango.name,
        permissions: user.rango.permissions.map(p => p.key), warehouseId: user.warehouseId,
        branch: activeBranch ?? home,
        homeBranch: home,
        canNavigateBranches,
        preferences: (user.preferences as Record<string, unknown> | null) ?? {},
      },
      tenant: { id: user.tenant.id, name: user.tenant.name, logo: user.tenant.logo, timezone: user.tenant.timezone },
    };
  }

  /** El propio usuario cambia su nombre, email, contraseña o preferencias. Para la contraseña pide la actual. */
  async updateMe(actor: AuthUser, body: Record<string, unknown>) {
    const userId = actor.id;
    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) throw new UnprocessableEntityException('El nombre no puede quedar vacío');
      data.name = name;
    }
    if (typeof body.email === 'string') {
      const email = normalizeEmail(body.email);
      if (!email) throw new UnprocessableEntityException('Email inválido');
      data.email = email;
    }
    if (body.newPassword !== undefined) {
      validatePassword(body.newPassword);
      const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (typeof body.currentPassword !== 'string' || !(await argon2.verify(current.passwordHash, body.currentPassword))) {
        throw new UnauthorizedException('La contraseña actual no coincide');
      }
      data.passwordHash = await argon2.hash(body.newPassword as string, { type: argon2.argon2id });
    }
    if (body.preferences !== undefined && body.preferences !== null && typeof body.preferences === 'object') {
      const prev = ((await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).preferences as Record<string, unknown> | null) ?? {};
      data.preferences = { ...prev, ...(body.preferences as Record<string, unknown>) };
    }
    try {
      await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ese email ya está en uso');
      throw error;
    }
    return this.me(actor);
  }

  /** Sólo el Dueño toca los datos de la empresa: nombre, logo y zona horaria. */
  async updateTenant(actor: { id: string; tenantId: string; rangoName: string }, body: Record<string, unknown>) {
    if (actor.rangoName !== OWNER_RANGO) throw new ForbiddenException('Sólo el Dueño puede cambiar los datos de la empresa');
    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) throw new UnprocessableEntityException('El nombre de la empresa no puede quedar vacío');
      data.name = name;
    }
    if (body.logo === null || body.logo === '') data.logo = null;
    else if (typeof body.logo === 'string') {
      if (!body.logo.startsWith('data:image/') || body.logo.length > 500_000) throw new UnprocessableEntityException('El logo tiene que ser una imagen y pesar menos de ~350 KB');
      data.logo = body.logo;
    }
    if (typeof body.timezone === 'string') {
      if (!TIMEZONES.has(body.timezone)) throw new UnprocessableEntityException('Zona horaria no reconocida');
      data.timezone = body.timezone;
    }
    await this.prisma.tenant.update({ where: { id: actor.tenantId }, data });
    return this.me(actor);
  }

  /**
   * Un usuario se asigna a una SUCURSAL. El depósito operativo se deriva: el
   * primero de esa sucursal. Devuelve el par listo para escribir en `user`.
   */
  async resolveBranchAssignment(tenantId: string, branchId: unknown) {
    if (typeof branchId !== 'string' || !branchId) return { branchId: null, warehouseId: null };
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isActive: true },
      select: { id: true, warehouses: { where: { isActive: true }, select: { id: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!branch) throw new UnprocessableEntityException('La sucursal no existe o está inactiva');
    return { branchId: branch.id, warehouseId: branch.warehouses[0]?.id ?? null };
  }

  async createUser(tenantId: string, body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    if (!name || !email) throw new UnprocessableEntityException('name y email son obligatorios');
    const rangoId = typeof body.rangoId === 'string' && body.rangoId ? body.rangoId : '';
    if (!rangoId) throw new UnprocessableEntityException('rangoId es obligatorio');
    if (!(await this.prisma.rango.findFirst({ where: { id: rangoId, tenantId } }))) throw new UnprocessableEntityException('Rango no encontrado');
    validatePassword(body.password);
    const passwordHash = await argon2.hash(body.password as string, { type: argon2.argon2id });
    try {
      const { branchId, warehouseId } = await this.resolveBranchAssignment(tenantId, body.branchId);
      const user = await this.prisma.user.create({ data: { tenantId, name, email, passwordHash, rangoId, branchId, warehouseId } });
      return { id: user.id, name: user.name, email: user.email, tenantId: user.tenantId, rangoId: user.rangoId, isActive: user.isActive };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El email ya está registrado');
      throw error;
    }
  }

  /**
   * Un cajero sin el permiso `caja.autorizar_anulacion` no puede anular un
   * ítem del carrito solo: necesita que alguien que sí lo tenga apruebe con
   * sus propias credenciales. No emite token — es sólo un sí/no para
   * desbloquear la acción en la pantalla que ya está abierta.
   */
  async authorizeSupervisor(tenantId: string, body: Record<string, unknown>) {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.password !== 'string') throw new UnauthorizedException('Credenciales de supervisor inválidas');
    const supervisor = await this.prisma.user.findUnique({ where: { email }, include: { rango: { include: { permissions: true } } } });
    if (!supervisor || !supervisor.isActive || supervisor.tenantId !== tenantId || !(await argon2.verify(supervisor.passwordHash, body.password))) {
      throw new UnauthorizedException('Credenciales de supervisor inválidas');
    }
    const autoriza = supervisor.rango.permissions.some(p => p.key === 'caja.autorizar_anulacion');
    if (!autoriza) throw new UnauthorizedException('Ese usuario no tiene permiso para autorizar esto');
    return { authorized: true, supervisorName: supervisor.name };
  }

  async authenticate(token: string, requestedBranchId?: string) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
      if (!payload.sub) throw new Error('Invalid token');
      const branchSel = {
        select: { id: true, warehouses: { where: { isActive: true }, select: { id: true }, orderBy: { createdAt: 'asc' } } },
      } as const;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          rango: { include: { permissions: { select: { key: true } } } },
          branch: branchSel,
          warehouse: { select: { branch: branchSel } },
        },
      });
      if (!user || !user.isActive) throw new Error('Inactive user');
      const permissions = new Set(user.rango.permissions.map(p => p.key));
      const canNavigateBranches = permissions.has('sucursales.navegar');
      // Sucursal propia: la asignada, o —datos viejos— la del depósito.
      const homeBranch = user.branch ?? user.warehouse?.branch ?? null;
      const homeBranchId = homeBranch?.id ?? null;

      // Sucursal activa: la propia salvo que se pida otra y el rango lo permita.
      let branchId = homeBranchId;
      let branchWarehouseIds = homeBranch?.warehouses.map(w => w.id) ?? [];
      if (requestedBranchId && requestedBranchId !== homeBranchId && canNavigateBranches) {
        const otra = await this.prisma.branch.findFirst({
          where: { id: requestedBranchId, tenantId: user.tenantId, isActive: true },
          select: { id: true, warehouses: { where: { isActive: true }, select: { id: true }, orderBy: { createdAt: 'asc' } } },
        });
        if (otra) {
          branchId = otra.id;
          branchWarehouseIds = otra.warehouses.map(w => w.id);
        }
      }

      return {
        id: user.id, tenantId: user.tenantId, name: user.name, email: user.email,
        rangoId: user.rangoId, rangoName: user.rango.name,
        permissions,
        // El depósito operativo es el primero de la sucursal activa (o el propio, de fallback).
        warehouseId: branchWarehouseIds[0] ?? user.warehouseId,
        branchId,
        homeBranchId,
        branchWarehouseIds,
        canNavigateBranches,
      };
    } catch { throw new UnauthorizedException('Token inválido o vencido'); }
  }
}
