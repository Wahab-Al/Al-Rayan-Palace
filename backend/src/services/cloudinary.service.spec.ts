
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';

import type { getCloudinary } from '../config/cloudinary.js';

import {
  createCloudinaryMediaService,
  type CloudinaryResourceType,
} from './cloudinary.service.js';

type CloudinaryClient = ReturnType<typeof getCloudinary>;

interface UploadOptions {
  resource_type: CloudinaryResourceType;
  folder: string;
}

interface DestroyOptions {
  resource_type: CloudinaryResourceType;
  invalidate: true;
}

type UploadCallback = (
  error: Error | undefined,
  result?: unknown,
) => void;

type DestroyCallback = (
  error: Error | undefined,
  result?: unknown,
) => void;

interface FakeCloudinaryOptions {
  uploadResponse?: unknown;
  uploadError?: Error;
  uploadStreamError?: Error;
  destroyResponse?: unknown;
  destroyError?: Error;
}

function createFakeCloudinary(options: FakeCloudinaryOptions = {}) {
  const calls: {
    uploadOptions?: UploadOptions;
    uploadedBuffer?: Buffer;
    destroyCall?: {
      publicId: string;
      options: DestroyOptions;
    };
  } = {};

  const defaultUploadResponse = {
    public_id: 'products/test-media',
    secure_url: 'https://res.cloudinary.com/test/image/upload/test-media.jpg',
    resource_type: 'image',
  };

  const uploadResponse = Object.prototype.hasOwnProperty.call(
    options,
    'uploadResponse',
  )
    ? options.uploadResponse
    : defaultUploadResponse;

  const destroyResponse = Object.prototype.hasOwnProperty.call(
    options,
    'destroyResponse',
  )
    ? options.destroyResponse
    : { result: 'ok' };

  const fakeClient = {
    uploader: {
      upload_stream(
        uploadOptions: UploadOptions,
        callback: UploadCallback,
      ) {
        calls.uploadOptions = uploadOptions;

        const uploadStream = new PassThrough();
        const chunks: Buffer[] = [];

        uploadStream.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
        });

        uploadStream.once('finish', () => {
          calls.uploadedBuffer = Buffer.concat(chunks);

          callback(options.uploadError, uploadResponse);
        });

        const streamError = options.uploadStreamError;

        if (streamError) {
          queueMicrotask(() => {
            uploadStream.destroy(streamError);
          });
        }

        return uploadStream;
      },

      destroy(
        publicId: string,
        destroyOptions: DestroyOptions,
        callback: DestroyCallback,
      ) {
        calls.destroyCall = {
          publicId,
          options: destroyOptions,
        };

        callback(options.destroyError, destroyResponse);
      },
    },
  } as unknown as CloudinaryClient;

  return {
    client: fakeClient,
    calls,
  };
}

// -----------------------------------------------------------------------------
// Upload tests
// -----------------------------------------------------------------------------

test('uploads an image and validates the returned Cloudinary metadata', async () => {
  const { client, calls } = createFakeCloudinary();

  const service = createCloudinaryMediaService(() => client);

  const input = Buffer.from('test-image-content');

  const result = await service.uploadMedia(input, 'image');

  assert.deepEqual(result, {
    publicId: 'products/test-media',
    secureUrl:
      'https://res.cloudinary.com/test/image/upload/test-media.jpg',
    resourceType: 'image',
  });

  assert.deepEqual(calls.uploadOptions, {
    resource_type: 'image',
    folder: 'alrayan-palacee/products',
  });

  assert.deepEqual(calls.uploadedBuffer, input);
});

test('uploads a video using the video resource type', async () => {
  const videoResponse = {
    public_id: 'products/test-video',
    secure_url: 'https://res.cloudinary.com/test/video/upload/test-video.mp4',
    resource_type: 'video',
  };

  const { client, calls } = createFakeCloudinary({
    uploadResponse: videoResponse,
  });

  const service = createCloudinaryMediaService(() => client);

  const result = await service.uploadMedia(
    Buffer.from('test-video-content'),
    'video',
  );

  assert.equal(result.resourceType, 'video');
  assert.equal(result.publicId, 'products/test-video');

  assert.deepEqual(calls.uploadOptions, {
    resource_type: 'video',
    folder: 'alrayan-palacee/products',
  });
});

test('rejects an empty buffer before requesting Cloudinary', async () => {
  let clientRequested = false;

  const { client } = createFakeCloudinary();

  const service = createCloudinaryMediaService(() => {
    clientRequested = true;
    return client;
  });

  await assert.rejects(
    service.uploadMedia(Buffer.alloc(0), 'image'),
    /non-empty media buffer/i,
  );

  assert.equal(clientRequested, false);
});

test('rejects Cloudinary upload errors', async () => {
  const { client } = createFakeCloudinary({
    uploadError: new Error('Mock provider upload failure'),
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.uploadMedia(Buffer.from('media'), 'image'),
    /Mock provider upload failure/,
  );
});

test('rejects upload stream errors', async () => {
  const { client } = createFakeCloudinary({
    uploadStreamError: new Error('Mock upload stream failure'),
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.uploadMedia(Buffer.from('media'), 'image'),
    /Mock upload stream failure/,
  );
});

test('rejects a missing Cloudinary upload response', async () => {
  const { client } = createFakeCloudinary({
    uploadResponse: undefined,
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.uploadMedia(Buffer.from('media'), 'image'),
    /Invalid Cloudinary upload response/,
  );
});

test('rejects an upload response without public ID', async () => {
  const { client } = createFakeCloudinary({
    uploadResponse: {
      secure_url: 'https://res.cloudinary.com/test/image/upload/file.jpg',
      resource_type: 'image',
    },
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.uploadMedia(Buffer.from('media'), 'image'),
    /missing required fields/,
  );
});

test('rejects an insecure delivery URL', async () => {
  const { client } = createFakeCloudinary({
    uploadResponse: {
      public_id: 'products/test',
      secure_url: 'http://res.cloudinary.com/test/image/upload/test.jpg',
      resource_type: 'image',
    },
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.uploadMedia(Buffer.from('media'), 'image'),
    /insecure delivery URL/,
  );
});

test('rejects a resource type different from the requested type', async () => {
  const { client } = createFakeCloudinary({
    uploadResponse: {
      public_id: 'products/test',
      secure_url: 'https://res.cloudinary.com/test/video/upload/test.mp4',
      resource_type: 'video',
    },
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.uploadMedia(Buffer.from('media'), 'image'),
    /unexpected resource type/,
  );
});

// -----------------------------------------------------------------------------
// Delete tests
// -----------------------------------------------------------------------------

test('deletes media and requests CDN invalidation', async () => {
  const { client, calls } = createFakeCloudinary();

  const service = createCloudinaryMediaService(() => client);

  await service.deleteMedia('products/test-media', 'image');

  assert.deepEqual(calls.destroyCall, {
    publicId: 'products/test-media',
    options: {
      resource_type: 'image',
      invalidate: true,
    },
  });
});

test('treats an already missing asset as successful idempotent cleanup', async () => {
  const { client } = createFakeCloudinary({
    destroyResponse: {
      result: 'not found',
    },
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.doesNotReject(
    service.deleteMedia('products/already-deleted', 'image'),
  );
});

test('rejects unexpected Cloudinary deletion results', async () => {
  const { client } = createFakeCloudinary({
    destroyResponse: {
      result: 'failed',
    },
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.deleteMedia('products/test-media', 'image'),
    /unexpected deletion result/,
  );
});

test('rejects missing Cloudinary deletion responses', async () => {
  const { client } = createFakeCloudinary({
    destroyResponse: undefined,
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.deleteMedia('products/test-media', 'image'),
    /unexpected deletion result/,
  );
});

test('propagates Cloudinary deletion errors', async () => {
  const { client } = createFakeCloudinary({
    destroyError: new Error('Mock provider deletion failure'),
  });

  const service = createCloudinaryMediaService(() => client);

  await assert.rejects(
    service.deleteMedia('products/test-media', 'image'),
    /Mock provider deletion failure/,
  );
});

test('rejects an empty public ID before requesting Cloudinary', async () => {
  let clientRequested = false;

  const { client } = createFakeCloudinary();

  const service = createCloudinaryMediaService(() => {
    clientRequested = true;
    return client;
  });

  await assert.rejects(
    service.deleteMedia('   ', 'image'),
    /public ID is required/i,
  );

  assert.equal(clientRequested, false);
});
