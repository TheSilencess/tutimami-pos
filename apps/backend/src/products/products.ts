import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';import {IsInt,IsNumber,IsOptional,IsString,Min} from 'class-validator';import {PrismaService} from '../common/prisma.service';import {AuthGuard} from '../common/auth.guard';import {Permission} from '../common/auth.decorators';
class ProductDto {
  @IsString() sku!: string;
  @IsString() name!: string;
  @IsNumber() salePrice!: number;
  @IsNumber() cost!: number;
  @IsInt() @Min(0) stock!: number;
  @IsInt() @Min(0) minStock!: number;
  @IsString() categoryId!: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() description?: string;
}
@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private p: PrismaService) {}

  @Get()
  @Permission('products.view')
  list(@Query('q') q?: string) {
    return this.p.product.findMany({
      where: {
        active: true,
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('categories')
  @Permission('products.view')
  cats() {
    return this.p.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  @Get(':id')
  @Permission('products.view')
  one(@Param('id') id: string) {
    return this.p.product.findUnique({ where: { id }, include: { category: true } });
  }

  @Post()
  @Permission('products.create')
  async create(@Body() d: ProductDto) {
    const sku = d.sku.trim();
    const name = d.name.trim();
    if (!sku) throw new BadRequestException('El SKU es obligatorio.');
    if (!name) throw new BadRequestException('El nombre es obligatorio.');
    if (!d.categoryId?.trim()) throw new BadRequestException('Selecciona una categoría.');
    if (!Number.isFinite(d.salePrice) || d.salePrice < 0) throw new BadRequestException('Precio de venta inválido.');
    if (!Number.isFinite(d.cost) || d.cost < 0) throw new BadRequestException('Costo inválido.');

    const category = await this.p.category.findUnique({ where: { id: d.categoryId } });
    if (!category || !category.active) throw new BadRequestException('La categoría seleccionada no existe o está inactiva.');

    return this.p.product.create({
      data: {
        sku,
        name,
        salePrice: d.salePrice,
        cost: d.cost,
        stock: d.stock,
        minStock: d.minStock,
        categoryId: d.categoryId,
        barcode: d.barcode?.trim() || null,
        description: d.description?.trim() || null,
      },
    });
  }

  @Patch(':id')
  @Permission('products.edit')
  edit(@Param('id') id: string, @Body() d: Partial<ProductDto>) {
    return this.p.product.update({
      where: { id },
      data: {
        ...(d.sku !== undefined ? { sku: d.sku.trim() } : {}),
        ...(d.name !== undefined ? { name: d.name.trim() } : {}),
        ...(d.salePrice !== undefined ? { salePrice: d.salePrice } : {}),
        ...(d.cost !== undefined ? { cost: d.cost } : {}),
        ...(d.stock !== undefined ? { stock: d.stock } : {}),
        ...(d.minStock !== undefined ? { minStock: d.minStock } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
        ...(d.barcode !== undefined ? { barcode: d.barcode.trim() || null } : {}),
        ...(d.description !== undefined ? { description: d.description.trim() || null } : {}),
      },
    });
  }

  @Patch(':id/deactivate')
  @Permission('products.delete')
  deactivate(@Param('id') id: string) {
    return this.p.product.update({ where: { id }, data: { active: false } });
  }
}
