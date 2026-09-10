import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { KycModule } from './kyc/kyc.module.js';
import { ElectionModule } from './elections/election.module.js';
import { CandidateModule } from './candidates/candidate.module.js';
import { IndexerModule } from './indexer/indexer.module.js';
import { AdminController } from './admin/admin.controller.js';
import { Voter, VoterSchema } from './users/voter.schema.js';
import { Candidate, CandidateSchema } from './users/candidate.schema.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20,
    }]),
    MongooseModule.forRootAsync({
      useFactory: async () => {
        let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';
        return { uri };
      },
    }),
    MongooseModule.forFeature([
      { name: Voter.name, schema: VoterSchema },
      { name: Candidate.name, schema: CandidateSchema }
    ]),
    JwtModule.register({ secret: process.env.JWT_SECRET || 'super-secret-key-for-dev' }),
    AuthModule,
    KycModule,
    ElectionModule,
    CandidateModule,
    IndexerModule
  ],
  controllers: [AppController, AdminController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
