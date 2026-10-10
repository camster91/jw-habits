import { createContext, useContext } from 'react';
export const OrganiserContext = createContext(null);
export const useOrganiser = () => useContext(OrganiserContext);
