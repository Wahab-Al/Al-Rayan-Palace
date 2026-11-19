import type { Product } from './product';

export interface CategoryPreview {
  name: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export interface AllPreview {
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pages: number;
  categories: string[];
  categoryPreviews: CategoryPreview[];
  allPreview: AllPreview | null;
}
