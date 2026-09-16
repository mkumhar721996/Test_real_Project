import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteDefectButtonController } from '../src/frontend/DeleteDefectButton.ts';

test('AC5: does not delete the defect when the admin cancels the confirmation', () => {
  let deleteCalls = 0;
  const controller = new DeleteDefectButtonController({ onDelete: () => { deleteCalls += 1; } });

  controller.clickDelete();
  controller.cancel();

  assert.equal(deleteCalls, 0);
});

test('AC5: deletes the defect when the admin confirms', () => {
  let deleteCalls = 0;
  const controller = new DeleteDefectButtonController({ onDelete: () => { deleteCalls += 1; } });

  controller.clickDelete();
  controller.confirm();

  assert.equal(deleteCalls, 1);
});
