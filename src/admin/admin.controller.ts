import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Voter, VoterDocument } from '../users/voter.schema.js';
import { Candidate, CandidateDocument } from '../users/candidate.schema.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>
  ) {}

  @Get('pending-kyc')
  async getPendingKyc() {
    const pendingVoters = await this.voterModel.find({ verificationStatus: 'Pending' });
    const pendingCandidates = await this.candidateModel.find({ verificationStatus: 'Pending' });
    return {
      voters: pendingVoters,
      candidates: pendingCandidates
    };
  }

  @Post('approve-kyc')
  @HttpCode(HttpStatus.OK)
  async approveKyc(@Body() body: { walletAddress: string; role: string }) {
    const address = body.walletAddress.toLowerCase();
    if (body.role === 'Voter') {
      await this.voterModel.findOneAndUpdate(
        { walletAddress: address },
        { verificationStatus: 'Verified', hasToken: true } // Admin will issue the EVT token on-chain
      );
    } else {
      await this.candidateModel.findOneAndUpdate(
        { walletAddress: address },
        { verificationStatus: 'Verified' }
      );
    }
    return { success: true, message: 'Approved successfully' };
  }

  @Post('nadra-add')
  @HttpCode(HttpStatus.OK)
  async nadraAdd(@Body() body: { walletAddress: string }) {
    const address = body.walletAddress.toLowerCase();
    
    await this.voterModel.findOneAndUpdate(
        { walletAddress: address },
        { 
            isPreRegistered: true, 
            verificationStatus: 'Verified', 
            role: 'Voter',
            hasToken: true,
            name: 'NADRA Verified Voter',
            cnic: '0000000000000',
            age: 18
        },
        { upsert: true }
    );

    return { 
        success: true, 
        message: 'Voter pre-approved via NADRA auth'
    };
  }
}
