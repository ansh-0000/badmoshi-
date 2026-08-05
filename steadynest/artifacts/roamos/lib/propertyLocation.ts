export const MAX_PROPERTY_LOCATION_INPUT_LENGTH = 500;

const MIN_ADDRESS_LENGTH = 3;
const GOOGLE_MAPS_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
]);

export type LocationInputKind =
  | 'address'
  | 'google_maps_url'
  | 'unsupported_url'
  | 'empty';

export type LocationResolutionStatus = 'unverified' | 'resolved' | 'failed';

export type ResolvedPropertyLocation = {
  formattedAddress: string;
  placeId?: string;
  latitude: number;
  longitude: number;
};

export type PropertyLocationDraft = {
  rawInput: string;
  inputKind?: Extract<LocationInputKind, 'address' | 'google_maps_url'>;
  displayText: string;
  resolutionStatus: LocationResolutionStatus;
  formattedAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  previousResolvedLocation?: ResolvedPropertyLocation;
};

export type PropertyLocationInputState = {
  kind: LocationInputKind;
  isValid: boolean;
  canContinue: boolean;
  error: string | null;
};

/**
 * This deliberately accepts only complete, parsed hostnames. In particular,
 * `google.com.attacker.example` is not a Google Maps hostname.
 */
function isAllowedGoogleMapsHostname(hostname: string): boolean {
  return GOOGLE_MAPS_HOSTS.has(hostname.toLowerCase().replace(/\.$/, ''));
}

function looksLikeUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || /^www\./i.test(value);
}

function parseHttpUrl(value: string): URL | null {
  try {
    const candidate = /^www\./i.test(value) ? `https://${value}` : value;
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null;
  }
}

export function classifyLocationInput(rawInput: string): LocationInputKind {
  const value = rawInput.trim();
  if (!value) return 'empty';

  if (!looksLikeUrl(value)) return 'address';

  const parsed = parseHttpUrl(value);
  if (!parsed) return 'unsupported_url';

  return isAllowedGoogleMapsHostname(parsed.hostname)
    ? 'google_maps_url'
    : 'unsupported_url';
}

export function getPropertyLocationInputState(rawInput: string): PropertyLocationInputState {
  const value = rawInput.trim();
  const kind = classifyLocationInput(value);

  if (kind === 'empty') {
    return { kind, isValid: false, canContinue: false, error: null };
  }

  if (value.length > MAX_PROPERTY_LOCATION_INPUT_LENGTH) {
    return {
      kind,
      isValid: false,
      canContinue: false,
      error: 'Enter a building, street, locality or Google Maps link.',
    };
  }

  if (kind === 'unsupported_url') {
    return {
      kind,
      isValid: false,
      canContinue: false,
      error: 'Use a Google Maps link or type the address instead.',
    };
  }

  if (kind === 'address' && value.length < MIN_ADDRESS_LENGTH) {
    return {
      kind,
      isValid: false,
      canContinue: false,
      error: 'Enter a building, street, locality or Google Maps link.',
    };
  }

  return { kind, isValid: true, canContinue: true, error: null };
}

function acceptedInputKind(kind: LocationInputKind): PropertyLocationDraft['inputKind'] {
  return kind === 'address' || kind === 'google_maps_url' ? kind : undefined;
}

export function createUnverifiedPropertyLocationDraft(rawInput: string): PropertyLocationDraft {
  const displayText = rawInput.trim();
  const inputState = getPropertyLocationInputState(displayText);

  return {
    rawInput: displayText,
    inputKind: acceptedInputKind(inputState.kind),
    displayText,
    // No provider is contacted in this phase, so even a syntactically valid
    // address or Maps link remains unverified until a future API resolves it.
    resolutionStatus: 'unverified',
  };
}

export function createResolvedPropertyLocationDraft(
  location: ResolvedPropertyLocation,
): PropertyLocationDraft {
  return {
    rawInput: location.formattedAddress,
    inputKind: 'address',
    displayText: location.formattedAddress,
    resolutionStatus: 'resolved',
    ...location,
  };
}

/**
 * Keeps an already-resolved position available to a future edit flow. A new
 * address or Maps link is unverified until the API resolver succeeds, so it
 * cannot overwrite the property's existing map position just by being typed.
 */
export function replacePropertyLocationInput(
  previous: PropertyLocationDraft,
  rawInput: string,
): PropertyLocationDraft {
  if (rawInput.trim() === previous.rawInput) return previous;

  const replacement = createUnverifiedPropertyLocationDraft(rawInput);
  if (
    previous.resolutionStatus !== 'resolved' ||
    typeof previous.latitude !== 'number' ||
    typeof previous.longitude !== 'number' ||
    !previous.formattedAddress
  ) {
    return replacement;
  }

  return {
    ...replacement,
    previousResolvedLocation: {
      formattedAddress: previous.formattedAddress,
      placeId: previous.placeId,
      latitude: previous.latitude,
      longitude: previous.longitude,
    },
  };
}

export function canPublishWithResolvedPropertyLocation(
  location: PropertyLocationDraft,
): boolean {
  return (
    location.resolutionStatus === 'resolved' &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

/**
 * Future API-only seam (intentionally not invoked in this no-provider phase):
 *
 * POST /api/geo/resolve-location
 * { input: string }
 *
 * A future authenticated API response may be `resolved`, `needs_selection`,
 * or `not_found`. Only a `resolved` response may populate latitude and
 * longitude above. The mobile client must never call a map provider directly.
 */
export type FutureLocationResolutionResponse =
  | {
      status: 'resolved';
      formattedAddress: string;
      placeId: string;
      latitude: number;
      longitude: number;
      locality?: string;
      city?: string;
      postalCode?: string;
    }
  | {
      status: 'needs_selection';
      results: Array<{ formattedAddress: string; placeId: string }>;
    }
  | { status: 'not_found'; message: string };
