import { render, screen, within } from '@testing-library/react';
import { DefectRecord } from '../domain/summary';
import { SummaryDashboard } from './SummaryDashboard';

test('shows open and closed defect counts', async () => {
  render(
    <SummaryDashboard
      role="Admin"
      currentUserId="user-1"
      loadDefects={() =>
        Promise.resolve([
          { title: 'A', status: 'Open', createdAt: '2026-09-18' },
          { title: 'B', status: 'Closed', createdAt: '2026-09-19' },
        ])
      }
    />
  );
  expect(await screen.findByText(/open:\s*1/i)).toBeInTheDocument();
  expect(screen.getByText(/closed:\s*1/i)).toBeInTheDocument();
});

test('renders daily trend points with no granularity control', async () => {
  render(
    <SummaryDashboard
      role="Admin"
      currentUserId="user-1"
      loadDefects={() =>
        Promise.resolve([
          { title: 'A', status: 'Open', createdAt: '2026-09-18' },
          { title: 'B', status: 'Closed', createdAt: '2026-09-18' },
        ])
      }
    />
  );
  const trend = await screen.findByLabelText(/defect trend/i);
  expect(within(trend).getByText(/2026-09-18:\s*2/)).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: /granularity/i })).not.toBeInTheDocument();
});

test('shows a loading indicator while defects are in flight', () => {
  const loadDefects = () => new Promise<DefectRecord[]>(() => {});
  render(<SummaryDashboard role="Admin" currentUserId="user-1" loadDefects={loadDefects} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('shows zero counts when there are no defects', async () => {
  render(
    <SummaryDashboard role="Admin" currentUserId="user-1" loadDefects={() => Promise.resolve([])} />
  );
  expect(await screen.findByText(/open:\s*0/i)).toBeInTheDocument();
  expect(screen.getByText(/closed:\s*0/i)).toBeInTheDocument();
});

test('shows an empty state for the trend chart when there are no defects', async () => {
  render(
    <SummaryDashboard role="Admin" currentUserId="user-1" loadDefects={() => Promise.resolve([])} />
  );
  expect(await screen.findByText(/no defect activity to show yet/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/defect trend/i)).not.toBeInTheDocument();
});

test('shows an error message when loading defects fails', async () => {
  render(
    <SummaryDashboard
      role="Admin"
      currentUserId="user-1"
      loadDefects={() => Promise.reject(new Error('network error'))}
    />
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load defect summary/i);
});

test('restricts counts and trend to defects visible to a non-Admin role', async () => {
  const defects: DefectRecord[] = [
    { title: 'Mine', assigneeId: 'user-1', status: 'Open', createdAt: '2026-09-18' },
    { title: 'Not mine', assigneeId: 'user-2', status: 'Closed', createdAt: '2026-09-18' },
  ];
  render(
    <SummaryDashboard
      role="Developer"
      currentUserId="user-1"
      loadDefects={() => Promise.resolve(defects)}
    />
  );
  expect(await screen.findByText(/open:\s*1/i)).toBeInTheDocument();
  expect(screen.getByText(/closed:\s*0/i)).toBeInTheDocument();
  const trend = screen.getByLabelText(/defect trend/i);
  expect(within(trend).getByText(/2026-09-18:\s*1/)).toBeInTheDocument();
  expect(within(trend).queryByText(/2026-09-18:\s*2/)).not.toBeInTheDocument();
});

test('includes defects a non-Admin reported even when unassigned', async () => {
  const defects: DefectRecord[] = [
    { title: 'Reported by me', reporterId: 'user-1', status: 'Open', createdAt: '2026-09-18' },
    { title: 'Reported by someone else', reporterId: 'user-2', status: 'Open', createdAt: '2026-09-18' },
  ];
  render(
    <SummaryDashboard
      role="Reporter"
      currentUserId="user-1"
      loadDefects={() => Promise.resolve(defects)}
    />
  );
  expect(await screen.findByText(/open:\s*1/i)).toBeInTheDocument();
  expect(screen.getByText(/closed:\s*0/i)).toBeInTheDocument();
});
