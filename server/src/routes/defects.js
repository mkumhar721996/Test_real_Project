import { Router } from 'express';
import { createDefect } from '../services/defectService.js';

export const defectsRouter = Router();

defectsRouter.post('/', (req, res) => {
  try {
    const defect = createDefect(req.body);
    res.status(201).json(defect);
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ errors: error.errors });
      return;
    }
    throw error;
  }
});
