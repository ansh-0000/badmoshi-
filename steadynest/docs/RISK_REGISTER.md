# Risk Register: SteadyNest

## 1. Ambiguities & Technical Risks

### A. Real-Time Connections & Offline Fallback (Phase 6)
- **Risk**: Handling socket disconnections and ensuring the local SQLite queue reliably syncs without duplicate messages when connectivity returns.
- **Mitigation**: Implement robust idempotency keys for messages and use Expo's `NetInfo` to reliably trigger queue flushes.

### B. Payment Compliance & Auto-Pay (Phase 5)
- **Risk**: Auto-charging via Stripe Connect requires careful handling of webhooks to reflect the exact state of transactions. A missed webhook could leave a balance inappropriately marked as pending.
- **Mitigation**: Implement exponential backoff retries for webhook processing. Add a cron job to actively verify pending transaction statuses directly with the Stripe API.

### C. Voice Translator Real-Time Latency (Phase 6)
- **Risk**: Combining mic capture, STT API, translation API, and TTS playback introduces latency, which could disrupt conversational flow.
- **Mitigation**: Use streaming APIs where possible and optimize the audio payload size.

## 2. Platform Constraints

### A. Emergency SOS - Background Camera & Silent Capture (Phase 8)
- **Constraint**: iOS and Android strictly prohibit entirely "invisible" camera capture. Even if off-screen, a system-level indicator (green dot / camera icon) will appear. Background capture while the app is completely backgrounded or closed is also restricted.
- **Mitigation**: The app will use a minimal/off-screen capture surface to avoid alerting someone looking at the phone screen directly, but users must be informed during onboarding that the OS-level indicator will still show. Capture will execute when the SOS trigger is initiated (app in foreground).

### B. SMS Fallback for SOS
- **Constraint**: iOS does not allow an app to send an SMS completely silently in the background without user interaction.
- **Mitigation**: The app will launch the native SMS composer pre-filled with the coordinates and emergency message. The user must tap "Send". This is noted in the spec ("fall back to the device's native SMS composer/API").

### C. Geolocation Accuracy & Battery Drain
- **Constraint**: High-accuracy GPS polling drains the battery quickly, especially if tracking background movement.
- **Mitigation**: GPS will be polled actively only during the SOS event or when explicitly updating location for maps.

### D. File System Encryption
- **Risk**: Saving sensitive camera captures locally, even temporarily, exposes them to potential extraction on rooted devices.
- **Mitigation**: Files will be aggressively deleted upon success or failure timeout.
