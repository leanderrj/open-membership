package shared

import (
	"encoding/json"
	"time"
)

const (
	SpecVersion   = "1.0"
	ProfileURI    = "https://purl.org/rss/modules/membership/portability/v1"
	CredentialsV2 = "https://www.w3.org/ns/credentials/v2"
	TypeExport    = "OMMembershipExport"

	AuthURLToken = "url-token"
	AuthBearer   = "bearer"
	AuthDPoP     = "dpop"
	AuthVC       = "vc-presentation"

	CredBearer = "bearer_token"
	CredDPoP   = "dpop_bound_token"
	CredOMVC   = "OM-VC"
	CredOMVCSD = "OM-VC-SD"

	EnvelopePlain = "plain"
	EnvelopeAge   = "age"
	EnvelopeJWE   = "jwe"

	PrivacyPublic                = ""
	PrivacyPseudonymous          = "pseudonymous"
	PrivacyPseudonymousRequired  = "pseudonymous-required"
)

type Export struct {
	Context      []string      `json:"@context"`
	Type         string        `json:"type"`
	SpecVersion  string        `json:"spec_version"`
	ExportedAt   time.Time     `json:"exported_at"`
	ExportedBy   ExportedBy    `json:"exported_by"`
	Subject      Subject       `json:"subject"`
	Memberships  []Membership  `json:"memberships"`
	Bundles      []Bundle      `json:"bundles,omitempty"`
	GiftsPending []PendingGift `json:"gifts_pending,omitempty"`
	Integrity    Integrity     `json:"integrity"`
}

type ExportedBy struct {
	Reader           string `json:"reader"`
	ReaderVersion    string `json:"reader_version"`
	ReaderInstanceID string `json:"reader_instance_id"`
}

type Subject struct {
	LocalID     string `json:"local_id"`
	DisplayName string `json:"display_name,omitempty"`
}

type Membership struct {
	Provider     string          `json:"provider"`
	Discovery    string          `json:"discovery"`
	FeedURL      string          `json:"feed_url"`
	AuthMethod   string          `json:"auth_method"`
	PrivacyMode  string          `json:"privacy_mode,omitempty"`
	AddedAt      time.Time       `json:"added_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	Entitlements *Entitlements   `json:"entitlements,omitempty"`
	Credential   json.RawMessage `json:"credential,omitempty"`
}

type Entitlements struct {
	Tiers      []string  `json:"tiers,omitempty"`
	Features   []string  `json:"features,omitempty"`
	ValidUntil time.Time `json:"valid_until,omitempty"`
}

type BearerCredential struct {
	Type          string    `json:"type"`
	AccessToken   string    `json:"access_token"`
	RefreshToken  string    `json:"refresh_token,omitempty"`
	ExpiresAt     time.Time `json:"expires_at"`
	TokenEndpoint string    `json:"token_endpoint"`
}

type JWK struct {
	Kty string `json:"kty"`
	Crv string `json:"crv,omitempty"`
	D   string `json:"d,omitempty"`
	X   string `json:"x,omitempty"`
	Y   string `json:"y,omitempty"`
}

type DPoPCredential struct {
	Type                    string `json:"type"`
	AccessToken             string `json:"access_token"`
	DPoPPrivateKeyJWK       JWK    `json:"dpop_private_key_jwk"`
	DPoPPublicKeyThumbprint string `json:"dpop_public_key_thumbprint"`
}

type OMVCCredential struct {
	Type             string          `json:"type"`
	Profile          string          `json:"profile,omitempty"`
	CredentialJSONLD json.RawMessage `json:"credential_jsonld"`
	HolderKeyJWK     JWK             `json:"holder_key_jwk"`
	StatusListURL    string          `json:"status_list_url,omitempty"`
}

type OMVCSDCredential struct {
	Type                  string            `json:"type"`
	Profile               string            `json:"profile,omitempty"`
	CredentialJSONLD      json.RawMessage   `json:"credential_jsonld"`
	HolderSecretJWK       JWK               `json:"holder_secret_jwk"`
	PerPublisherPseudonyms map[string]string `json:"per_publisher_pseudonyms"`
}

type Bundle struct {
	Aggregator string          `json:"aggregator"`
	BundleID   string          `json:"bundle_id"`
	Audience   []string        `json:"audience"`
	Credential json.RawMessage `json:"credential"`
	AddedAt    time.Time       `json:"added_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

type PendingGift struct {
	RedemptionURL   string    `json:"redemption_url"`
	RedemptionToken string    `json:"redemption_token"`
	OfferReference  string    `json:"offer_reference,omitempty"`
	GiftMessage     string    `json:"gift_message,omitempty"`
	ReceivedAt      time.Time `json:"received_at"`
	ExpiresAt       time.Time `json:"expires_at,omitempty"`
}

type Integrity struct {
	Checksum  Checksum   `json:"checksum"`
	Signature *Signature `json:"signature,omitempty"`
}

type Checksum struct {
	Alg            string `json:"alg"`
	Canonicalization string `json:"canonicalization"`
	Value          string `json:"value"`
}

type Signature struct {
	Alg                string `json:"alg"`
	PublicKeyMultibase string `json:"publicKeyMultibase"`
	SignatureValue     string `json:"signatureValue"`
}

func DefaultContext() []string {
	return []string{CredentialsV2, ProfileURI}
}

func ContainsSensitive(e *Export) bool {
	for _, m := range e.Memberships {
		if m.AuthMethod != AuthURLToken {
			return true
		}
	}
	if len(e.Bundles) > 0 {
		return true
	}
	return false
}
