import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CandidateDocument = Candidate & Document;

@Schema({ timestamps: true })
export class Candidate {
  @Prop({ required: true, unique: true, index: true, lowercase: true })
  walletAddress: string;

  @Prop()
  name: string;

  @Prop({ unique: true, sparse: true })
  cnic: string;

  @Prop()
  cnicFrontMedia: string; // S3 or IPFS URL

  @Prop()
  cnicBackMedia: string; // S3 or IPFS URL

  @Prop()
  photoMedia: string; // Live selfie URL for face matching

  @Prop()
  age: number;

  @Prop()
  partyName: string;

  @Prop()
  partyLogoMedia: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Verified', 'Failed'] })
  verificationStatus: string;

  @Prop({ default: 'Candidate' })
  role: string;

  @Prop({ default: false })
  isPreRegistered: boolean; // Support for pre-approved wallets

  @Prop()
  electionId: number;

  @Prop()
  candidateId: number;

  @Prop({ default: 0 })
  voteCount: number;

  @Prop()
  nonce: string; // SIWE Nonce
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);
