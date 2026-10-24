describe('Unconfigured secure uploads', () => {
  const previousEnvironment = process.env;
  let storage;

  beforeEach(() => {
    process.env = { ...previousEnvironment };
    for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT']) {
      delete process.env[key];
    }
    // Keep this focused test independent of local credentials and dotenv files.
    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      storage = require('../src/config/r2');
    });
  });

  afterEach(() => {
    process.env = previousEnvironment;
    jest.dontMock('dotenv');
  });

  it.each(['development', 'production'])('should reject uploads with 503 in %s rather than return a fake URL', async (environment) => {
    process.env.NODE_ENV = environment;
    expect(storage.isR2Configured).toBe(false);
    await expect(storage.generatePresignedUploadUrl('medrec-vault', 'patient/document.jpg', 'image/jpeg'))
      .rejects.toMatchObject({ status: 503, message: expect.stringMatching(/storage is not configured/i) });
  });

  it('should preserve mock storage exclusively for backend tests', async () => {
    process.env.NODE_ENV = 'test';
    const result = await storage.generatePresignedUploadUrl('medrec-vault', 'patient/document.jpg', 'image/jpeg');
    expect(result.uploadUrl).toContain('mock.r2.cloudflarestorage.com');
    expect(result.key).toBe('patient/document.jpg');
  });
});
