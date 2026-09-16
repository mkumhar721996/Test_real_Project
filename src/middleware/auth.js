import * as userRepository from '../repositories/userRepository.js';

/**
 * Resolves the authenticated user from trusted request headers.
 * This is a stand-in for real authentication (login/session/tokens),
 * which is out of scope for this story.
 * @param {import('http').IncomingMessage} req
 * @returns {import('../domain/user.js').User | null}
 */
export function resolveUser(req) {
  const userId = req.headers['x-user-id'];
  if (!userId || Array.isArray(userId)) {
    return null;
  }
  return userRepository.findById(userId);
}
