import type { Context } from 'react';

export declare const DrawerContext: Context<any>;

export declare function useDrawer(): { toggle: () => void; close: () => void };
