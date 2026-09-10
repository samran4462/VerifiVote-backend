import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Voter, VoterSchema } from '../users/voter.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Voter.name, schema: VoterSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-for-dev',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
