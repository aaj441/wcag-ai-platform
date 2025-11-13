import request from 'supertest';
import express from 'express';
import draftsRouter from '../routes/drafts';

const app = express();
app.use(express.json());
app.use('/api/drafts', draftsRouter);

describe('Drafts status transitions', () => {
  it('prevents invalid direct transition draft -> sent', async () => {
    const list = await request(app).get('/api/drafts');
    const draft = list.body.data.find((d: any) => d.status === 'draft');
    expect(draft).toBeTruthy();

    const res = await request(app)
      .put(`/api/drafts/${draft.id}`)
      .send({ status: 'sent' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('allows pending_review -> approved via approve endpoint', async () => {
    const list = await request(app).get('/api/drafts');
    const draft = list.body.data.find((d: any) => d.status === 'pending_review');
    expect(draft).toBeTruthy();

    const approve = await request(app)
      .patch(`/api/drafts/${draft.id}/approve`)
      .send({ approvedBy: 'tester@example.com' });

    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('approved');
  });
});
