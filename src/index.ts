import { Application, Context } from "probot";
import getValidConfig from "./ConfigBuilder";
import isBodyValid from "./IssueBodyChecker";

const addComment = `
  mutation($id: ID!, $body: String!) {
    addComment(input: {subjectId: $id, body: $body}) {
      clientMutationId
    }
  }
`;

const getLabelInRepo = `
  query($owner: String!, $name: String!, $labelName: String!) {
    repository(name: $name, owner: $owner) {
      label(name: $labelName) {
        name
      }
    }
  }
`;

// export const app = (app: Application) => {
export = (app: Application) => {
  app.on(["issues.opened", "issues.edited", "issues.reopened"], async (context: Context) => {
    const config = await getValidConfig(context);
    const body = context.payload.issue.body;
    if (!(await isBodyValid(body, config))) {
      await addLabelToIssue(context, config);
      if (context.payload.action !== "edited") {
        await addCommentToIssue(context, config);
      }
    } else {
      await removeLabelFromIssue(context, config);
    }
  });

  async function createLabelIfNotExists (context: Context, labelName: string, labelColor: string) {
    // tslint:disable
    const {owner, repo} = context.repo();
    const doesLabelExist = await context.github.query(getLabelInRepo, {
      owner,
      name: repo,
      labelName: labelName
    });
    context.log(doesLabelExist);
    // catch(error => {
    //   return context.github.issues.createLabel({owner, repo, name: labelName, color: labelColor});
    // });
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
    return context.github.query(addComment, {
      id: context.payload.issue.node_id,
      body: config.commentText
    });
  }
};

// export default app;
