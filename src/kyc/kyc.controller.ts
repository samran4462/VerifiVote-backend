import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { KycService } from './kyc.service.js';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyKyc(
    @Body() body: { 
      walletAddress: string; 
      role: 'VOTER' | 'CANDIDATE'; 
      electionId: number;
      cnicFrontBase64: string; 
      cnicBackBase64: string; 
      selfieBase64: string;
      expectedName: string;
      expectedDob: string;
    }
  ) {
    return this.kycService.processKyc(
      body.walletAddress,
      body.role,
      body.electionId,
      body.cnicFrontBase64,
      body.cnicBackBase64,
      body.selfieBase64,
      body.expectedName,
      body.expectedDob
    );
  }
}
