import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KycController } from './kyc.controller.js';
import { KycService } from './kyc.service.js';
import { Voter, VoterSchema } from '../users/voter.schema.js';
import { Candidate, CandidateSchema } from '../users/candidate.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voter.name, schema: VoterSchema },
      { name: Candidate.name, schema: CandidateSchema }
    ]),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService]
})
export class KycModule {}
