import { useEffect, useState } from 'react';
import { createOrganiserClient } from './organiserClient.js';
import { OrganiserContext } from './useOrganiser.js';
import { emptyOrganiser } from '../domain/organiser.js';

export default function OrganiserProvider({ children }) {
  const [client] = useState(createOrganiserClient);
  const [organiser, setOrganiser] = useState(emptyOrganiser);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    client
      .load()
      .then((value) => {
        if (active) {
          setOrganiser(value);
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
      setOrganiser(value);
      window.dispatchEvent(new Event('faithful-organiser-changed'));
      setError('');
      return value;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  return (
    <OrganiserContext.Provider
      value={{ organiser, save, error, ready, rawExport: () => client.rawExport() }}
    >
      {children}
    </OrganiserContext.Provider>
  );
}
