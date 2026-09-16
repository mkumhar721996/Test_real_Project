import { resolveUser } from '../middleware/auth.js';
import * as defectRepository from '../repositories/defectRepository.js';
import { getVisibleDefects } from '../services/defectVisibility.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export function handleGetDefects(req, res) {
  const user = resolveUser(req);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const visible = getVisibleDefects(user, defectRepository.findAll());
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ defects: visible, count: visible.length }));
}
