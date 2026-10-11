import { createContext, useContext } from 'react';
export const OrganizerContext = createContext(null);
export const useDaymargin = () => useContext(OrganizerContext);
