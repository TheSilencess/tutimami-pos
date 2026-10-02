import {Module} from '@nestjs/common';
import {CashController} from './cash';
@Module({controllers:[CashController]}) export class CashModule {}
