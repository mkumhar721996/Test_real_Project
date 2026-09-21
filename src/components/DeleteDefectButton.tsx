import { KeyboardEvent, MouseEvent, useState } from 'react';
import { Role } from '../domain/roles';
import { DeletableComment, DeletableDefect, deleteDefect } from '../domain/deleteDefect';

export interface DeleteDefectButtonProps {
  defectId: string;
  defectTitle?: string;
  defects: DeletableDefect[];
  comments: DeletableComment[];
  role: Role;
  variant?: 'icon' | 'button';
  onDeleted: (result: { defects: DeletableDefect[]; comments: DeletableComment[] }) => void;
}

const DENIAL_MESSAGE = '🔒 Only Admins can permanently delete defects.';

export function DeleteDefectButton({
  defectId,
  defectTitle,
  defects,
  comments,
  role,
  variant = 'button',
  onDeleted,
}: DeleteDefectButtonProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [denialMessage, setDenialMessage] = useState<string | null>(null);

  const isAdmin = role === 'Admin';
  const commentCount = comments.filter((comment) => comment.defectId === defectId).length;

  function activate() {
    if (!isAdmin) {
      setDenialMessage(DENIAL_MESSAGE);
      return;
    }
    setDenialMessage(null);
    setIsModalOpen(true);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    activate();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      activate();
    }
  }

  function handleCancel() {
    setIsModalOpen(false);
  }

  function handleConfirm() {
    const result = deleteDefect(defects, comments, defectId, role);
    setIsModalOpen(false);
    onDeleted(result);
  }

  const triggerClassName =
    variant === 'icon' ? 'btn-icon' : isAdmin ? 'btn-danger' : 'btn-restricted';

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          className={triggerClassName}
          aria-label={isAdmin ? `Delete ${defectId} permanently` : 'Delete unavailable — Admins only'}
          aria-disabled={isAdmin ? undefined : 'true'}
          title={isAdmin ? undefined : 'Only Admins can delete defects'}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {isAdmin ? '🗑' : '🔒'}
        </button>
      ) : (
        <button
          type="button"
          className={triggerClassName}
          aria-disabled={isAdmin ? undefined : 'true'}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {isAdmin ? '🗑 Delete permanently' : '🔒 Delete permanently'}
        </button>
      )}

      {denialMessage && <p role="status">{denialMessage}</p>}

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-defect-modal-title"
        >
          <div className="modal-card">
            <h2 id="delete-defect-modal-title">Delete {defectId} permanently?</h2>
            <p>
              {defectTitle
                ? `"${defectTitle}" will be permanently removed.`
                : 'This defect will be permanently removed.'}{' '}
              This can&apos;t be undone.
            </p>
            <div className="modal-consequence">
              This will also permanently delete all {commentCount} comment
              {commentCount === 1 ? '' : 's'} on this defect.
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleConfirm}>
                🗑 Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
