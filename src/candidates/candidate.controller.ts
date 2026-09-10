import { Controller, Patch, Get, Post, Query, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CandidateService } from './candidate.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from '../users/candidate.schema.js';
import { ethers } from 'ethers';

@Controller('candidates')
export class CandidateController {
  constructor(
    private readonly candidateService: CandidateService,
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>
  ) {}

  @Post('register')
  async registerCandidate(
    @Body() body: { walletAddress: string; name: string; partyName: string; proposal: string; electionId: number }
  ) {
    const address = body.walletAddress.toLowerCase();
    
    // Save to MongoDB
    await this.candidateModel.findOneAndUpdate(
      { walletAddress: address },
      { 
        name: body.name, 
        partyName: body.partyName, 
        proposal: body.proposal, 
        electionId: body.electionId,
        role: 'Candidate',
        verificationStatus: 'Pending',
        isPreRegistered: true 
      },
      { upsert: true, new: true }
    );

    // Generate Signature
    const pk = process.env.PRIVATE_KEY;
    const validDummy = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const backendWallet = new ethers.Wallet(pk && pk.startsWith('0x') ? pk : (pk ? '0x' + pk : validDummy));
    
    const payloadHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'string'],
      [address, body.electionId, 'CANDIDATE']
    );
    const signature = await backendWallet.signMessage(ethers.getBytes(payloadHash));

    return { success: true, signature };
  }

  @Patch(':walletAddress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Candidate')
  async updateMetadata(
    @Param('walletAddress') walletAddress: string,
    @Body() body: { partyName: string; partyLogoMedia: string; electionId: number },
    @Request() req: any
  ) {
    if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.candidateService.updateMetadata(walletAddress, body.partyName, body.partyLogoMedia, body.electionId);
  }

  @Get()
  async getCandidates(@Query('electionId') electionId?: string) {
    return this.candidateService.getCandidates(electionId ? Number(electionId) : undefined);
  }
}
