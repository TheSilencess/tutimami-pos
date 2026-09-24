import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';import {IsEmail,IsEnum,IsNotEmpty,IsOptional,IsString,ValidateIf}from'class-validator';import {PrismaService}from'../common/prisma.service';import {AuthGuard}from'../common/auth.guard';import {Permission}from'../common/auth.decorators';import {CustomerType}from'@prisma/client';class CustomerDto {
  @IsEnum(CustomerType) customerType!: CustomerType;
  @IsString() @IsNotEmpty() name!: string;
  @ValidateIf((o: CustomerDto) => o.customerType === CustomerType.NIT)
  @IsString() @IsNotEmpty() nit?: string;
  @IsOptional() @IsString() phone?: string;
  @ValidateIf((o: CustomerDto) => !!o.email && o.email !== 'N/A')
  @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
}

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private p: PrismaService) {}

  @Get() @Permission('customers.view')
  list(@Query('q') q?: string) {
    return this.p.customer.findMany({
      where: { active: true, ...(q ? { OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { nit: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ] } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id') @Permission('customers.view')
  one(@Param('id') id: string) {
    return this.p.customer.findUnique({ where: { id }, include: { sales: { orderBy: { createdAt: 'desc' }, take: 20 } } });
  }

  @Post() @Permission('customers.create')
  async create(@Body() d: CustomerDto) {
    const name = d.name.trim();
    if (!name) throw new BadRequestException('El nombre es obligatorio.');
    const nit = d.customerType === CustomerType.NIT ? d.nit!.trim() : 'N/A';
    if (d.customerType === CustomerType.NIT && !nit) throw new BadRequestException('El NIT es obligatorio.');

    if (d.customerType === CustomerType.NIT) {
      const existing = await this.p.customer.findFirst({ where: { nit, active: true } });
      if (existing) throw new BadRequestException('Ya existe un cliente activo con ese NIT.');
    }

    return this.p.customer.create({
      data: {
        customerType: d.customerType, name, nit,
        phone: d.phone?.trim() || 'N/A',
        email: d.email?.trim() || 'N/A',
        address: d.address?.trim() || 'N/A',
      },
    });
  }

  @Patch(':id') @Permission('customers.edit')
  async edit(@Param('id') id: string, @Body() d: Partial<CustomerDto>) {
    const data: any = {};
    if (d.name !== undefined) data.name = d.name.trim();
    if (d.customerType !== undefined) data.customerType = d.customerType;
    if (d.nit !== undefined) data.nit = d.nit.trim() || 'N/A';
    if (d.phone !== undefined) data.phone = d.phone.trim() || 'N/A';
    if (d.email !== undefined) data.email = d.email.trim() || 'N/A';
    if (d.address !== undefined) data.address = d.address.trim() || 'N/A';
    return this.p.customer.update({ where: { id }, data });
  }

  @Delete(':id') @Permission('customers.delete')
  remove(@Param('id') id: string) {
    return this.p.customer.update({ where: { id }, data: { active: false } });
  }
}
