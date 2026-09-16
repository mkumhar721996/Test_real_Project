import express from 'express';
import cors from 'cors';
import { defectsRouter } from './routes/defects.js';

export const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/defects', defectsRouter);
