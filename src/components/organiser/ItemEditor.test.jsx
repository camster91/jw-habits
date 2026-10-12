/* eslint-disable no-unused-vars -- JSX harness */
import { it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OrganiserContext } from '../../data/useOrganiser.js';
import { emptyOrganiser } from '../../domain/organiser.js';
import ItemEditor from './ItemEditor.jsx';

function editor(save) {
  const onSaved = vi.fn(),
    onClose = vi.fn();
  render(
    <OrganiserContext.Provider value={{ save }}>
      <ItemEditor kind="task" date="2026-10-12" onSaved={onSaved} onClose={onClose} />
    </OrganiserContext.Provider>
  );
  fireEvent.change(screen.getByLabelText('Title', { exact: true }), {
    target: { value: 'Prepare a question' },
  });
  return { onSaved, onClose };
}

it('announces saved activity only after the durable save resolves', async () => {
  let finish, written;
  const save = vi.fn((fn) => {
    written = fn(emptyOrganiser());
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const { onSaved, onClose } = editor(save);
  fireEvent.click(screen.getByRole('button', { name: 'Save task', exact: true }));
  expect(save).toHaveBeenCalledTimes(1);
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish(written));
  expect(onSaved).toHaveBeenCalledExactlyOnceWith({ kind: 'task', id: written.tasks[0].id });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('keeps a failed-save draft without claiming a saved activity', async () => {
  const { onSaved, onClose } = editor(
    vi.fn(async () => {
      throw new Error('Storage is full');
    })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save task', exact: true }));
  expect(await screen.findByText('Storage is full', { exact: true })).toBeInTheDocument();
  expect(screen.getByLabelText('Title', { exact: true })).toHaveValue('Prepare a question');
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
