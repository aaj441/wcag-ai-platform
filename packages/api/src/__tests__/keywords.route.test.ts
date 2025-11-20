import request from 'supertest';
import express from 'express';
import keywordsRouter from '../routes/keywords';

const app = express();
app.use(express.json());
app.use('/api/keywords', keywordsRouter);

describe('Keywords routes', () => {
  it('GET /api/keywords returns keyword counts', async () => {
    const res = await request(app).get('/api/keywords');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('keyword');
      expect(res.body.data[0]).toHaveProperty('count');
    }
  });
});
