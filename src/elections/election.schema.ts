import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ElectionDocument = Election & Document;

@Schema({ timestamps: true })
export class Election {
  @Prop({ required: true, unique: true, index: true })
  electionId: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop()
  contractAddress: string;

  @Prop({ default: 'Draft', enum: ['Draft', 'Active', 'Completed', 'Draw', 'Cancelled'] })
  status: string;

  @Prop()
  winnerId: number;
}

export const ElectionSchema = SchemaFactory.createForClass(Election);
