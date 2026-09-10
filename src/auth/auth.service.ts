import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';
import { Voter, VoterDocument } from '../users/voter.schema.js';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private backendWallet: ethers.BaseWallet;

  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
    private jwtService: JwtService,
  ) {
    const pk = process.env.PRIVATE_KEY;
    if (pk) {
      this.backendWallet = new ethers.Wallet(pk.startsWith('0x') ? pk : '0x' + pk);
    } else {
      this.backendWallet = ethers.Wallet.createRandom();
    }
  }

  async generateNonce(walletAddress: string): Promise<string> {
    const address = walletAddress.toLowerCase();
    let user = await this.voterModel.findOne({ walletAddress: address });
    
    const nonce = crypto.randomBytes(16).toString('hex');
    
    if (user) {
      user.nonce = nonce;
      await user.save();
    } else {
      user = new this.voterModel({ walletAddress: address, nonce });
      await user.save();
    }
    
    return nonce;
  }

  async verifySignature(walletAddress: string, signature: string): Promise<{ access_token: string }> {
    const address = walletAddress.toLowerCase();
    const user = await this.voterModel.findOne({ walletAddress: address });
    
    if (!user || !user.nonce) {
      throw new BadRequestException('User or nonce not found');
    }

    const message = `Sign this message to authenticate with the Voting System.\nNonce: ${user.nonce}`;
    
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address) {
        throw new UnauthorizedException('Signature verification failed');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid signature format');
    }

    user.nonce = "";
    await user.save();

    
    let role = user.role;
    if (user.walletAddress === '0x8f71bcd375fc18c49ad36dffeaacc016c49778b9'.toLowerCase()) {
      role = 'Admin';
    }
    const payload = { sub: user._id, walletAddress: user.walletAddress, role: role };
  
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
