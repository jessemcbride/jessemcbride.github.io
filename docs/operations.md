# Operations and testing

## Troubleshooting

- **Spotify says unconfigured:** run `npm run doctor`. The three credentials must exist in `.env` locally and as GitHub repository secrets remotely. A local `.env` is intentionally never uploaded.
- **Spotify 400 or 401:** reconnect with `npm run spotify:connect`, then replace the refresh token secret. Confirm the client ID and secret belong to the same app.
- **Spotify 403:** check the account’s access in the Spotify developer dashboard and current development-mode requirements. A successful consent redirect does not by itself guarantee every account has API access.
- **Rate limited:** wait for the retry timestamp. The updater carries it forward. Increase the scheduled interval if needed.
- **No active player:** this is normal. Spotify can return 204; the recent listening shelf still works. Podcasts, local files, unavailable items and duplicate recent tracks are omitted.
- **Empty GitHub activity:** the public activity endpoint can be empty and does not include private contributions. It may also lag. The profile link remains available.
- **Stale feed:** inspect the latest workflow’s “Refresh public activity” output. Failed individual feeds produce annotations and preserve old data; healthy integrations still update. Inspect `site-data:activity.json` for timestamps and status, never for secrets.
- **Pages deployment fails:** set Settings → Pages → Source to GitHub Actions, verify `pages: write` and `id-token: write`, and ensure the `github-pages` environment permits your default branch. Required environment approvals would also delay scheduled deployments.
- **State push fails:** repository/organization rules must permit the workflow token to write `site-data`. Never merge that branch into main. The state helper uses normal fast-forward pushes and does not force-push over concurrent changes.
- **No scheduled runs:** the workflow must be on the default branch; re-enable it in Actions after inactivity, then trigger a manual run. GitHub scheduling is best effort.
- **Local port busy:** use `PORT=4322 npm run dev`. The Spotify callback separately needs port 8888.

## Rollbacks and pausing

Revert a source commit and push to redeploy it. Run the Pages workflow manually to retry deployment. Turning off an integration in the editor and deploying clears its current published data. To stop all scheduled publishing, disable the workflow in Actions or remove its `schedule` trigger while retaining `push` and `workflow_dispatch`.

The state branch keeps public snapshots in Git history, including listening history from the periods it was enabled. Deleting current data does not erase past snapshots. If you want no retained public history, change the persistence design before connecting an account.

## Automated verification

`npm run check` runs 21 tests, then produces the static site. Tests use Node’s built-in test runner and local temporary directories; no Spotify credentials or external network are needed. HTTP tests open loopback ports. The suite verifies:

- API response filtering, token exclusion, deduplication, idle playback and public-only events.
- Rate-limit backoff, outage retention, recovery and stale timestamps.
- Escaping of upstream content and rejection of unsafe URLs.
- Server-rendered content and asset URLs under GitHub Pages repository subpaths.
- Custom-domain creation/removal and disabled integration output.
- Content validation, real local editor save/rebuild, cross-origin write rejection, secret path rejection, and absence of management endpoints in production.
- Two successive state saves/restores against a temporary bare Git remote, preserving the source branch.

The live GitHub and CanvasAPI requests were also exercised successfully during implementation. Spotify’s responses were tested with fixtures; a real account still needs authorization. No browser was connected during implementation, so visual layout, actual browser interaction, responsive screenshots, and keyboard use need a browser pass. GitHub-hosted workflow execution needs the target repository and first deployment.

For that browser pass: check 1440px, 768px and 390px widths; expand each project; open the archive, search, sort, and show more; test back-to-top and keyboard focus; save an editor field and verify it appears in the preview; check an invalid JSON edit; inspect a production preview to confirm `/manage` is absent. Also test with JavaScript disabled: the core bio, projects, records and previously fetched activity should remain visible.

## Add another feed

1. Implement a small adapter in `scripts/lib/feeds.mjs` that returns only fields intended for publication. Use `requestJSON` for timeout and rate-limit handling.
2. Add an integration toggle to the site schema and call it through `updateFeed` in `scripts/refresh.mjs`. Keep integrations independent so a new failure cannot block Spotify.
3. Add the renderer to `public/view.js`, the initial HTML to `src/page.mjs`, and optional polling updates in `public/app.js`.
4. Add necessary secrets to the workflow’s refresh step only. Never put them in the generated JSON, browser modules or content files.
5. Add fixtures for success, empty data and failure; run `npm run check`.

RuneScape achievements and the now note are deliberately manually editable until an additional feed is chosen. The historic CanvasAPI dependent counts are not presented as live statistics; only the repository’s current stars and forks are refreshed.

## Attribution

The layout and album artwork were recovered from the supplied `js.mhtml` snapshot. The site retains its original inspiration link to skip’s house. Album art remains the property of the respective rights holders; every record links to Spotify. The 298-repository archive was parsed from `old/canvasapi-dependents`; the earlier showcase’s broad marketing counts were not imported as current facts.
