export interface Product {
  id: string;
  title: string;
  description?: string;
  category: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaPublicId?: string;
  featured: boolean;
  instagramUrl?: string;
  createdAt: string;
  updatedAt: string;
}
