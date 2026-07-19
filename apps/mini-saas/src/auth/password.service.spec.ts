import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  it('should create salted Argon2id hashes and verify passwords', async () => {
    const password = 'correct horse battery staple';
    const firstHash = await passwordService.hash(password);
    const secondHash = await passwordService.hash(password);

    expect(firstHash).toMatch(/^\$argon2id\$/);
    expect(secondHash).toMatch(/^\$argon2id\$/);
    expect(firstHash).not.toBe(secondHash);
    await expect(passwordService.verify(firstHash, password)).resolves.toBe(
      true,
    );
    await expect(
      passwordService.verify(firstHash, 'incorrect password'),
    ).resolves.toBe(false);
  });
});
