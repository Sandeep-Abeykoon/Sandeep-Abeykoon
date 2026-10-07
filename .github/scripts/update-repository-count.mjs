import { readFile, writeFile } from "node:fs/promises";

const token = process.env.PROFILE_REPOSITORY_TOKEN;
const owner = process.env.GITHUB_REPOSITORY_OWNER;

if (!token) {
  throw new Error(
    "PROFILE_REPOSITORY_TOKEN is unavailable. Add it as a GitHub Actions repository secret.",
  );
}

if (!owner) {
  throw new Error("GITHUB_REPOSITORY_OWNER is unavailable.");
}

const repositories = [];
const perPage = 100;

const requestHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "User-Agent": `${owner}-profile-readme`,
  "X-GitHub-Api-Version": "2022-11-28",
};

for (let page = 1; ; page += 1) {
  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("affiliation", "owner");
  url.searchParams.set("visibility", "all");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "full_name");

  const response = await fetch(url, {
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed with status ${response.status}. Check the token's expiration, repository access, and Metadata permission.`,
    );
  }

  const pageRepositories = await response.json();

  if (!Array.isArray(pageRepositories)) {
    throw new Error("GitHub API returned an unexpected response.");
  }

  repositories.push(
    ...pageRepositories.filter(
      (repository) =>
        repository?.owner?.login?.toLowerCase() === owner.toLowerCase(),
    ),
  );

  if (pageRepositories.length < perPage) {
    break;
  }
}

const totalRepositories = repositories.length;

if (totalRepositories === 0) {
  throw new Error(
    "No owned repositories were returned. Refusing to replace the existing badge.",
  );
}

function getLastPage(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  for (const link of linkHeader.split(",")) {
    const match = link.match(/<([^>]+)>;\s*rel="last"/);

    if (match) {
      const page = Number.parseInt(new URL(match[1]).searchParams.get("page"), 10);
      return Number.isInteger(page) && page > 0 ? page : null;
    }
  }

  return null;
}

async function countAuthoredCommits(repository) {
  if (repository.size === 0) {
    return 0;
  }

  const url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/commits`,
  );
  url.searchParams.set("author", owner);
  url.searchParams.set("per_page", "1");

  const response = await fetch(url, { headers: requestHeaders });

  if (response.status === 409) {
    return 0;
  }

  if (!response.ok) {
    const permissionHint =
      response.status === 403
        ? " Ensure the fine-grained token has Contents: read-only access to all repositories."
        : "";

    throw new Error(
      `GitHub could not count commits in one owned repository (status ${response.status}).${permissionHint}`,
    );
  }

  const commits = await response.json();

  if (!Array.isArray(commits)) {
    throw new Error("GitHub returned an unexpected commit response.");
  }

  if (commits.length === 0) {
    return 0;
  }

  return getLastPage(response.headers.get("link")) ?? commits.length;
}

let totalCommits = 0;

for (const repository of repositories) {
  totalCommits += await countAuthoredCommits(repository);
}

if (totalCommits === 0) {
  throw new Error(
    "No authored commits were returned. Refusing to replace the existing badge.",
  );
}

const formattedRepositories = totalRepositories.toLocaleString("en-US");
const repositoryBadgeValue = encodeURIComponent(formattedRepositories);
const repositoryReplacement = `<!-- REPOSITORY-COUNT:START -->
  <a href="https://github.com/${owner}?tab=repositories">
    <img
      src="https://img.shields.io/badge/Total%20Repositories-${repositoryBadgeValue}-238636?labelColor=1f2937&style=for-the-badge&logo=github&logoColor=white"
      alt="${formattedRepositories} total GitHub repositories"
    />
  </a>
  <!-- REPOSITORY-COUNT:END -->`;

const formattedCommits = totalCommits.toLocaleString("en-US");
const commitBadgeValue = encodeURIComponent(formattedCommits);
const commitReplacement = `<!-- COMMIT-COUNT:START -->
  <a href="https://github.com/${owner}">
    <img
      src="https://img.shields.io/badge/Total%20Commits-${commitBadgeValue}-238636?labelColor=1f2937&style=for-the-badge&logo=git&logoColor=white"
      alt="${formattedCommits} commits authored by ${owner} across owned GitHub repositories"
    />
  </a>
  <!-- COMMIT-COUNT:END -->`;

const readmePath = "README.md";
const readme = await readFile(readmePath, "utf8");
const repositoryMarkerPattern =
  /<!-- REPOSITORY-COUNT:START -->[\s\S]*?<!-- REPOSITORY-COUNT:END -->/;
const commitMarkerPattern =
  /<!-- COMMIT-COUNT:START -->[\s\S]*?<!-- COMMIT-COUNT:END -->/;

if (!repositoryMarkerPattern.test(readme)) {
  throw new Error("Repository-count markers were not found in README.md.");
}

if (!commitMarkerPattern.test(readme)) {
  throw new Error("Commit-count markers were not found in README.md.");
}

const updatedReadme = readme
  .replace(repositoryMarkerPattern, repositoryReplacement)
  .replace(commitMarkerPattern, commitReplacement);
await writeFile(readmePath, updatedReadme, "utf8");

console.log("The total repository and authored-commit badges are up to date.");
