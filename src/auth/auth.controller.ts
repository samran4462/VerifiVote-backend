import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nonce')
  async getNonce(@Query('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      return { error: 'Wallet address required' };
    }
    const nonce = await this.authService.generateNonce(walletAddress);
    return { nonce };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() body: { walletAddress: string; signature: string }) {
    return this.authService.verifySignature(body.walletAddress, body.signature);
  }
}
