import { environmentValidationSchema } from './environment.validation';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/mini_saas',
  SESSION_SECRET: 'a-secure-session-secret-with-32-characters',
  FRONTEND_ORIGIN: 'http://localhost:5173',
};

describe('environmentValidationSchema', () => {
  it('accepts valid configuration and defaults to development', () => {
    const result = environmentValidationSchema.validate(validEnvironment);

    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({ NODE_ENV: 'development' });
  });

  it('rejects a short session secret', () => {
    const result = environmentValidationSchema.validate({
      ...validEnvironment,
      SESSION_SECRET: 'short',
    });

    expect(result.error?.message).toContain(
      '"SESSION_SECRET" length must be at least 32 characters long',
    );
  });

  it('reports all missing required configuration', () => {
    const result = environmentValidationSchema.validate(
      {},
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('"DATABASE_URL" is required');
    expect(result.error?.message).toContain('"SESSION_SECRET" is required');
    expect(result.error?.message).toContain('"FRONTEND_ORIGIN" is required');
  });

  it('rejects malformed database and frontend URLs', () => {
    const result = environmentValidationSchema.validate(
      {
        ...validEnvironment,
        DATABASE_URL: 'not-a-database-url',
        FRONTEND_ORIGIN: 'not-an-origin',
      },
      { abortEarly: false },
    );

    expect(result.error?.message).toContain(
      '"DATABASE_URL" must be a valid uri',
    );
    expect(result.error?.message).toContain(
      '"FRONTEND_ORIGIN" must be a valid uri',
    );
  });
});
