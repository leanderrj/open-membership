import { SignJWT, jwtVerify } from "jose";
import type { OmJwtClaims } from "./types.js";

/**
 * JWT issuance and verification for om-ghost.
 *
 * HS256 symmetric signing is used intentionally for v0.1: the same sidecar
 * both issues and verifies. When a reader presents the JWT back to the
 * publisher via an `<om:unlock>` endpoint, the verifier is the same
 * process. No external audience needs the JWKs.
 *
 * When om-ghost reaches Level 4 (VC presentation) we'll switch to EdDSA
 * and publish a JWKs endpoint.
 */

const ALG = "HS256";

function keyBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

interface IssueOpts {
  issuer: string;
  audience: string;
  subject: string;
  ttlSeconds: number;
  tierId: string;
  entitlements: string[];
  subscriptionId?: string;
  pseudonym?: string;
}

export async function issueJwt(
  signingKey: string,
  opts: IssueOpts,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Omit<OmJwtClaims, "iat" | "exp"> = {
    iss: opts.issuer,
    sub: opts.subject,
    aud: opts.audience,
    tier_id: opts.tierId,
    entitlements: opts.entitlements,
    ...(opts.subscriptionId ? { subscription_id: opts.subscriptionId } : {}),
    ...(opts.pseudonym ? { pseudonym: opts.pseudonym } : {}),
  };

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + opts.ttlSeconds)
    .setIssuer(opts.issuer)
    .setSubject(opts.subject)
    .setAudience(opts.audience)
    .sign(keyBytes(signingKey));
}

export async function verifyJwt(
  signingKey: string,
  token: string,
  expectedIssuer: string,
  expectedAudience: string,
): Promise<OmJwtClaims> {
  const { payload } = await jwtVerify(token, keyBytes(signingKey), {
    issuer: expectedIssuer,
    audience: expectedAudience,
    algorithms: [ALG],
  });
  return payload as unknown as OmJwtClaims;
}
