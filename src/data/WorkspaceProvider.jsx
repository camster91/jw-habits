import { useEffect, useState } from 'react';
import { createWorkspaceClient } from './workspaceClient.js';
import { WorkspaceContext } from './useWorkspace.js';
import { emptyWorkspace } from '../domain/workspace.js';

export default function WorkspaceProvider({ children }) {
  const [client] = useState(createWorkspaceClient);
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    client
      .load()
      .then((value) => {
        if (active) {
          setWorkspace(value);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [client]);
  const save = async (change, beforeWrite) => {
    try {
      const value = await client.save(change, beforeWrite);
      setWorkspace(value);
      setError('');
      return value;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  return (
    <WorkspaceContext.Provider
      value={{ workspace, save, error, ready, rawExport: () => client.rawExport() }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
