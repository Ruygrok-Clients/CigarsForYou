import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export interface ImmediateDispatchQuote {
  feeAud: number;
  approxKm: number;
}

export async function quoteImmediateDispatch(input: {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
}): Promise<ImmediateDispatchQuote> {
  const callable = httpsCallable<typeof input, ImmediateDispatchQuote>(functions, 'quoteImmediateDispatch');
  const result = await callable(input);
  const feeAud = Number(result.data.feeAud);
  const approxKm = Number(result.data.approxKm);
  if (!Number.isFinite(feeAud) || feeAud < 0 || !Number.isFinite(approxKm)) {
    throw new Error('Invalid Immediate Dispatch quote.');
  }
  return { feeAud, approxKm };
}
