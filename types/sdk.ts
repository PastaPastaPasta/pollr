/**
 * Type definitions for Dash Platform SDK responses and document structures.
 */

export interface BaseDocument {
  $id: string;
  $ownerId: string;
  $createdAt: number;
  $updatedAt?: number;
  $revision?: number;
}

export interface DocumentWithData<T = Record<string, unknown>> extends BaseDocument {
  data?: T;
}

export interface SDKDocument {
  $id?: string;
  $ownerId?: string;
  $createdAt?: number;
  $updatedAt?: number;
  $revision?: number;
  id?: string;
  ownerId?: string;
  createdAt?: number;
  updatedAt?: number;
  revision?: number;
  data?: Record<string, unknown>;
  toJSON?: () => Record<string, unknown>;
}

export type SDKQueryResponse =
  | Map<unknown, SDKDocument>
  | SDKDocument[]
  | { documents: SDKDocument[] }
  | SDKDocument;

export interface StateTransitionResult {
  success: boolean;
  transactionHash?: string;
  document?: SDKDocument;
  error?: string;
}

export interface SDKCreateResult {
  document?: SDKDocument;
  stateTransition?: {
    $id?: string;
  };
  transitionId?: string;
}

export interface SDKReplaceResult {
  document?: SDKDocument;
  stateTransition?: {
    $id?: string;
  };
  transitionId?: string;
}

export interface SDKDeleteResult {
  stateTransition?: {
    $id?: string;
  };
  transitionId?: string;
}

export interface IdentityPublicKey {
  id: number;
  type: number;
  purpose: number;
  securityLevel: number;
  data?: Uint8Array;
  readOnly?: boolean;
  signature?: Uint8Array;
}

export interface IdentityInfo {
  id: string;
  balance: number;
  publicKeys: IdentityPublicKey[];
}

export interface IdentityBalance {
  confirmed: number;
  pending?: number;
}

export interface DPNSDomainDocument extends BaseDocument {
  label: string;
  normalizedLabel: string;
  normalizedParentDomainName: string;
  records: {
    identity?: Uint8Array | string;
  };
}

export function hasToJSON(value: unknown): value is { toJSON: () => Record<string, unknown> } {
  return typeof value === 'object' && value !== null && 'toJSON' in value && typeof (value as { toJSON: unknown }).toJSON === 'function';
}

export function isMapResponse(response: unknown): response is Map<unknown, SDKDocument> {
  return response instanceof Map;
}

export function hasDocumentsProperty(response: unknown): response is { documents: SDKDocument[] } {
  return typeof response === 'object' && response !== null && 'documents' in response && Array.isArray((response as { documents: unknown }).documents);
}
