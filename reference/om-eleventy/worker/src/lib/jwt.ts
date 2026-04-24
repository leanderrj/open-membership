import jwt from "@tsndr/cloudflare-worker-jwt";
import type { EntitlementView } from "../types.js";

export interface OmJwtPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  tier_id: string;
  entitlements: string[];
}

export interface SignInput {
  signingKey: string;
  issuer: string;
  audience: string;
  subject: string;
  lifetimeSeconds: number;
  entitlement: EntitlementView;
  now?: number;
}

export async function signOmJwt(input: SignInput): Promise<string> {
  const nowSec = Math.floor((input.now ?? Date.now()) / 1000);
  const payload: OmJwtPayload = {
    iss: input.issuer,
    sub: input.subject,
    aud: input.audience,
    iat: nowSec,
    exp: nowSec + input.lifetimeSeconds,
    tier_id: input.entitlement.tier_id,
    entitlements: input.entitlement.features,
  };
  return jwt.sign(payload, input.signingKey, { algorithm: "HS256" });
}

export interface VerifyInput {
  signingKey: string;
  issuer: string;
  audience: string;
  token: string;
  now?: number;
}

export async function verifyOmJwt(
  input: VerifyInput,
): Promise<OmJwtPayload | null> {
  const isValid = await jwt.verify(input.token, input.signingKey, {
    algorithm: "HS256",
  });
  if (!isValid) return null;

  const decoded = jwt.decode<OmJwtPayload>(input.token);
  const payload = decoded.payload;
  if (!payload) return null;

  const nowSec = Math.floor((input.now ?? Date.now()) / 1000);
  if (payload.exp <= nowSec) return null;
  if (payload.iss !== input.issuer) return null;
  if (payload.aud !== input.audience) return null;
  return payload;
}
