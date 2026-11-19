# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

Install the Playwright Chromium browser once on each development machine:

```bash
npm exec playwright install chromium
```

Run the end-to-end suite:

```bash
npm run test:e2e
```

Playwright starts the Angular development server automatically. The tests mock API responses, so they do not require the backend or a database. To open the Playwright UI instead, run:

```bash
npm run test:e2e:ui
```
