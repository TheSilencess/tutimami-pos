import {BadRequestException, Body, Controller, Get, Post, Param, Query, Res, UseGuards} from '@nestjs/common';
import {IsNumber, IsString, IsOptional, Min, MaxLength, Matches} from 'class-validator';
import {Response} from 'express';
import {PrismaService} from '../common/prisma.service';
import {AuthGuard} from '../common/auth.guard';
import {CurrentUser, Permission} from '../common/auth.decorators';
import {cents, paymentTotals, periodRange} from '../common/cash-math';
import {reportPdf} from '../common/report-pdf';
class OpenDto {
 @IsNumber({maxDecimalPlaces:2}) @Min(0) openingCash!:number;
 @IsString() @MaxLength(40) @Matches(/\S/) registerName!:string;
}
class CloseDto {
 @IsNumber({maxDecimalPlaces:2}) @Min(0) countedCash!:number;
 @IsOptional() @IsString() @MaxLength(500) notes?:string;
}
export const cashSummary = (s:any) => {
 const t=paymentTotals(s.sales || []);
 return {...s, sales:undefined, totals:t, expectedCash:s.closedAt ? Number(s.expectedCash) : (cents(s.openingCash)+cents(t.CASH))/100};
};
@Controller('cash') @UseGuards(AuthGuard)
export class CashController {
 constructor(private p:PrismaService){}
 @Get('current') @Permission('sales.create') async current(@CurrentUser() u:any) {
  const s=await this.p.cashSession.findFirst({where:{userId:u.id,closedAt:null},include:{sales:{include:{payments:true}}}});
  return s ? cashSummary(s) : null;
 }
 @Post('open') @Permission('sales.create') async open(@Body() d:OpenDto,@CurrentUser() u:any) {
  try {return await this.p.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${u.id} FOR UPDATE`;
   if(await tx.cashSession.findFirst({where:{OR:[{userId:u.id},{registerName:d.registerName.trim().toUpperCase()}],closedAt:null}})) throw new BadRequestException('El cajero o esta caja ya tiene un turno abierto');
   const s=await tx.cashSession.create({data:{userId:u.id,registerName:d.registerName.trim().toUpperCase(),openingCash:d.openingCash}});
   await tx.auditLog.create({data:{userId:u.id,action:'OPEN',entity:'CashSession',entityId:s.id,newValues:{openingCash:d.openingCash,registerName:s.registerName}}});
   return s;
  });} catch(e:any) {if(e.code==='P2002') throw new BadRequestException('Esta caja ya tiene un turno abierto'); throw e;}
 }
 @Post(':id/close') @Permission('sales.create') async close(@Param('id') id:string,@Body() d:CloseDto,@CurrentUser() u:any) {
  return this.p.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${u.id} FOR UPDATE`;
   const s=await tx.cashSession.findFirst({where:{id,userId:u.id,closedAt:null},include:{sales:{include:{payments:true}}}});
   if(!s) throw new BadRequestException('No existe un turno abierto propio');
   const t=paymentTotals(s.sales); const expectedCash=(cents(s.openingCash)+cents(t.CASH))/100;
   const out=await tx.cashSession.update({where:{id},data:{closedAt:new Date(),cashSales:t.CASH,cardSales:t.CARD,transferSales:t.TRANSFER,expectedCash,countedCash:d.countedCash,difference:(cents(d.countedCash)-cents(expectedCash))/100,notes:d.notes}});
   await tx.auditLog.create({data:{userId:u.id,action:'CLOSE',entity:'CashSession',entityId:id,newValues:{expectedCash,countedCash:d.countedCash,difference:Number(out.difference)}}});
   return out;
  });
 }
 async data(u:any,period?:string,date?:string) {
  let range;try{range=periodRange(period,date);}catch(e:any){throw new BadRequestException(e.message);}
  const admin=u.roles.some((r:any)=>r.role.name==='ADMIN');
  return (await this.p.cashSession.findMany({where:{openedAt:range,...(admin?{}:{userId:u.id})},include:{user:{select:{name:true}},sales:{include:{payments:true}}},orderBy:{openedAt:'desc'}})).map(cashSummary);
 }
 @Get('report') @Permission('sales.create') report(@CurrentUser()u:any,@Query('period')p?:string,@Query('date')d?:string){return this.data(u,p,d);}
 @Get('report/pdf') @Permission('sales.create') async pdf(@CurrentUser()u:any,@Query('period')p:string,@Query('date')d:string,@Res()res:Response){
  const rows=await this.data(u,p,d); const q=(n:any)=>`Q ${Number(n||0).toFixed(2)}`;
  const lines=['TutiMami - Reporte de cajas',`Periodo: ${p} / Fecha: ${d} (Guatemala)`,`Turnos: ${rows.length}`,''];
  for(const s of rows)lines.push(`${s.registerName} - ${s.user.name}`,`Apertura: ${s.openedAt.toLocaleString('es-GT',{timeZone:'America/Guatemala'})}`,`Cierre: ${s.closedAt?.toLocaleString('es-GT',{timeZone:'America/Guatemala'}) || 'Abierta'}`,`Fondo inicial: ${q(s.openingCash)}`,`Efectivo: ${q(s.closedAt?s.cashSales:s.totals.CASH)} / Tarjeta: ${q(s.closedAt?s.cardSales:s.totals.CARD)}`,`Transferencia: ${q(s.closedAt?s.transferSales:s.totals.TRANSFER)}`,`Efectivo esperado: ${q(s.expectedCash)}`,`Efectivo contado: ${s.closedAt?q(s.countedCash):'Pendiente'}`,`Diferencia: ${s.closedAt?q(s.difference):'Pendiente'}`,`Notas: ${s.notes||'-'}`,'');
  res.type('application/pdf').attachment('reporte-cajas.pdf').send(reportPdf(lines));
 }
}
