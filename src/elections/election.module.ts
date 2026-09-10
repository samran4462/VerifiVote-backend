import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ElectionController } from './election.controller.js';
import { ElectionService } from './election.service.js';
import { Election, ElectionSchema } from './election.schema.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Election.name, schema: ElectionSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-for-dev',
    }),
  ],
  controllers: [ElectionController],
  providers: [ElectionService],
})
export class ElectionModule {}
