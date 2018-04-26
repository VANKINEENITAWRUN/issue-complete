import { Robot, Context } from "probot";
import ConfigBuilder from "./ConfigBuilder";
import IssueBodyChecker from "./IssueBodyChecker";

const getResource = `
  query getResource($url: URI!) {
    resource(url: $url) {
      ... on Node {
        id
      }
    }
  }
`;

const addComment = `
  mutation comment($id: ID!, $body: String!) {
    addComment(input: {subjectId: $id, body: $body}) {
      clientMutationId
    }
  }
`;

const getLabelInRepo = `
  query getLabelInRepo($url: URI!, $name: String!) {
    resource(url: $url) {
      ... on Repository {
        label(name: $name) {
          name
        }
      }
    }
  }
`;

export const robot = (robot: Robot) => {
  robot.on(["issues.opened", "issues.edited", "issues.reopened"], async context => {
    const configBuilder = new ConfigBuilder();
    const issueBodyChecker = new IssueBodyChecker();
    const config = await configBuilder.getValidConfig(context);
    const { resource } = await context.github.query(getResource, {
      url: context.payload.issue.html_url
    });
    const body = context.payload.issue.body;
    if (!(await issueBodyChecker.isBodyValid(body, config, context))) {
      await addLabelToIssue(context, config);
      if (context.payload.action !== "edited") {
        await addCommentToIssue(context, config, resource);
      }
    } else {
      await removeLabelFromIssue(context, config);
    }
  });

  async function createLabelIfNotExists (context: Context, labelName: string, labelColor: string) {
    const {owner, repo} = context.repo();
    return context.github.query(getLabelInRepo, {
      url: context.payload.repository.html_url,
      name: labelName
    }).catch(() => {
      return context.github.issues.createLabel({owner, repo, name: labelName, color: labelColor});
    });
  }

  async function addLabelToIssue (context: Context, config: any) {
    const issueLabel = context.issue({labels: [config.labelName]});
    await createLabelIfNotExists(context, config.labelName, config.labelColor);
    return context.github.issues.addLabels(issueLabel);
  }

  async function removeLabelFromIssue (context: Context, config: any) {
    const labelName = config.labelName;
    const labelRemoval = context.issue({name: labelName});
    return context.github.issues.removeLabel(labelRemoval);
  }

  async function addCommentToIssue (context: Context, config: any, resource: any) {
    const commentText = context.issue({body: config.commentText});
    return context.github.query(addComment, {
      id: resource.id,
      body: config.commentText
    });
  }
};

export default robot;
