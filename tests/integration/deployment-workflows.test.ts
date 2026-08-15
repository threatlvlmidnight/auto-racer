import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 031-demo-deployment T024 (with T035's no-rollback assertions): static
 * audits of the CI/CD boundary. These tests read the workflow YAML as text
 * and enforce release-workflow-contract.md: trigger isolation, least-privilege
 * permissions, pre-checkout tag validation order, gated job dependencies, the
 * protected Pages environment, serialized deployment concurrency, immutable
 * action pins, and the absence of secrets or recursive deployment paths.
 */

const ROOT = join(__dirname, "..", "..");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");
const VERIFY_PATH = join(WORKFLOWS_DIR, "verify.yml");
const DEPLOY_PATH = join(WORKFLOWS_DIR, "deploy-demo.yml");

function readWorkflow(path: string): string {
  expect(existsSync(path), `expected workflow file ${path}`).toBe(true);
  return readFileSync(path, "utf-8");
}

const PINNED_USES_PATTERN = /^\s*-?\s*uses:\s*[a-z0-9_.-]+\/[a-z0-9_.-]+@[0-9a-f]{40}(\s*#.*)?$/;

function usesLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("uses:"))
    .map((line) => `uses: ${line.slice("uses:".length).trim()}`);
}

describe("T024: verify.yml never deploys", () => {
  const content = readWorkflow(VERIFY_PATH);

  it("triggers only on push and pull_request", () => {
    expect(content).toMatch(/^on:\s*\n(\s+push:\s*\n)?(\s+pull_request:\s*\n)?/m);
    expect(content).toContain("push:");
    expect(content).toContain("pull_request:");
    expect(content).not.toContain("workflow_dispatch");
    expect(content).not.toContain("schedule:");
    expect(content).not.toContain("page_build");
  });

  it("carries read-only permissions and no deployment authority", () => {
    expect(content).toContain("contents: read");
    expect(content).not.toContain("pages: write");
    expect(content).not.toContain("id-token: write");
    expect(content).not.toContain("environment:");
    expect(content).not.toContain("deploy-pages");
    expect(content).not.toContain("upload-pages-artifact");
    expect(content).not.toContain("configure-pages");
  });

  it("runs the complete locked gate sequence", () => {
    expect(content).toContain("npm ci");
    expect(content).toContain("npm test");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm run build");
  });

  it("pins every action to an immutable full commit SHA", () => {
    const uses = usesLines(content);
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(PINNED_USES_PATTERN);
    }
  });
});
describe("T024: deploy-demo.yml releases only through a manual, validated path", () => {
  const content = readWorkflow(DEPLOY_PATH);
  const buildJob = content.slice(content.indexOf("validate-and-build:"), content.indexOf("deploy:"));
  const deployJob = content.slice(content.indexOf("deploy:"));

  it("triggers only on manual dispatch with a required release_tag input", () => {
    expect(content).toContain("workflow_dispatch:");
    expect(content).toContain("release_tag:");
    expect(content).toContain("required: true");
    expect(content).not.toMatch(/^\s*push:/m);
    expect(content).not.toMatch(/^\s*pull_request:/m);
    expect(content).not.toContain("schedule:");
    expect(content).not.toContain("page_build");
  });

  it("validates tag grammar and resolves the remote ref before any checkout", () => {
    const grammarIndex = content.indexOf("Validate demo tag grammar");
    const resolveIndex = content.indexOf("Verify exact remote tag ref");
    const checkoutIndex = content.indexOf("uses: actions/checkout");
    expect(grammarIndex).toBeGreaterThan(-1);
    expect(resolveIndex).toBeGreaterThan(grammarIndex);
    expect(checkoutIndex).toBeGreaterThan(resolveIndex);
    expect(content).toContain("git ls-remote");
  });

  it("checks out the resolved revision, then cross-checks with the repository validator", () => {
    expect(buildJob).toContain("ref: ${{ steps.resolve.outputs.revision }}");
    expect(buildJob).toContain("scripts/validate-demo-tag.mjs");
    expect(buildJob).toContain("--expect-revision");
  });

  it("runs the full verification gates before building with release identity", () => {
    expect(buildJob).toContain("npm ci");
    expect(buildJob).toContain("npm test");
    expect(buildJob).toContain("npm run lint");
    expect(buildJob).toContain("npm run build");
    expect(buildJob).toContain('VITE_DEMO_BASE_URL="/auto-racer/"');
    expect(buildJob).toContain("VITE_DEMO_RELEASE_TAG=");
    expect(buildJob).toContain("VITE_DEMO_REVISION=");
    expect(buildJob).toContain("VITE_DEMO_BUILT_AT_UTC=");
  });

  it("audits the artifact and uploads only dist/ as the Pages artifact", () => {
    expect(buildJob).toContain("scripts/audit-production-artifact.mjs dist");
    expect(buildJob).toContain("--expect-tag");
    expect(buildJob).toContain("upload-pages-artifact");
    expect(buildJob).toContain("path: dist");
  });

  it("build job has repository read permission only", () => {
    expect(buildJob).toContain("contents: read");
    expect(buildJob).not.toContain("pages: write");
    expect(buildJob).not.toContain("id-token: write");
    expect(buildJob).not.toContain("environment:");
  });

  it("deploy job is gated, protected, and minimally permissioned", () => {
    expect(deployJob).toContain("needs: validate-and-build");
    expect(deployJob).toContain("name: github-pages");
    expect(deployJob).toContain("pages: write");
    expect(deployJob).toContain("id-token: write");
    expect(deployJob).not.toContain("contents: write");
    expect(deployJob).not.toContain("packages: write");
    expect(deployJob).toContain("deploy-pages");
    expect(deployJob).toContain("page_url");
  });

  it("serializes deployments without cancelling an in-flight write", () => {
    expect(content).toContain("group: pages-deploy");
    expect(content).toContain("cancel-in-progress: false");
  });

  it("exposes the deployment in the workflow summary", () => {
    expect(content).toContain("GITHUB_STEP_SUMMARY");
    expect(content).toContain("Deployment URL");
  });

  it("pins every action to an immutable full commit SHA", () => {
    const uses = usesLines(content);
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(PINNED_USES_PATTERN);
    }
  });

  it("never consumes repository secrets and never references mutable tags", () => {
    expect(content).not.toContain("${{ secrets.");
    expect(content).not.toMatch(/uses:\s*[a-z0-9_.-]+\/[a-z0-9_.-]+@v\d/);
  });
});

describe("T035: smoke runs against the deploy-pages output and never rolls back", () => {
  const content = readWorkflow(DEPLOY_PATH);
  const smokeJob = content.slice(content.indexOf("smoke:"));

  it("a post-deployment smoke job exists and depends on the deploy job", () => {
    expect(smokeJob.length).toBeGreaterThan(0);
    expect(smokeJob).toContain("needs: [validate-and-build, deploy]");
  });

  it("runs the smoke checker against the returned Pages URL and expected identity", () => {
    expect(smokeJob).toContain("scripts/smoke-demo.mjs");
    expect(smokeJob).toContain("needs.deploy.outputs.page_url");
    expect(smokeJob).toContain("needs.validate-and-build.outputs.release_tag");
    expect(smokeJob).toContain("needs.validate-and-build.outputs.revision");
  });

  it("the smoke job carries no deployment authority whatsoever", () => {
    expect(smokeJob).not.toContain("deploy-pages");
    expect(smokeJob).not.toContain("upload-pages-artifact");
    expect(smokeJob).not.toContain("configure-pages");
    expect(smokeJob).not.toContain("pages: write");
    expect(smokeJob).not.toContain("id-token: write");
    expect(smokeJob).toContain("contents: read");
  });

  it("the whole workflow forbids automatic rollback and recursive deployment", () => {
    expect(content.toLowerCase()).not.toContain("rollback:");
    expect(content).not.toContain("workflow_run:");
    expect(content).not.toContain("repository_dispatch");
    // Recovery guidance is manual-only, surfaced through the health summary.
    expect(smokeJob).toContain("No automatic rollback");
  });

  it("reports healthy/unhealthy with URL, tag, and revision in the summary", () => {
    expect(smokeJob).toContain("GITHUB_STEP_SUMMARY");
    expect(smokeJob).toContain("healthy");
    expect(smokeJob).toContain("unhealthy");
    expect(smokeJob).toContain("if: always()");
  });
});

describe("T036: operator runbook contract in README", () => {
  const readme = readWorkflow(join(ROOT, "README.md"));

  it("documents the one-time Pages enablement setting", () => {
    expect(readme).toContain("Settings");
    expect(readme).toContain("Pages");
    expect(readme).toContain("GitHub Actions");
  });

  it("documents semantic demo tag creation without auto-publishing", () => {
    expect(readme).toMatch(/git tag[^\n]*demo-v/);
    expect(readme).toMatch(/git push[^\n]*demo-v|git push origin/);
    expect(readme.toLowerCase()).toContain("does not deploy");
  });

  it("documents manual dispatch of the release workflow", () => {
    expect(readme).toContain("Deploy demo release");
    expect(readme.toLowerCase()).toContain("run workflow");
  });

  it("documents result inspection and manual previous-tag redeployment", () => {
    expect(readme.toLowerCase()).toContain("summary");
    expect(readme.toLowerCase()).toContain("previous");
    expect(readme).toMatch(/demo-v/);
  });
});