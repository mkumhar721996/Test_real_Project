import { fireEvent, render, screen, within } from '@testing-library/react';
import { DeleteDefectButton } from './DeleteDefectButton';

test('deletes the defect and its comments when an Admin confirms', () => {
  const onDeleted = jest.fn();
  render(
    <DeleteDefectButton
      defectId="DEF-1"
      defects={[{ id: 'DEF-1', status: 'Open' }]}
      comments={[{ id: 'C-1', defectId: 'DEF-1' }]}
      role="Admin"
      onDeleted={onDeleted}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /delete permanently/i }));
  expect(onDeleted).toHaveBeenCalledWith({ defects: [], comments: [] });
});

test.each(['Reporter', 'Developer'] as const)(
  'rejects deletion attempted by a %s without deleting anything',
  (role) => {
    const onDeleted = jest.fn();
    render(
      <DeleteDefectButton
        defectId="DEF-1"
        defects={[{ id: 'DEF-1', status: 'Open' }]}
        comments={[]}
        role={role}
        onDeleted={onDeleted}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/only admins can permanently delete/i);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }
);

test('forcing a click on the aria-disabled restricted trigger still blocks deletion', () => {
  const onDeleted = jest.fn();
  render(
    <DeleteDefectButton
      defectId="DEF-1"
      defects={[{ id: 'DEF-1', status: 'Open' }]}
      comments={[]}
      role="Developer"
      onDeleted={onDeleted}
    />
  );
  const trigger = screen.getByRole('button', { name: /delete permanently/i });
  expect(trigger).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(trigger);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onDeleted).not.toHaveBeenCalled();
});

test('keyboard activation (Enter) of the restricted trigger does not delete', () => {
  const onDeleted = jest.fn();
  render(
    <DeleteDefectButton
      defectId="DEF-1"
      defects={[{ id: 'DEF-1', status: 'Open' }]}
      comments={[]}
      role="Reporter"
      onDeleted={onDeleted}
    />
  );
  const trigger = screen.getByRole('button', { name: /delete permanently/i });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
  expect(onDeleted).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('does not delete the defect when the Admin cancels the confirmation', () => {
  const onDeleted = jest.fn();
  render(
    <DeleteDefectButton
      defectId="DEF-1"
      defects={[{ id: 'DEF-1', status: 'Open' }]}
      comments={[]}
      role="Admin"
      onDeleted={onDeleted}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
  expect(onDeleted).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
