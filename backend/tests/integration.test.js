const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

describe('Full End-to-End Integration & Multi-User Verification Suite (PostgreSQL + Cloudflare R2)', () => {
  let userAToken;
  let userAId;
  let userAEmail;
  let userBToken;
  let userBId;
  let userBEmail;
  let userARecordId;
  let userBRecordId;
  let userAShareToken;
  let userAShareId;

  beforeAll(async () => {
    // Apply clean database schema migrations
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    userAEmail = `e2e_user_a_${Date.now()}@medrec.test`;
    userBEmail = `e2e_user_b_${Date.now()}@medrec.test`;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email IN ($1, $2)', [userAEmail, userBEmail]);
    } catch {}
    await pool.end();
  });

  // STEP 1: Registration & Profile Provisioning Trigger Verification
  it('E2E-01: User A & User B register; trigger automatically provisions user_profiles', async () => {
    // Register User A
    const resA = await request(app)
      .post('/auth/register')
      .send({
        name: 'Alice Sovereign',
        email: userAEmail,
        password: 'Password123',
      });
    expect(resA.status).toBe(201);
    expect(resA.body).toHaveProperty('token');
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app)
      .post('/auth/register')
      .send({
        name: 'Bob Caretaker',
        email: userBEmail,
        password: 'Password123',
      });
    expect(resB.status).toBe(201);
    expect(resB.body).toHaveProperty('token');
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // Verify User A profile was created automatically by DB trigger
    const profileA = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(profileA.status).toBe(200);
    expect(profileA.body.user.id).toBe(userAId);
    expect(profileA.body.user.name).toBe('Alice Sovereign');
  });

  // STEP 2: Medical Record Creation & Attachment Association
  it('E2E-02: User A creates medical records with attachments; verifies retrieval', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'lab',
        title: 'Comprehensive Metabolic Panel',
        description: 'Fasting glucose: 92 mg/dL, normal electrolytes',
        date: '2026-09-01',
        attachmentUrl: `${userAId}/lab_scan_001.jpg`,
      });

    expect(res.status).toBe(201);
    expect(res.body.record).toHaveProperty('id');
    expect(res.body.record.title).toBe('Comprehensive Metabolic Panel');
    expect(res.body.record.type).toBe('lab');
    userARecordId = res.body.record.id;

    // Create User B record
    const resB = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        type: 'prescription',
        title: 'Amoxicillin 500mg',
        description: 'Take 1 capsule 3x daily with food',
        date: '2026-09-02',
      });
    expect(resB.status).toBe(201);
    userBRecordId = resB.body.record.id;
  });

  // STEP 3: Multi-User Record Isolation (Strict IDOR Verification)
  it('E2E-03: User B CANNOT read, list, or delete User A records', async () => {
    // User B tries to read User A record
    const readAttempt = await request(app)
      .get(`/records/${userARecordId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(readAttempt.status).toBe(404);

    // User B lists records -> must only see User B record
    const listRes = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listRes.status).toBe(200);
    const recordIds = listRes.body.records.map((r) => r.id);
    expect(recordIds).toContain(userBRecordId);
    expect(recordIds).not.toContain(userARecordId);

    // User B tries to delete User A record
    const deleteAttempt = await request(app)
      .delete(`/records/${userARecordId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(deleteAttempt.status).toBe(404);

    // Verify User A record is still intact
    const verifyA = await request(app)
      .get(`/records/${userARecordId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(verifyA.status).toBe(200);
  });

  // STEP 4: Doctor QR Sharing & Scoped Record Resolution
  it('E2E-04: User A creates doctor share session; doctor unauthenticated view succeeds; User B cannot tamper', async () => {
    // User A creates share for lab records only
    const shareRes = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        ttlMinutes: 30,
        allowedTypes: ['lab'],
        recordIds: [userARecordId],
      });

    expect(shareRes.status).toBe(201);
    expect(shareRes.body).toHaveProperty('token');
    userAShareToken = shareRes.body.token;

    // Doctor (unauthenticated) scans QR code
    const docScan = await request(app).get(`/share/${userAShareToken}`);
    expect(docScan.status).toBe(200);
    expect(docScan.body.records.length).toBe(1);
    expect(docScan.body.records[0].id).toBe(userARecordId);
    expect(docScan.body.records[0].title).toBe('Comprehensive Metabolic Panel');

    // List shares as User A
    const listShares = await request(app)
      .get('/share')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(listShares.status).toBe(200);
    userAShareId = listShares.body.shares[0].id;

    // User B attempts to revoke User A share
    const revokeAttempt = await request(app)
      .delete(`/share/${userAShareId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(revokeAttempt.status).toBe(404);

    // User A revokes own share
    const revokeRes = await request(app)
      .delete(`/share/${userAShareId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(revokeRes.status).toBe(204);

    // Subsequent doctor scan fails
    const postRevokeScan = await request(app).get(`/share/${userAShareToken}`);
    expect(postRevokeScan.status).toBe(404);
  });

  // STEP 5: Storage Upload & Download Path Isolation
  it('E2E-05: Storage upload generates user-prefixed paths; cross-user download is denied (403)', async () => {
    // User A requests upload URL
    const uploadRes = await request(app)
      .post('/storage/upload-url')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        bucket: 'medical-records',
        fileName: 'prescription_scan.png',
        fileType: 'image/png',
      });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.path.startsWith(`${userAId}/`)).toBe(true);
    const userAFilePath = uploadRes.body.path;

    // User B attempts to get download URL for User A file path -> 403 Forbidden
    const downloadB = await request(app)
      .get(`/storage/download-url?bucket=medical-records&filePath=${encodeURIComponent(userAFilePath)}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(downloadB.status).toBe(403);

    // User A gets download URL for own file path -> 200 OK
    const downloadA = await request(app)
      .get(`/storage/download-url?bucket=medical-records&filePath=${encodeURIComponent(userAFilePath)}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(downloadA.status).toBe(200);
    expect(downloadA.body).toHaveProperty('downloadUrl');
  });

  // STEP 6: Emergency Medical ID & Demographics Update
  it('E2E-06: User A updates demographics & Emergency Medical ID with notification generation', async () => {
    const updateRes = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        bloodType: 'O+',
        allergies: 'Penicillin, Sulfa',
        emergencyContactName: 'Dr. Sarah Connor',
        emergencyContactPhone: '+1-555-0199',
        emergencyContactRelationship: 'Spouse',
        organDonor: true,
        height: '175 cm',
        weight: '70 kg',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.profile.bloodType).toBe('O+');
    expect(updateRes.body.profile.allergies).toBe('Penicillin, Sulfa');
    expect(updateRes.body.profile.organDonor).toBe(true);
    expect(updateRes.body.profile.height).toBe('175 cm');
    expect(updateRes.body.profile.weight).toBe('70 kg');

    // Check that notifications were emitted for record_added, share_created, emergency_updated
    const notifs = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(notifs.status).toBe(200);
    const types = notifs.body.notifications.map((n) => n.type);
    expect(types).toContain('record_added');
    expect(types).toContain('share_created');
    expect(types).toContain('emergency_updated');
  });

  // STEP 7: Cascade Account Deletion
  it('E2E-07: User A deletes account; cascades removal of records, shares, and notifications', async () => {
    const delRes = await request(app)
      .delete('/profile')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(delRes.status).toBe(204);

    // Verify User A profile is gone (unauthenticated/not found)
    const checkUser = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${userAToken}`);
    expect([401, 404]).toContain(checkUser.status);

    // Verify associated records were cascaded in database
    const { rows: orphanedRecords } = await pool.query(
      `SELECT id FROM public.medical_records WHERE user_id = $1`,
      [userAId]
    );
    expect(orphanedRecords.length).toBe(0);

    // Verify associated shares were cascaded
    const { rows: orphanedShares } = await pool.query(
      `SELECT id FROM public.shared_access WHERE user_id = $1`,
      [userAId]
    );
    expect(orphanedShares.length).toBe(0);
  });
});
