import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Election, ElectionDocument } from './election.schema.js';

@Injectable()
export class ElectionService {
  constructor(
    @InjectModel(Election.name) private electionModel: Model<ElectionDocument>,
  ) {}

  async createElection(data: { electionId: number; title: string; description: string; startTime: string; endTime: string }) {
    const election = new this.electionModel({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime)
    });
    return election.save();
  }

  
  async updateStatus(electionId: number, status: string) {
    return this.electionModel.findOneAndUpdate({ electionId }, { status }, { new: true });
  }

  async updateContractAddress(id: number, contractAddress: string) {
    const election = await this.electionModel.findOneAndUpdate(
      { electionId: id },
      { contractAddress },
      { new: true }
    );
    if (!election) {
      throw new NotFoundException('Election not found');
    }
    return election;
  }

  async getAllElections() {
    return this.electionModel.find().exec();
  }
}
