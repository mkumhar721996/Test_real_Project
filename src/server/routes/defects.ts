import { Router } from 'express';
import { visibleDefectsFor } from '../domain/defectVisibility';
import { applyDefectFilters } from '../domain/defectFilters';
import { defectsStore } from '../data/defectsStore';
import { AuthenticatedRequest } from '../middleware/authStub';
import { DefectFilters } from '../../shared/types/defect';

export const defectsRouter = Router();

defectsRouter.get('/api/defects', (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'unauthenticated' });

  const filters: DefectFilters = {
    status: req.query.status as DefectFilters['status'],
    severity: req.query.severity as DefectFilters['severity'],
    assignee: req.query.assignee as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };

  const visible = visibleDefectsFor(user, defectsStore.all());
  res.json(applyDefectFilters(visible, filters));
});
