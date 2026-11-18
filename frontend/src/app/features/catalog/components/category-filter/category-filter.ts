import { Component, input, output } from '@angular/core';

import type { AllPreview, CategoryPreview } from '../../models/product-list-response';

@Component({
  selector: 'app-category-filter',
  imports: [],
  templateUrl: './category-filter.html',
  styleUrl: './category-filter.scss',
})
export class CategoryFilter {
  readonly categories = input<CategoryPreview[]>([]);

  readonly allPreview = input<AllPreview | null>(null);

  readonly selectedCategory = input('all');

  readonly categoryChange = output<string>();

  selectCategory(category: string): void {
    this.categoryChange.emit(category);
  }
}
