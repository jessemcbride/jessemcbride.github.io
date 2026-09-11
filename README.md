# Jesse’s space

A personal GitHub Pages site rebuilt from `js.mhtml`, with its original dark scrapbook design, seven recovered album covers, editable projects, Spotify listening, public GitHub activity, and a searchable CanvasAPI archive.

**Start here: Node 24+, then `npm run dev`.** Open <http://127.0.0.1:4321/> for the site or <http://127.0.0.1:4321/manage> for the local editor. No application dependencies or API credentials are needed to preview or build.

## Keep it updating automatically

The scheduler is already defined in [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Once this site is on GitHub, it refreshes Spotify, saves the growing listening history, and publishes the site **every day at 12:17 UTC (8:17am EDT / 7:17am EST)**. Your computer can be off. Opening the site or leaving `npm run dev` running does not collect new plays.

### One-time setup

Spotify already works in the local `.env`; you do not need to reconnect or download your history. This checkout still needs a GitHub remote.

1. Create an empty GitHub repository for the site. In its **Settings → Secrets and variables → Actions**, add three repository secrets using the corresponding values from your local `.env`: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN`. Paste only each value, without surrounding quotes. Keep `.env` local.
2. In **Settings → Pages**, choose **GitHub Actions** as the source. Enable Actions if the repository prompts you to do so. [GitHub’s Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
3. From this project directory, connect and push the site:

   ```sh
   git remote add origin git@github.com:OWNER/REPOSITORY.git
   npm run deploy
   ```

   Replace `OWNER/REPOSITORY` with your repository. The helper runs checks, shows the destination, asks before committing, and pushes the site files. Make sure the pushed branch is the repository’s default branch (`main` in this checkout).
4. Open **Actions → Update and deploy Pages**. Check that both `build` and `deploy` succeed. In the **Refresh public activity** log, look for `spotify: ok`; a successful deployment alone does not guarantee Spotify is connected. Use **Run workflow** on the default branch for an immediate retry or refresh.
5. Open the URL shown by the deploy job. The record shelf is always visible; **liner notes · the listening over time** contains the accumulating history. Later scheduled runs keep it updated automatically.

The workflow creates a `site-data` branch containing `activity.json`. Keep that branch: it carries listening observations between runs. Repository rules must permit the workflow to write it; the workflow already requests `contents: write`. Local `data/activity.json` is not uploaded by the deployment helper, so hosted collection starts with the first successful GitHub refresh.

### Change the frequency

The current schedule is daily. For hourly collection, replace the existing schedule entry in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) with:

```yaml
  schedule:
    - cron: '17 * * * *' # Every hour at minute 17, UTC
```

Commit and push that change to the default branch. This runs the entire refresh and deployment hourly. It can capture more listening because Spotify returns at most 50 recent plays per check, but it still cannot guarantee a complete history. If you change the cadence, update the daily-check wording in `public/view.js` and this README to match.

### If updates stop

Check the latest workflow in **Actions**. `spotify: unconfigured` means a repository secret is missing; `spotify: stale` or `error` means the upstream request failed, with any previously successful data retained. For a revoked Spotify connection, run `npm run spotify:connect` locally and replace the repository’s refresh-token secret. If saving `site-data` fails, check branch rules and workflow write permissions.

Schedules run from the default branch and may be delayed. GitHub can disable public-repository schedules after 60 days of inactivity; re-enable the workflow in Actions if needed. [GitHub’s scheduling rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Everyday workflow

```sh
npm ci
npm run dev          # Site + local editor + reload on content/style changes
npm run refresh      # Fetch actual public feeds; does not publish anything
npm run check        # Automated tests + production build
npm run preview      # Production behavior, without editor or dev endpoints
npm run deploy       # Check, review destination/files, confirm, commit and push
npm run doctor       # Check setup without printing credentials
```

The editor has profile, now, projects, record shelf, integration settings and full JSON tabs. Save changes to update your files and preview. Put new images in `public/assets/` and reference them as `./assets/name.webp`. Use the JSON tab to reorder records or projects. Saving locally does not publish; deploying does.

The site uses relative URLs, so the same build works at a `github.io` root, `/repository-name/`, or a custom domain. Set `PORT=4322 npm run dev` if the default port is occupied. Restart the dev server after editing the Node templates or server scripts; content, CSS, client JavaScript and feed JSON reload automatically.

## Listening patterns from the existing API access

Album artwork is the main view: seven distinct covers remain visible in the record shelf, with repeat favorites drawn from captured plays. Statistics sit beneath it in collapsed liner notes. No data download is needed. Every refresh fetches up to 50 recent plays and aggregates them into monthly counts, artist rankings, song rankings, and repeat-play share. Repeated refreshes do not double-count overlapping plays. Monthly artist leaders show how the rotation changes as observations accumulate. The `site-data` snapshot retains these aggregates between scheduled runs.

These are **captured plays**, not complete listening totals: the recent-history endpoint is limited and daily checks can miss plays. The page labels its coverage and sampling limits. It does not infer hours listened from song duration or claim historical years that have not been captured. The current authorization cannot read Spotify’s top-item rankings; no additional consent is required for this view.

An optional `music:import` command remains available for extended-history exports, but the live API statistics take precedence and imports are not required. Turning off Spotify removes its public statistics on the next build.

## Connect Spotify once

1. Create an app in the [Spotify developer dashboard](https://developer.spotify.com/dashboard). Select Web API. Register **exactly** `http://127.0.0.1:8888/callback` as a redirect URI. Spotify requires a literal loopback IP, not `localhost`, for HTTP redirects. [Redirect documentation](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
2. Follow Spotify’s current development-mode eligibility and user-access requirements. The app owner needs Premium; add the listening account to the app’s allowed users when necessary. [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
3. Copy `.env.example` to `.env`. Fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` locally. Never paste them into site content or commit them.
4. Run `npm run spotify:connect`, open the consent URL printed in the terminal, and authorize your account. The helper verifies OAuth state, exchanges the code, and saves `SPOTIFY_REFRESH_TOKEN` to `.env` without printing it. It exits after success or ten minutes.
5. Run `npm run refresh`, then look at the site. The music section shows the record shelf, with captured play counts and a growing timeline in its liner notes.
6. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN` using the values in `.env`. Do not upload the optional local `GITHUB_TOKEN` as a Spotify secret. GitHub Actions already supplies its own GitHub token.

Only `user-read-currently-playing` and `user-read-recently-played` are requested. There are no playback controls or playlist-write permissions. The scheduled job refreshes its access token each run. If consent is revoked or Spotify replaces the refresh token, reconnect and update the repository secret. [Authorization flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow), [refresh tokens](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)

## First GitHub Pages deployment

Create an empty repository in your GitHub account. A public repository is the simplest option; private repository Pages availability and Actions allowances depend on your GitHub plan. The source branch and `site-data` branch contain public site content; Spotify credentials stay in repository secrets.

```sh
# If this directory is not already a Git repository:
git init -b main

# Replace OWNER/REPOSITORY with the repository you created:
git remote add origin git@github.com:OWNER/REPOSITORY.git
npm run deploy
```

In the repository’s **Settings → Pages**, set **Source → GitHub Actions**. If the first deployment ran before this setting was enabled, rerun **Actions → Update and deploy Pages → Run workflow**. Use the URL displayed by the deploy job.

The workflow automatically detects the default branch. Pushes to that branch, manual workflow runs, and the daily schedule all build and deploy. Pull requests get checks and a downloadable static preview artifact, without Spotify credentials or a deployment. For branch protection, require the **Check site / check** job and allow the automation to write the separate `site-data` branch.

For subsequent edits, use `npm run deploy` or your normal commit-and-push workflow. If your default branch is protected, push a feature branch and open a pull request instead. GitHub CLI is optional; the deployment helper uses Git directly.

## What refreshes, and how often?

| Content | Source | Update behavior |
| --- | --- | --- |
| Listening patterns and monthly observations | Spotify recent-history API | Aggregated each run, after authorization |
| Public GitHub activity | Configured GitHub username | Every scheduled run; upstream events may lag |
| CanvasAPI stars and forks | `ucfopen/canvasapi` | Every scheduled run |
| Bio, projects, now note, RuneScape note | `content/site.json` | When you edit and deploy |
| Handpicked record shelf | `content/music.json` | When you edit and deploy; fallback when disconnected |
| 298 CanvasAPI dependents | `content/canvasapi.json` | Historical imported snapshot, explicitly labeled |

The cron expression `17 12 * * *` runs daily at 12:17 UTC (8:17am EDT / 7:17am EST). GitHub Actions can delay or drop scheduled jobs. Public-repository schedules may be disabled after 60 days without activity; check the Actions tab if updates stop. [GitHub scheduling documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Open pages check for fresh published JSON once a minute while visible. The UI always shows the last successful check and stops describing an old check as fresh after 36 hours. Playback is labeled “Playing at last check,” because the song may have changed. Browsers fetch the published JSON only; they never call Spotify with your credentials.

Every feed fails independently. Timeouts, invalid credentials and rate limits retain that feed’s last successful data and original timestamp. `Retry-After` is honored across runs. Missing credentials use the original handpicked shelf. Disabling an integration removes its retained data from the next published snapshot. Historical snapshots remain in Git history; turning off a feed is not retroactive erasure.

The `site-data` branch holds only activity JSON. It is restored before fetching, then updated without touching your working branch or creating generated-data commits on main. Build output is uploaded directly to GitHub Pages, so automation commits do not need to trigger another workflow. [Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Daily publishing runs once per day, plus pushes and manual runs. Use **Actions → Update and deploy Pages → Run workflow** for an immediate refresh.

## Custom domain

Set `domain` in the local editor or `content/site.json` to your hostname, for example `jesse.garden`, then deploy. The build generates `CNAME`. Configure that domain in GitHub Pages, set the DNS records recommended by GitHub, verify it and enable HTTPS. Leave `domain` empty until you intend to use it. Removing it removes `CNAME` on the next build. [GitHub domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## Files you’ll actually edit

```text
content/site.json       Profile, paragraphs, projects, integration toggles
content/music.json      Your fallback record shelf
content/canvasapi.json  Historical dependents archive
public/style.css       Recovered styles and additions
public/app.js          Browser behavior and archive search
public/view.js         Shared safe feed rendering
public/assets/         Images and favicon
src/page.mjs           Server-rendered page template
src/manage.html        Local-only content editor
scripts/               Build, dev server, OAuth, feed adapters, deployment
.github/workflows/     Checks, scheduled updates and Pages deployment
```

`dist/` is generated. `.env`, generated local feed data, `js.mhtml`, and the large original `old/` folder are ignored by Git. The original input files remain on disk for reference. The archive’s unrelated Three.js demo and vendored library are not shipped as part of the personal site.

See [operations and testing](docs/operations.md) for recovery, extension points, and remaining verification steps.
