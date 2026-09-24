import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private access(user: any) {
    return this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      } as any,
    );
  }

  private mapUser(user: any) {
    const permissions = [
      ...new Set(
        user.roles.flatMap((userRole: any) =>
          userRole.role.permissions.map(
            (rolePermission: any) => rolePermission.permission.key,
          ),
        ),
      ),
    ] as string[];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      roles: user.roles.map((userRole: any) => ({
        role: {
          id: userRole.role.id,
          name: userRole.role.name,
        },
      })),
      permissions,
    };
  }

  private userInclude() {
    return {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    } as const;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: this.userInclude(),
    });

    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'Auth',
        entityId: user.id,
      },
    });

    const refreshToken = randomBytes(48).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    return {
      accessToken: this.access(user),
      refreshToken,
      user: this.mapUser(user),
    };
  }

  async refresh(token: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash: this.hash(token),
      },
      include: {
        user: true,
      },
    });

    if (
      !row ||
      row.revokedAt ||
      row.expiresAt < new Date() ||
      !row.user.active
    ) {
      throw new UnauthorizedException(
        'Refresh token inválido',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const next = randomBytes(48).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: row.userId,
        tokenHash: this.hash(next),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    return {
      accessToken: this.access(row.user),
      refreshToken: next,
    };
  }

  async logout(token?: string) {
    if (!token) return;

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hash(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude(),
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.mapUser(user);
  }
}
