import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from '../users/candidate.schema.js';

@Injectable()
export class CandidateService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
  ) {}

  async updateMetadata(walletAddress: string, partyName: string, partyLogoMedia: string, electionId: number) {
    const address = walletAddress.toLowerCase();
    const candidate = await this.candidateModel.findOneAndUpdate(
      { walletAddress: address },
      { partyName, partyLogoMedia, electionId },
      { new: true }
    );
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async getCandidates(electionId?: number) {
    if (electionId) {
      return this.candidateModel.find({ electionId }).exec();
    }
    return this.candidateModel.find().exec();
  }
}
