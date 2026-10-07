# Total repository count setup

The profile README can display the combined number of public and private
repositories without exposing their names. The workflow only publishes the
resulting total.

## One-time setup

1. In GitHub, open **Settings > Developer settings > Personal access tokens >
   Fine-grained tokens** and create a token.
2. Set **Resource owner** to `Sandeep-Abeykoon`.
3. Under **Repository access**, select **All repositories**. Selecting only
   specific repositories produces an incomplete count.
4. Grant only the read-only **Metadata** repository permission. Do not grant
   repository-content or write permissions.
5. Open the `Sandeep-Abeykoon/Sandeep-Abeykoon` repository and go to **Settings
   > Secrets and variables > Actions**.
6. Create a repository secret named `PROFILE_REPOSITORY_TOKEN` and paste the
   token as its value.
7. Open **Actions > Update total repository count**, select **Run workflow**,
   and run it once.

The workflow then runs daily. It queries only repositories owned by the
authenticated account, replaces the README badge with **Total Repositories**,
and commits only when the total changes.

Never add the token to the README, workflow file, commit history, or an issue.
If the token expires, rotate it and update the same Actions secret.

If the workflow cannot push its README update, check **Settings > Actions >
General > Workflow permissions** and allow read and write permissions for the
repository workflow token.
