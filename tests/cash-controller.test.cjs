require('reflect-metadata');
const {strict:assert}=require('node:assert');
const {CashController}=require('../apps/backend/dist/src/cash/cash');
(async()=>{
let session=null, audits=[];const tx={$queryRaw:async()=>[],cashSession:{findFirst:async()=>session,create:async({data})=>(session={id:'turno',...data,closedAt:null}),update:async({data})=>(session={...session,...data})},auditLog:{create:async({data})=>audits.push(data)}};
const p={$transaction:async fn=>fn(tx)};const c=new CashController(p),u={id:'cajera'};
await c.open({registerName:' caja 1 ',openingCash:200},u);assert.equal(session.registerName,'CAJA 1');assert.equal(audits[0].action,'OPEN');
await assert.rejects(()=>c.open({registerName:'caja 1',openingCash:0},u));
session.sales=[{status:'PAID',total:100,payments:[{method:'CASH',amount:100},{method:'CARD',amount:30},{method:'TRANSFER',amount:20}]}];
const result=await c.close('turno',{countedCash:245,notes:'Faltante'},u);assert.equal(result.expectedCash,250);assert.equal(result.difference,-5);assert.equal(result.cardSales,30);assert.equal(result.transferSales,20);assert.equal(audits[1].action,'CLOSE');
tx.cashSession.findFirst=async()=>null;await assert.rejects(()=>c.close('turno',{countedCash:245},u));console.log('Apertura, cierre, duplicados y auditoría: OK (transacciones simuladas)');
})().catch(e=>{console.error(e);process.exit(1);});
