import request from 'supertest';
import express from 'express';
import draftsRouter from '../routes/drafts';

const app = express();
app.use(express.json());
app.use('/api/drafts', draftsRouter);

describe('Drafts keyword filter', () => {
  it('filters drafts by keyword', async () => {
    const list = await request(app).get('/api/drafts');
    expect(list.status).toBe(200);
    const all = list.body.data;
    expect(Array.isArray(all)).toBe(true);

    // Find a keyword present in first draft
    const first = all[0];
    const keyword = (first.keywords && first.keywords[0]) || 'accessibility';

    const filtered = await request(app).get(`/api/drafts?keyword=${encodeURIComponent(keyword)}`);
    expect(filtered.status).toBe(200);
    const filteredData = filtered.body.data;
    expect(Array.isArray(filteredData)).toBe(true);

    // All returned drafts should include the keyword
    for (const d of filteredData) {
      const kws: string[] = d.keywords || [];
      expect(kws.map(k => k.toLowerCase())).toContain(keyword.toLowerCase());
    }
  });
});
