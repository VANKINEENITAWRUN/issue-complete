import { Application, Context } from "probot";
import getValidConfig from "./ConfigBuilder";
import isBodyValid from "./IssueBodyChecker";

export const ADD_COMMENT = `
  mutation($id: ID!, $body: String!) {
    addComment(input: {subjectId: $id, body: $body}) {
      clientMutationId
    }
  }
`;

export const GET_LABEL_IN_REPO = `
  query($owner: String!, $name: String!, $labelName: String!) {
    repository(name: $name, owner: $owner) {
      label(name: $labelName) {
        name
      }
    }
  }
`;

// export = (app: Application) => {
export default function issueComplete (app: Application) {
  app.log("Issue Complete loaded");
  app.on(["issues.opened", "issues.edited", "issues.reopened"], async (context: Context) => {
    const config = await getValidConfig(context);
    const body: string = context.payload.issue.body;
    const isValid: boolean = await isBodyValid(body, config);
    if (!isValid) {
      await addLabelToIssue(context, config);
      if (context.payload.action !== "edited") {
        await addCommentToIssue(context, config);
      }
    } else {
      await removeLabelFromIssue(context, config);
    }
  });
}

async function createLabelIfNotExists (context: Context, labelName: string, labelColor: string) {
  const {owner, repo} = context.repo();
  const labelQuery: any = await context.github.query(GET_LABEL_IN_REPO, {
    owner,
    name: repo,
    labelName: labelName
  });
  const result = labelQuery.repository.label;
  context.log(result);
  if (result && (result.name !== labelName)) {
    return context.github.issues.createLabel({owner, repo, name: labelName, color: labelColor});
  }
  return;
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

async function addCommentToIssue (context: Context, config: any) {
  return context.github.query(ADD_COMMENT, {
    id: context.payload.issue.node_id,
    body: config.commentText
  });
}
