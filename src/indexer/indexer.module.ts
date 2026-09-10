import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockchainIndexerService } from './indexer.service.js';
import { Voter, VoterSchema } from '../users/voter.schema.js';
import { Candidate, CandidateSchema } from '../users/candidate.schema.js';
import { Election, ElectionSchema } from '../elections/election.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voter.name, schema: VoterSchema },
      { name: Candidate.name, schema: CandidateSchema },
      { name: Election.name, schema: ElectionSchema },
    ]),
  ],
  providers: [BlockchainIndexerService],
  exports: [BlockchainIndexerService],
})
export class IndexerModule {}
