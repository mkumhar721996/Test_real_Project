import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachUser, AuthenticatedRequest } from './authStub';

function makeReq(headers: Record<string, string>): AuthenticatedRequest {
  return {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as AuthenticatedRequest;
}

describe('attachUser', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalStubFlag = process.env.STUB_AUTH_ENABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.STUB_AUTH_ENABLED = originalStubFlag;
  });

  it('attaches the user when id and a valid role header are present', () => {
    process.env.NODE_ENV = 'test';
    const req = makeReq({ 'x-user-id': 'u1', 'x-user-role': 'REPORTER' });
    const next = vi.fn();

    attachUser(req, {} as never, next);

    expect(req.user).toEqual({ id: 'u1', role: 'REPORTER' });
    expect(next).toHaveBeenCalled();
  });

  it('rejects an arbitrary, non-allowlisted role value', () => {
    process.env.NODE_ENV = 'test';
    const req = makeReq({ 'x-user-id': 'u1', 'x-user-role': 'SUPER_ADMIN' });
    const next = vi.fn();

    attachUser(req, {} as never, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('does not attach a user in production unless stub auth is explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STUB_AUTH_ENABLED;
    const req = makeReq({ 'x-user-id': 'u1', 'x-user-role': 'ADMIN' });
    const next = vi.fn();

    attachUser(req, {} as never, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('attaches the user in production when stub auth is explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.STUB_AUTH_ENABLED = 'true';
    const req = makeReq({ 'x-user-id': 'u1', 'x-user-role': 'ADMIN' });
    const next = vi.fn();

    attachUser(req, {} as never, next);

    expect(req.user).toEqual({ id: 'u1', role: 'ADMIN' });
    expect(next).toHaveBeenCalled();
  });
});
