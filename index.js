const core = require("@actions/core");
const github = require("@actions/github");
const context = github.context;
const { parseConfig, hasAssignee, getReviewers } = require("./lib/util");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("token", { required: true });
    const configPath = core.getInput("config");
    const octokit = new github.GitHub(token);

    const configContent = await fetchContent(octokit, configPath);
    const config = parseConfig(configContent);

    core.debug("config");
    core.debug(JSON.stringify(config));

    const issuer = context.payload.pull_request.user.login;

    if (hasAssignee(config, issuer)) {
      let reviewers = getReviewers(config, issuer);
      assignReviewers(octokit, reviewers);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function assignReviewers(octokit, reviewers) {
  await octokit.request(`POST /repos/${context.repo.owner}/${context.repo.repo}/pulls/${context.payload.pull_request.number}/requested_reviewers`, {
    reviewers
  })
}

async function fetchContent(client, repoPath) {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha,
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

run();
