import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { UsersModule } from './users/users.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { PrintingModule } from './printing/printing.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'tutimami-dev-secret',
      signOptions: {
        expiresIn: '15m',
      },
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    UsersModule,
    SalesModule,
    InventoryModule,
    ReportsModule,
    PrintingModule,
    AuditModule,
  ],
})
export class AppModule {}
