# Hackathon Submission Checklist

## Rules and artifacts

- [ ] Confirm track is Indie Developer (if this matches registration) and problem statement is Build for Your World.
- [ ] Confirm current event announcements haven't changed submission time or model requirements.
- [ ] Claim the $150 Meta Model API credits; confirm credits appear in billing.
- [ ] Configure spend-limit alert and never commit the API key.
- [ ] Make repository public.
- [ ] Record a short Git log or `HACKATHON_CHANGELOG.md` showing work created during the event.
- [ ] Ensure all contributed code/assets are owned or used under a compatible license.
- [ ] Ensure any teammate/contributor is listed on submission.
- [ ] Verify deployed app and repository URLs in incognito.
- [ ] Record three-minute demo video showing specific newly built features, source/tool trace, and the live product.
- [ ] Confirm the video is accessible without special account permissions.
- [ ] Submit before Nov 4, 9:00 PM ET (Nov 5, 6:45 AM Nepal time).
- [ ] Capture submission confirmation.

## Judge-facing quality

- [x] Real Meta model use is evident and functional (OpenAI-compatible SDK integration with Muse Spark 1.3).
- [x] At least one real model-selected tool invocation is shown in the trace (`assess_option`, `compare_options`, `list_unknowns`, `simulate_sensitivity`).
- [x] Model output cannot override calculations (enforced by `validate_narrative` arithmetic bounds and Python constraint engine).
- [x] Missing inputs are represented as unknown (never silently treated as zero).
- [x] No invented probabilities or unsupported base-rate statistics (enforced by regex & verifier critique).
- [x] Scenario output is conditional and grounded in user inputs.
- [x] Report changes when an assumption is edited (interactive Sensitivity Sandbox with structured diff).
- [x] UI separates model analysis from deterministic result.
- [x] README contains setup steps, design choices, limits, and architecture diagrams.
- [x] Tests and production build pass (63/63 pytest passed, tsc + vite production build clean).

## Public release safety

- [x] No API keys/tokens in source, git history, frontend build, or demo recording.
- [x] Production CORS is restricted and configurable via `CORS_ORIGINS`.
- [x] No request bodies or sensitive model inputs in logs (sanitized exception logging).
- [x] Rate limiting is active on `/api/analyze`, `/api/recalculate`, and `/api/clarify`.
- [x] Privacy notice discloses server-side processing, token auth, GDPR data export, and total account purge.
