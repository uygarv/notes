import { AuthService } from './auth.service';

describe('AuthService password resets', () => {
  const usersService = {
    findPasswordResetUser: jest.fn(),
    resetPassword: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn() };
  const redisService = {
    set: jest.fn(),
    get: jest.fn(),
    getAndDelete: jest.fn(),
    delete: jest.fn(),
  };
  const emailService = { sendPasswordResetEmail: jest.fn() };
  const service = new AuthService(usersService as never, jwtService as never, redisService as never, emailService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not send reset email for unknown accounts', async () => {
    redisService.get.mockResolvedValue(null);
    usersService.findPasswordResetUser.mockResolvedValue(null);

    await service.requestPasswordReset('missing@example.com');

    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only a hash and sends the opaque reset token', async () => {
    redisService.get.mockResolvedValue(null);
    usersService.findPasswordResetUser.mockResolvedValue({ id: 12, email: 'person@example.com', password: 'hash' });
    emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

    await service.requestPasswordReset('person@example.com');

    const [tokenKey, userId, ttl] = redisService.set.mock.calls[1];
    const token = emailService.sendPasswordResetEmail.mock.calls[0][1] as string;
    expect(tokenKey).toMatch(/^password-reset:token:[a-f0-9]{64}$/);
    expect(tokenKey).not.toContain(token);
    expect(userId).toBe('12');
    expect(ttl).toBe(15 * 60);
  });

  it('consumes a reset token before updating the password', async () => {
    redisService.getAndDelete.mockResolvedValue('12');
    usersService.resetPassword.mockResolvedValue(undefined);

    await service.resetPassword('token-from-email', 'new-password');

    expect(redisService.getAndDelete).toHaveBeenCalledWith(expect.stringMatching(/^password-reset:token:[a-f0-9]{64}$/));
    expect(usersService.resetPassword).toHaveBeenCalledWith(12, 'new-password');
  });
});
