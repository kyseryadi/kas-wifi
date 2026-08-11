// Vercel entrypoint. The TypeScript sources are compiled by `npm run build`.
import express from 'express';
import app from './dist/application.js';

// Keep the Express import visible to Vercel's framework detector.
void express;

export default app;
