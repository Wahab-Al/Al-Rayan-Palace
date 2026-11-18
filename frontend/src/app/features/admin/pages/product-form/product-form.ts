import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminProductService } from '../../services/admin-product';

@Component({
  selector: 'app-admin-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly productService = inject(AdminProductService);

  readonly loading = signal(false);

  readonly submitting = signal(false);

  readonly error = signal<string | null>(null);

  readonly success = signal<string | null>(null);

  readonly categories = signal<string[]>([]);

  readonly selectedFile = signal<File | null>(null);

  readonly previewUrl = signal<string | null>(null);

  readonly previewType = signal<'image' | 'video' | null>(null);

  readonly productId = signal<string | null>(null);

  readonly isEdit = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],

    description: ['', Validators.maxLength(1000)],

    category: ['', [Validators.required, Validators.maxLength(80)]],

    featured: [false],

    instagramUrl: [
      '',
      [
        Validators.maxLength(2048),
        Validators.pattern(/^https:\/\/(?:www\.)?instagram\.com(?:\/[^\s]*)?$/i),
      ],
    ],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.productId.set(id);
      this.isEdit.set(true);
      this.loadProduct(id);
      return;
    }

    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  private loadCategories(): void {
    this.productService.getProducts(1, 1).subscribe({
      next: (response) => {
        this.categories.set(response.categories);
      },

      error: () => {
        this.categories.set([]);
      },
    });
  }

  private loadProduct(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getProduct(id).subscribe({
      next: (response) => {
        const product = response.item;

        this.form.patchValue({
          title: product.title,
          description: product.description ?? '',
          category: product.category,
          featured: product.featured,
          instagramUrl: product.instagramUrl ?? '',
        });

        this.previewUrl.set(product.mediaUrl);

        this.previewType.set(product.mediaType);

        this.loading.set(false);

        this.loadCategories();
      },

      error: (error) => {
        this.loading.set(false);

        this.error.set(error?.error?.message ?? 'Failed to load product');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.error.set(null);
    this.success.set(null);

    const allowed = file.type.startsWith('image/') || file.type.startsWith('video/');

    if (!allowed) {
      input.value = '';

      this.selectedFile.set(null);
      this.error.set('Please select an image or video.');

      return;
    }

    const maxSize = 50 * 1024 * 1024;

    if (file.size > maxSize) {
      input.value = '';

      this.selectedFile.set(null);
      this.error.set('Maximum file size is 50MB.');

      return;
    }

    this.revokePreview();

    this.selectedFile.set(file);

    this.previewUrl.set(URL.createObjectURL(file));

    this.previewType.set(file.type.startsWith('video/') ? 'video' : 'image');
  }

  submit(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isEdit() && !this.selectedFile()) {
      this.error.set('Please select an image or video.');

      return;
    }

    const formData = new FormData();

    formData.append('title', this.form.controls.title.value.trim());

    formData.append('description', this.form.controls.description.value.trim());

    formData.append('category', this.form.controls.category.value.trim());

    formData.append('featured', String(this.form.controls.featured.value));
    formData.append('instagramUrl', this.form.controls.instagramUrl.value.trim());

    const file = this.selectedFile();

    if (file) {
      formData.append('media', file, file.name);
    }

    this.submitting.set(true);

    const request$ =
      this.isEdit() && this.productId()
        ? this.productService.updateProduct(this.productId()!, formData)
        : this.productService.createProduct(formData);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);

        this.success.set(
          this.isEdit() ? 'Product updated successfully.' : 'Product created successfully.',
        );

        setTimeout(() => {
          this.router.navigate(['/admin/products']);
        }, 500);
      },

      error: (error) => {
        this.submitting.set(false);

        this.error.set(error?.error?.message ?? 'Failed to save product');
      },
    });
  }

  private revokePreview(): void {
    const url = this.previewUrl();

    const file = this.selectedFile();

    if (url && file) {
      URL.revokeObjectURL(url);
    }
  }
}
