import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VoterDocument = Voter & Document;

@Schema({ timestamps: true })
export class Voter {
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

  @Prop({ default: 'Pending', enum: ['Pending', 'Verified', 'Failed'] })
  verificationStatus: string;

  @Prop({ default: false })
  isPreRegistered: boolean; // Pre-approved wallet flag

  @Prop({ default: 'Voter' })
  role: string;

  @Prop({ default: false })
  hasToken: boolean;

  @Prop({ default: false })
  hasVoted: boolean;

  @Prop()
  nonce: string; // SIWE Nonce
}

export const VoterSchema = SchemaFactory.createForClass(Voter);
