import { Module } from '@nestjs/common'; import { AppController } from './controller'; import { BankService } from './service';
@Module({controllers:[AppController],providers:[BankService]}) export class AppModule {}
