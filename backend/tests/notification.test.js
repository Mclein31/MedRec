const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Notifications API Endpoints', () => {
  let token;
  let testEmail;
  let createdNotificationId;

  beforeAll(async () => {
    const fs = require('fs');
    const path = require('path');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    testEmail = `notif_test_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Notification Test User',
        email: testEmail,
        password: 'Password123',
      });
    expect(res.status).toBe(201);
    token = res.body.token;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {}
    await pool.end();
  });

  it('GET /notifications should return 401 without authorization token', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /notifications should return empty list and 0 unread for fresh user', async () => {
    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('unreadCount');
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.unreadCount).toBe(0);
  });

  it('POST /records should automatically trigger a record_added notification', async () => {
    const recordRes = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'lab',
        title: 'Comprehensive Blood Panel',
        description: 'Normal results across all biomarkers',
        date: '2026-08-30',
      });

    expect(recordRes.status).toBe(201);

    const notifRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.unreadCount).toBe(1);
    expect(notifRes.body.notifications.length).toBe(1);

    const notif = notifRes.body.notifications[0];
    expect(notif.type).toBe('record_added');
    expect(notif.title).toBe('New Medical Record Added');
    expect(notif.body).toContain('Comprehensive Blood Panel');
    expect(notif.read).toBe(false);
    expect(notif.data.recordId).toBe(recordRes.body.record.id);

    createdNotificationId = notif.id;
  });

  it('PATCH /notifications/:id/read should mark a single notification as read', async () => {
    const res = await request(app)
      .patch(`/notifications/${createdNotificationId}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notification.read).toBe(true);
    expect(res.body.unreadCount).toBe(0);

    const verifyRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(verifyRes.body.unreadCount).toBe(0);
    expect(verifyRes.body.notifications[0].read).toBe(true);
  });

  it('PATCH /notifications/read-all should mark all notifications as read', async () => {
    // Create another share to generate a new unread notification
    await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ ttlMinutes: 30 });

    const beforeRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(beforeRes.body.unreadCount).toBe(1);

    const readAllRes = await request(app)
      .patch('/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body.success).toBe(true);
    expect(readAllRes.body.unreadCount).toBe(0);

    const afterRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(afterRes.body.unreadCount).toBe(0);
    expect(afterRes.body.notifications.every((n) => n.read === true)).toBe(true);
  });

  it('DELETE /notifications/:id should delete a notification', async () => {
    const res = await request(app)
      .delete(`/notifications/${createdNotificationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const listRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    const found = listRes.body.notifications.find((n) => n.id === createdNotificationId);
    expect(found).toBeUndefined();
  });
});
