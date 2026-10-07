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

for (let page = 1; ; page += 1) {
  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("affiliation", "owner");
  url.searchParams.set("visibility", "all");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "full_name");

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": `${owner}-profile-readme`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
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

const formattedTotal = totalRepositories.toLocaleString("en-US");
const badgeValue = encodeURIComponent(formattedTotal);
const replacement = `<!-- REPOSITORY-COUNT:START -->
  <a href="https://github.com/${owner}?tab=repositories">
    <img
      src="https://img.shields.io/badge/Total%20Repositories-${badgeValue}-238636?labelColor=1f2937&style=for-the-badge&logo=github&logoColor=white"
      alt="${formattedTotal} total GitHub repositories"
    />
  </a>
  <!-- REPOSITORY-COUNT:END -->`;

const readmePath = "README.md";
const readme = await readFile(readmePath, "utf8");
const markerPattern =
  /<!-- REPOSITORY-COUNT:START -->[\s\S]*?<!-- REPOSITORY-COUNT:END -->/;

if (!markerPattern.test(readme)) {
  throw new Error("Repository-count markers were not found in README.md.");
}

const updatedReadme = readme.replace(markerPattern, replacement);
await writeFile(readmePath, updatedReadme, "utf8");

console.log("The total repository badge is up to date.");
