
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer, request as httpRequest } from 'node:http';

import express from 'express';
import multer from 'multer';

import { uploadMedia } from './uploadMedia.js';
import { validateUploadedMedia } from './validateUploadedMedia.js';

const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==',
  'base64',
);

interface MultipartField {
  name: string;
  value: string;
}

interface MultipartFile {
  buffer: Buffer;
  mimetype: string;
  filename?: string;
}

interface MultipartOptions {
  fields?: MultipartField[];
  files?: MultipartFile[];
}

async function createUploadTestServer() {
  const app = express();
  let controllerReached = false;

  app.post(
    '/upload',
    uploadMedia.array('media', 3),
    validateUploadedMedia,
    (req, res) => {
      controllerReached = true;

      const files =
        (req.files as Express.Multer.File[] | undefined) ?? [];

      res.status(200).json({
        accepted: true,
        fileCount: files.length,
      });
    },
  );

  // Match the relevant Multer error handling in the real server.
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof multer.MulterError) {
        res.status(400).json({
          message:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Each media file must be 25MB or smaller'
              : 'Upload up to 3 images or a single video',
        });
        return;
      }

      if (error instanceof Error && error.message === 'Unsupported media type') {
        res.status(400).json({
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        message: 'Server error',
      });
    },
  );

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error('Unable to start integration test server');
  }

  return {
    url: `http://127.0.0.1:${address.port}/upload`,

    wasControllerReached: () => controllerReached,

    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

async function sendMultipart(
  url: string,
  options: MultipartOptions = {},
) {
  const boundary = '----AlRayanUploadTestBoundary';

  const parts: Buffer[] = [];

  for (const field of options.fields ?? []) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${field.name}"\r\n\r\n` +
          `${field.value}\r\n`,
        'utf8',
      ),
    );
  }

  for (const file of options.files ?? []) {
    const filename = file.filename ?? 'test.png';

    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
          `Content-Type: ${file.mimetype}\r\n\r\n`,
        'utf8',
      ),
    );

    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  return new Promise<{
    statusCode: number;
    body: string;
  }>((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    request.on('error', reject);
    request.end(body);
  });
}

function createValidFields(): MultipartField[] {
  return [
    { name: 'title', value: 'Dining table' },
    { name: 'description', value: 'A dining table description' },
    { name: 'category', value: 'Dining Rooms' },
    { name: 'featured', value: 'false' },
    {
      name: 'instagramUrl',
      value: 'https://www.instagram.com/p/example/',
    },
  ];
}

function createValidFile(): MultipartFile {
  return {
    buffer: pngFixture,
    mimetype: 'image/png',
    filename: 'test.png',
  };
}

// -----------------------------------------------------------------------------
// Existing integration tests
// -----------------------------------------------------------------------------

test('Multer and validation middleware accept a genuine PNG upload', async () => {
  const server = await createUploadTestServer();

  try {
    const response = await sendMultipart(server.url, {
      files: [createValidFile()],
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      accepted: true,
      fileCount: 1,
    });

    assert.equal(server.wasControllerReached(), true);
  } finally {
    await server.close();
  }
});

test('Multer accepts declared JPEG but validation rejects PNG content', async () => {
  const server = await createUploadTestServer();

  try {
    const response = await sendMultipart(server.url, {
      files: [
        {
          buffer: pngFixture,
          mimetype: 'image/jpeg',
        },
      ],
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), {
      message: 'Unsupported or invalid media content',
    });

    assert.equal(server.wasControllerReached(), false);
  } finally {
    await server.close();
  }
});

test('PATCH-style request without new files reaches the next handler', async () => {
  const server = await createUploadTestServer();

  try {
    const response = await sendMultipart(server.url);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      accepted: true,
      fileCount: 0,
    });

    assert.equal(server.wasControllerReached(), true);
  } finally {
    await server.close();
  }
});

// -----------------------------------------------------------------------------
// Multipart resource limit integration tests
// -----------------------------------------------------------------------------

test('accepts exactly five fields and three files', async () => {
  const server = await createUploadTestServer();

  try {
    const response = await sendMultipart(server.url, {
      fields: createValidFields(),
      files: [
        createValidFile(),
        createValidFile(),
        createValidFile(),
      ],
    });

    assert.equal(response.statusCode, 200);

    assert.deepEqual(JSON.parse(response.body), {
      accepted: true,
      fileCount: 3,
    });

    assert.equal(server.wasControllerReached(), true);
  } finally {
    await server.close();
  }
});

test('rejects more than five text fields', async () => {
  const server = await createUploadTestServer();

  try {
    const fields = [
      ...createValidFields(),
      { name: 'unexpected', value: 'extra field' },
    ];

    const response = await sendMultipart(server.url, {
      fields,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(server.wasControllerReached(), false);
  } finally {
    await server.close();
  }
});

test('rejects a text field exceeding 8 KiB', async () => {
  const server = await createUploadTestServer();

  try {
    const response = await sendMultipart(server.url, {
      fields: [
        {
          name: 'description',
          value: 'A'.repeat(8 * 1024 + 1),
        },
      ],
    });

    assert.equal(response.statusCode, 400);
    assert.equal(server.wasControllerReached(), false);
  } finally {
    await server.close();
  }
});

test('rejects a fourth media file, exceeding the file and multipart limits', async () => {
  const server = await createUploadTestServer();

  try {
    // Five fields plus four files = nine parts.
    // This exceeds both the total-parts limit and the individual file limit.
    const response = await sendMultipart(server.url, {
      fields: createValidFields(),
      files: [
        createValidFile(),
        createValidFile(),
        createValidFile(),
        createValidFile(),
      ],
    });

    assert.equal(response.statusCode, 400);
    assert.equal(server.wasControllerReached(), false);
  } finally {
    await server.close();
  }
});
