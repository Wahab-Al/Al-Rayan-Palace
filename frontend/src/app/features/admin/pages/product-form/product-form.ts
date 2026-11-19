import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AdminProductsStore } from '../../state/admin-products.store';

export function mergeMediaFiles(current: File[], added: File[]): File[] {
  const merged = [...current];
  const keys = new Set(
    current.map((file) => `${file.name}:${file.size}:${file.lastModified}:${file.type}`),
  );

  for (const file of added) {
    const key = `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
    if (!keys.has(key)) {
      merged.push(file);
      keys.add(key);
    }
  }

  return merged;
}

@Component({
  selector: 'app-admin-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  providers: [AdminProductsStore],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly productStore = inject(AdminProductsStore);

  private readonly validationError = signal<string | null>(null);
  readonly loading = this.productStore.isLoading;
  readonly submitting = this.productStore.isSaving;
  readonly error = computed(() => this.validationError() ?? this.productStore.error());

  readonly success = signal<string | null>(null);

  readonly categories = this.productStore.categories;

  readonly selectedFiles = signal<File[]>([]);

  readonly previewUrls = signal<string[]>([]);

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

  constructor() {
    effect(() => {
      const product = this.productStore.currentProduct();
      if (!product) return;

      this.form.patchValue({
        title: product.title,
        description: product.description ?? '',
        category: product.category,
        featured: product.featured,
        instagramUrl: product.instagramUrl ?? '',
      });
      this.previewUrls.set(
        product.mediaType === 'image' && product.images?.length
          ? product.images
          : [product.mediaUrl],
      );
      this.previewType.set(product.mediaType);
    });

    effect(() => {
      if (this.productStore.saveStatus() === 'success') {
        this.success.set(
          this.isEdit() ? 'Product updated successfully.' : 'Product created successfully.',
        );
        void this.router.navigateByUrl('/');
      }
    });
  }

  ngOnInit(): void {
    this.productStore.loadCategories();
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.productId.set(id);
        this.isEdit.set(id !== null);
        if (id) this.productStore.loadProduct(id);
      });
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onFileSelected(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const input = event.target;

    const addedFiles = Array.from(input.files ?? []);
    if (addedFiles.length === 0) {
      return;
    }

    this.validationError.set(null);
    this.success.set(null);

    const files = mergeMediaFiles(this.selectedFiles(), addedFiles);
    const areImages = files.every((file) => file.type.startsWith('image/'));
    const isSingleVideo = files.length === 1 && files[0].type.startsWith('video/');
    if ((!areImages && !isSingleVideo) || (areImages && files.length > 3)) {
      input.value = '';

      this.validationError.set(
        'Choose 1 to 3 images, or choose a single video. Do not mix media types.',
      );

      return;
    }

    const maxSize = 25 * 1024 * 1024;

    if (files.some((file) => file.size > maxSize)) {
      input.value = '';

      this.validationError.set('Each file must be 25MB or smaller.');

      return;
    }

    this.revokePreview();

    this.selectedFiles.set(files);
    this.previewUrls.set(files.map((file) => URL.createObjectURL(file)));
    this.previewType.set(isSingleVideo ? 'video' : 'image');
  }

  submit(): void {
    this.validationError.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isEdit() && this.selectedFiles().length === 0) {
      this.validationError.set('Please select 1 to 3 images or one video.');

      return;
    }

    const formData = new FormData();

    formData.append('title', this.form.controls.title.value.trim());

    formData.append('description', this.form.controls.description.value.trim());

    formData.append('category', this.form.controls.category.value.trim());

    formData.append('featured', String(this.form.controls.featured.value));
    formData.append('instagramUrl', this.form.controls.instagramUrl.value.trim());

    for (const file of this.selectedFiles()) {
      formData.append('media', file, file.name);
    }

    this.productStore.saveProduct({
      id: this.isEdit() ? this.productId() : null,
      formData,
    });
  }

  private revokePreview(): void {
    for (const url of this.previewUrls()) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  }
}
