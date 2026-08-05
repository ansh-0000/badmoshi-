import {
  MAX_PROPERTY_LOCATION_INPUT_LENGTH,
  canPublishWithResolvedPropertyLocation,
  classifyLocationInput,
  createResolvedPropertyLocationDraft,
  getPropertyLocationInputState,
  replacePropertyLocationInput,
} from './propertyLocation';

function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function truthy(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

test('classifies a Delhi NCR address', () => {
  equal(classifyLocationInput('D-12, Saket, New Delhi'), 'address', 'Address classification');
});

test('recognises a full Google Maps URL', () => {
  equal(
    classifyLocationInput('https://www.google.com/maps/place/Saket'),
    'google_maps_url',
    'Google Maps URL classification',
  );
});

test('recognises a Google Maps short link', () => {
  equal(
    classifyLocationInput('https://maps.app.goo.gl/example'),
    'google_maps_url',
    'Google Maps short link classification',
  );
});

test('recognises uppercase hostnames and query parameters', () => {
  equal(
    classifyLocationInput('  HTTPS://MAPS.GOOGLE.COM/maps?q=Saket  '),
    'google_maps_url',
    'Uppercase hostname classification',
  );
});

test('rejects an unsupported URL', () => {
  equal(
    classifyLocationInput('https://example.com/property'),
    'unsupported_url',
    'Unsupported URL classification',
  );
});

test('rejects a malicious Google lookalike', () => {
  equal(
    classifyLocationInput('https://google.com.attacker.example/maps/place/test'),
    'unsupported_url',
    'Lookalike hostname classification',
  );
});

test('handles empty whitespace and malformed URL-like input', () => {
  equal(classifyLocationInput('   '), 'empty', 'Whitespace classification');
  equal(classifyLocationInput('https://'), 'unsupported_url', 'Malformed URL classification');
});

test('blocks an empty or too-long input from continuing', () => {
  equal(getPropertyLocationInputState('   ').canContinue, false, 'Empty Continue state');
  const longInput = 'A'.repeat(MAX_PROPERTY_LOCATION_INPUT_LENGTH + 1);
  equal(getPropertyLocationInputState(longInput).canContinue, false, 'Long Continue state');
});

test('preserves an existing resolved location while replacement waits for verification', () => {
  const resolved = createResolvedPropertyLocationDraft({
    formattedAddress: 'D-12, Saket, New Delhi',
    placeId: 'existing-place',
    latitude: 28.5244,
    longitude: 77.2066,
  });
  const replacement = replacePropertyLocationInput(resolved, 'Near Hauz Khas Metro Station');

  equal(replacement.resolutionStatus, 'unverified', 'Replacement status');
  equal(replacement.latitude, undefined, 'Replacement must not gain coordinates');
  equal(replacement.previousResolvedLocation?.latitude, 28.5244, 'Previous latitude preservation');
  equal(replacement.previousResolvedLocation?.longitude, 77.2066, 'Previous longitude preservation');
  equal(canPublishWithResolvedPropertyLocation(replacement), false, 'Unverified publish block');
  truthy(canPublishWithResolvedPropertyLocation(resolved), 'Resolved location should be publishable');
});
