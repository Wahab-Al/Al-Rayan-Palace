import { Schema, model } from 'mongoose';

export interface IProduct {
  title: string;
  description?: string;
  category: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaPublicId?: string;
  featured: boolean;
  instagramUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true },
    description: String,
    category: { type: String, default: 'Uncategorized' },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    mediaPublicId: { type: String },
    featured: { type: Boolean, default: false },
    instagramUrl: { type: String, maxlength: 2048 },
  },
  { timestamps: true },
);

export default model<IProduct>('Product', ProductSchema);
