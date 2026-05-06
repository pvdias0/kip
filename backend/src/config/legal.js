export const TERMS_OF_SERVICE_VERSION = "2026-05-06";
export const PRIVACY_POLICY_VERSION = "2026-05-06";

export function hasAcceptedCurrentLegalDocuments(user) {
  return Boolean(
    user?.terms_of_service_accepted_at &&
      user?.privacy_policy_accepted_at &&
      user?.terms_of_service_version === TERMS_OF_SERVICE_VERSION &&
      user?.privacy_policy_version === PRIVACY_POLICY_VERSION,
  );
}
