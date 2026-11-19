import { Schema, model } from 'mongoose';

export interface IProduct {
  title: string;
  description?: string;
  category: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaPublicId?: string;
  gallery?: { url: string; publicId: string }[];
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
    gallery: {
      type: [{ url: { type: String, required: true }, publicId: { type: String, required: true } }],
      default: undefined,
      validate: {
        validator: (items: { url: string; publicId: string }[]) => items.length <= 3,
        message: 'A product gallery can contain at most 3 images',
      },
    },
    featured: { type: Boolean, default: false },
    instagramUrl: { type: String, maxlength: 2048 },
  },
  { timestamps: true },
);

ProductSchema.index({ featured: -1, createdAt: -1 });
ProductSchema.index({ category: 1, featured: -1, createdAt: -1 });

export default model<IProduct>('Product', ProductSchema);
