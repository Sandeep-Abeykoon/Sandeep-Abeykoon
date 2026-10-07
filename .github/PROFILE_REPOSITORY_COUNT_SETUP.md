# Private-aware profile statistics setup

The profile README can display the combined number of public and private
repositories, the commits authored by `Sandeep-Abeykoon` across their default
branches, and all-time GitHub contributions. The workflow publishes only the
three totals, without exposing private repository names or activity details.

## One-time setup

1. In GitHub, open **Settings > Developer settings > Personal access tokens >
   Fine-grained tokens** and edit the existing profile-statistics token, or
   create a replacement token if editing is unavailable.
2. Set **Resource owner** to `Sandeep-Abeykoon`.
3. Under **Repository access**, select **All repositories**. Selecting only
   specific repositories produces an incomplete count.
4. Under **Repository permissions**, grant **Metadata: Read-only** and
   **Contents: Read-only**. Keep every other permission set to **No access**.
   Contents access is required by GitHub's commit API for private repositories.
5. Open the `Sandeep-Abeykoon/Sandeep-Abeykoon` repository and go to **Settings
   > Secrets and variables > Actions**.
6. If you created a replacement token, update the repository secret named
   `PROFILE_REPOSITORY_TOKEN` with the new token value. If you edited the
   existing token, the stored secret does not need to change.
7. Open **Actions > Update profile statistics**, select **Run workflow**,
   and run it once.

The workflow then runs daily. It queries only repositories owned by the
authenticated account, updates the **Total Repositories** and **Total Commits**
badges and the **All-Time Contributions** badge, and commits only when a total
changes. The commit total includes commits authored by `Sandeep-Abeykoon` that
are reachable from each owned repository's default branch. It excludes other
contributors' commits and unmerged commits that exist only on secondary
branches. The contribution total follows GitHub's contribution-calendar rules
and is calculated by summing every contribution year returned by GitHub.

The token can read private repository contents because GitHub requires that
permission for private commit history. The updater requests commit metadata
only and never prints repository names, commit messages, or source contents.

Never add the token to the README, workflow file, commit history, or an issue.
If the token expires, rotate it and update the same Actions secret.

If the workflow cannot push its README update, check **Settings > Actions >
General > Workflow permissions** and allow read and write permissions for the
repository workflow token.
