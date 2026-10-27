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

- [ ] Real Meta model use is evident and functional.
- [ ] At least one real model-selected tool invocation is shown in the video, if it occurred.
- [ ] Model output cannot override calculations.
- [ ] Missing inputs are represented as unknown.
- [ ] No invented probabilities or unsupported base-rate statistics.
- [ ] Scenario output is conditional and grounded in user inputs.
- [ ] Report changes when an assumption is edited.
- [ ] UI separates model analysis from deterministic result.
- [ ] README contains setup steps, design choices, limits, and screenshots/demo link.
- [ ] Tests and production build pass.

## Public release safety

- [ ] No API keys/tokens in source, git history, frontend build, or demo recording.
- [ ] Production CORS is restricted.
- [ ] No request bodies or sensitive model inputs in logs.
- [ ] If public API is deployed, rate limiting/request limits are active.
- [ ] Privacy notice discloses Meta API processing.
