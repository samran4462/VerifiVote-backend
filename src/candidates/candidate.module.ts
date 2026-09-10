import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CandidateController } from './candidate.controller.js';
import { CandidateService } from './candidate.service.js';
import { Candidate, CandidateSchema } from '../users/candidate.schema.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Candidate.name, schema: CandidateSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-for-dev',
    }),
  ],
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
