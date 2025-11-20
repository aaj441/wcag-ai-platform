/// <reference types="jest" />
import request from 'supertest';
import express from 'express';
import draftsRouter from '../routes/drafts';

const app = express();
app.use(express.json());
app.use('/api/drafts', draftsRouter);

describe('Drafts API integration', () => {
  it('returns list of drafts', async () => {
    const res = await request(app).get('/api/drafts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
