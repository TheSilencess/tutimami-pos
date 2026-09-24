import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard } from '../common/auth.guard';
import { Permission, CurrentUser } from '../common/auth.decorators';

class PrintDto {
  @IsOptional()
  @IsString()
  printerName?: string;
}

@Controller('printing')
@UseGuards(AuthGuard)
export class PrintingController {
  constructor(private p: PrismaService) {}

  @Post('sales/:saleId')
  @Permission('receipts.print')
  async print(
    @Param('saleId') saleId: string,
    @Body() d: PrintDto,
    @CurrentUser() u: any,
  ) {
    const sale = await this.p.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        customer: true,
        payments: true,
        user: { select: { name: true } },
      },
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const payload = {
      saleId: sale.id,
      createdAt: sale.createdAt,
      printedBy: u.id,
      cashierName: sale.user.name,
      customer: {
        name: sale.customer.name,
        nit: sale.customer.nit || 'N/A',
        phone: sale.customer.phone || 'N/A',
        email: sale.customer.email || 'N/A',
        address: sale.customer.address || 'N/A',
      },
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      tax: Number(sale.tax),
      total: Number(sale.total),
      payments: sale.payments.map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount),
        reference: payment.reference || '',
      })),
      items: sale.items.map((item) => ({
        name: item.productName,
        qty: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.total),
      })),
    };

    return this.p.printJob.create({
      data: {
        saleId,
        printerName: d.printerName,
        status: 'QUEUED',
        payload,
      },
    });
  }

  @Post('jobs/:jobId/reprint')
  @Permission('receipts.reprint')
  async reprint(
    @Param('jobId') jobId: string,
    @Body() d: PrintDto,
    @CurrentUser() u: any,
  ) {
    const job = await this.p.printJob.findUnique({
      where: { id: jobId },
      include: {
        sale: {
          include: {
            items: true,
            customer: true,
            payments: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!job) throw new NotFoundException('Trabajo de impresión no encontrado');

    const sale = job.sale;
    const payload = {
      saleId: sale.id,
      createdAt: sale.createdAt,
      printedBy: u.id,
      cashierName: sale.user.name,
      customer: {
        name: sale.customer.name,
        nit: sale.customer.nit || 'N/A',
        phone: sale.customer.phone || 'N/A',
        email: sale.customer.email || 'N/A',
        address: sale.customer.address || 'N/A',
      },
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      tax: Number(sale.tax),
      total: Number(sale.total),
      payments: sale.payments.map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount),
        reference: payment.reference || '',
      })),
      items: sale.items.map((item) => ({
        name: item.productName,
        qty: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.total),
      })),
    };

    return this.p.printJob.create({
      data: {
        saleId: sale.id,
        printerName: d.printerName || job.printerName,
        status: 'QUEUED',
        payload,
      },
    });
  }

  @Get('jobs')
  @Permission('receipts.reprint')
  jobs() {
    return this.p.printJob.findMany({
      include: { sale: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
