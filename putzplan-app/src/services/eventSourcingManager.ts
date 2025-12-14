// Dispatcher: choose implementation based on environment (tests use disabled in-memory fallback)
import * as impl from './eventSourcingManager.impl';
import * as disabled from './eventSourcingManager.disabled';

// Guard access to `process` for browser environments where `process` is undefined
const hasProcess = typeof process !== 'undefined' && process && typeof (process as any).env !== 'undefined';
const useDisabled = !hasProcess || !!((process as any).env && ((process as any).env.VITEST || (process as any).env.NODE_ENV === 'test'));

export type ActionEvent = impl.ActionEvent;
export type StateSnapshot = impl.StateSnapshot;
export type RestorePreview = impl.RestorePreview;

export const eventSourcingManager = (useDisabled ? (disabled as any) : (impl as any)).eventSourcingManager;
export default eventSourcingManager;