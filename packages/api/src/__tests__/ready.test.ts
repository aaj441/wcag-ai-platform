import request from 'supertest';
import app from '../server';

describe('/ready endpoint', () => {
  it('returns readiness json', async () => {
    const res = await request(app).get('/ready');
    expect([200, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('ready');
  });
});
