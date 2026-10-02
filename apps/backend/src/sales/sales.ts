import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, InventoryMovementType, SaleStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard } from '../common/auth.guard';
import { Permission, CurrentUser } from '../common/auth.decorators';
import { AuditService } from '../common/audit.service';

class ItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsNumber() @Min(0) discount!: number;
}

class PayDto {
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() reference?: string;
}

class SaleDto {
  @IsString() customerId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items!: ItemDto[];
  @IsNumber() @Min(0) discount!: number;
  // payment se conserva para compatibilidad con clientes anteriores.
  @IsOptional() @ValidateNested() @Type(() => PayDto) payment?: PayDto;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PayDto) payments?: PayDto[];
}

@Controller('sales')
@UseGuards(AuthGuard)
export class SalesController {
  constructor(private p: PrismaService, private audit: AuditService) {}

  @Get()
  @Permission('sales.view')
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.p.sale.findMany({
      where: { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}) } },
      include: { customer: true, user: { select: { name: true } }, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get(':id')
  @Permission('sales.view')
  one(@Param('id') id: string) {
    return this.p.sale.findUnique({ where: { id }, include: { customer: true, user: { select: { name: true } }, items: { include: { product: true } }, payments: true } });
  }

  @Post()
  @Permission('sales.create')
  async create(@Body() d: SaleDto, @CurrentUser() u: any) {
    if (!d.items.length) throw new BadRequestException('La venta debe tener productos');
    if (new Set(d.items.map((i) => i.productId)).size !== d.items.length) throw new BadRequestException('No repitas un producto en la venta');

    const payments = (d.payments?.length ? d.payments : d.payment ? [d.payment] : []).filter((payment) => Number(payment.amount) > 0);
    if (!payments.length) throw new BadRequestException('Agrega al menos un método de pago');

    return this.p.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${u.id} FOR UPDATE`;
      const session = await tx.cashSession.findFirst({where:{userId:u.id,closedAt:null}});
      if (!session) throw new BadRequestException('Debes aperturar caja antes de vender');
      const customer = await tx.customer.findUnique({ where: { id: d.customerId } });
      if (!customer) throw new BadRequestException('Cliente no encontrado');

      let subtotal = 0;
      const lines: any[] = [];
      for (const i of d.items) {
        const p = await tx.product.findUnique({ where: { id: i.productId } });
        if (!p || !p.active) throw new BadRequestException('Producto inválido');
        if (p.stock < i.quantity) throw new BadRequestException(`Stock insuficiente: ${p.name}`);
        const base = Number(p.salePrice) * i.quantity;
        const discount = Math.min(i.discount, base);
        const net = base - discount;
        const tax = 0;
        const total = Number(net.toFixed(2));
        subtotal += base;
        lines.push({ p, i, discount, tax, total });
      }

      const discount = Number(d.discount || 0) + lines.reduce((sum, x) => sum + x.discount, 0);
      const taxable = Math.max(0, subtotal - discount);
      const tax = 0;
      const total = Number(taxable.toFixed(2));
      if (Number(d.discount || 0) > subtotal - lines.reduce((sum, x) => sum + x.discount, 0)) throw new BadRequestException('El descuento supera el subtotal');

      const paid = Number(payments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2));
      if (paid < total) throw new BadRequestException(`El pago es menor al total. Faltan Q ${(total - paid).toFixed(2)}`);
      const nonCash = Number(payments.filter((payment) => payment.method !== PaymentMethod.CASH).reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2));
      if (nonCash > total) throw new BadRequestException('Los pagos con tarjeta/transferencia no pueden superar el total de la venta');
      if (paid > total && !payments.some((payment) => payment.method === PaymentMethod.CASH)) throw new BadRequestException('Solo un pago en efectivo puede generar cambio');

      const sale = await tx.sale.create({
        data: {
          cashSessionId: session.id,
          customerId: d.customerId,
          userId: u.id,
          subtotal,
          discount,
          tax,
          total,
          status: SaleStatus.PAID,
          items: { create: lines.map((x) => ({ productId: x.p.id, productName: x.p.name, quantity: x.i.quantity, unitPrice: Number(x.p.salePrice), discount: x.discount, tax: x.tax, total: x.total })) },
          payments: { create: payments.map((payment) => ({ method: payment.method, amount: Number(payment.amount), reference: payment.reference })) },
        },
      });

      for (const x of lines) {
        const prev = x.p.stock;
        const next = prev - x.i.quantity;
        const updated = await tx.product.updateMany({ where: { id: x.p.id, stock: { gte: x.i.quantity } }, data: { stock: { decrement: x.i.quantity } } });
        if (updated.count !== 1) throw new BadRequestException(`Stock insuficiente: ${x.p.name}`);
        await tx.inventoryMovement.create({ data: { productId: x.p.id, userId: u.id, type: InventoryMovementType.SALE, quantity: -x.i.quantity, previousStock: prev, newStock: next, reason: `Venta ${sale.id}` } });
      }
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: 'CREATE',
          entity: 'Sale',
          entityId: sale.id,
          saleId: sale.id,
          newValues: {
            total,
            payments: payments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
              reference: payment.reference ?? null,
            })),
          },
        },
      });
      return sale;
    });
  }

  @Post(':id/cancel')
  @Permission('sales.cancel')
  async cancel(@Param('id') id: string, @CurrentUser() u: any) {
    return this.p.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true, cashSession: true } });
      if (sale?.cashSessionId) {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${sale.userId} FOR UPDATE`;
        const session = await tx.cashSession.findUnique({where:{id:sale.cashSessionId}});
        if(session?.closedAt) throw new BadRequestException('No se puede cancelar una venta de una caja cerrada');
      }
      if (!sale || sale.status === SaleStatus.CANCELLED) throw new BadRequestException('Venta no válida');
      for (const i of sale.items) {
        const p = await tx.product.findUnique({ where: { id: i.productId } });
        if (!p) throw new BadRequestException(`Producto no encontrado: ${i.productId}`);
        const next = p.stock + i.quantity;
        await tx.product.update({ where: { id: p.id }, data: { stock: next } });
        await tx.inventoryMovement.create({ data: { productId: p.id, userId: u.id, type: InventoryMovementType.RETURN, quantity: i.quantity, previousStock: p.stock, newStock: next, reason: `Cancelación ${sale.id}` } });
      }
      const out = await tx.sale.updateMany({ where: { id, status: { not: SaleStatus.CANCELLED } }, data: { status: SaleStatus.CANCELLED } });
      if (out.count !== 1) throw new BadRequestException('La venta ya fue cancelada');
      await tx.auditLog.create({ data: { userId: u.id, action: 'CANCEL', entity: 'Sale', entityId: id, saleId: id } });
      return out;
    });
  }
}
