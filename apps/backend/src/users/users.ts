import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard } from '../common/auth.guard';
import { Permission, CurrentUser } from '../common/auth.decorators';
import { AuditService } from '../common/audit.service';

class UserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString({ each: true })
  roleIds?: string[];
}

class UpdateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString({ each: true })
  roleIds?: string[];
}

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private p: PrismaService,
    private audit: AuditService,
  ) {}

  @Get()
  @Permission('users.view')
  list() {
    return this.p.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('roles')
  @Permission('users.view')
  roles() {
    return this.p.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @Permission('users.create')
  async create(
    @Body() d: UserDto,
    @CurrentUser() u: any,
  ) {
    if (!d.password) {
      throw new BadRequestException('La contraseña es obligatoria.');
    }

    if (!d.roleIds?.length) {
      throw new BadRequestException('Debes seleccionar un rol.');
    }

    const existing = await this.p.user.findUnique({
      where: { email: d.email },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese correo.');
    }

    const hash = await bcrypt.hash(d.password, 12);

    const user = await this.p.user.create({
      data: {
        name: d.name,
        email: d.email,
        passwordHash: hash,
        active: d.active ?? true,
        roles: {
          create: d.roleIds.map((roleId) => ({ roleId })),
        },
      },
    });

    await this.audit.log({
      userId: u.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      newValues: {
        name: user.name,
        email: user.email,
      },
    });

    return user;
  }

  @Patch(':id')
  @Permission('users.edit')
  async edit(
    @Param('id') id: string,
    @Body() d: UpdateUserDto,
    @CurrentUser() u: any,
  ) {
    const data: any = {
      name: d.name,
      email: d.email,
      active: d.active,
    };

    if (d.password) {
      data.passwordHash = await bcrypt.hash(d.password, 12);
    }

    if (d.roleIds) {
      if (!d.roleIds.length) {
        throw new BadRequestException('Debes seleccionar un rol.');
      }

      await this.p.userRole.deleteMany({
        where: { userId: id },
      });

      data.roles = {
        create: d.roleIds.map((roleId) => ({ roleId })),
      };
    }

    const user = await this.p.user.update({
      where: { id },
      data,
    });

    await this.audit.log({
      userId: u.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
    });

    return user;
  }
}
