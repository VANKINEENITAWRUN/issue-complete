import {Robot, Context} from "probot-ts";
const getConfig = require('probot-config');

const defaultConfig = {
  labelName: 'waiting-for-user-information',
  labelColor: 'ffffff',
  commentText: 'Thanks for opening an issue. I see you haven\'t provided all of the information in the list. Please update the issue to include more information.'
};

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

export const robot = (robot: Robot) => {
  robot.on(['issues.opened', 'issues.edited', 'issues.reopened'], async (context: Context) => {
    const config = await getConfig(context, 'issuecomplete.yml', defaultConfig);
    validateConfig(context, config);
    const { resource } = await context.github.query(getResource, {
      url: context.payload.issue.html_url
    });
    const issueIsIncomplete = validateIssueRequirements(context, config);
    if (issueIsIncomplete) {
      addLabelToIssue(context, config);
      if (context.payload.action !== 'edited') {
        await context.github.query(addComment, {
          id: resource.id,
          body: config.commentText
        });
      }
    } else {
      removeLabelFromIssue(context, config);
    }
  })

  function validateConfig (context: Context, config: any) {
    const validColor = /^[0-9A-F]{6}$/i.test(config.labelColor);
    if (!validColor) {
      context.log.error('Invalid color in config file, using default');
      config.labelColor = defaultConfig.labelColor;
    }
    if (config.labelName.length > 50) {
      context.log.error('Too many characters for label name in config file, using default');
      config.labelName = defaultConfig.labelName;
    }
  }

  function validateIssueRequirements (context: Context, config: any) {
    const body = context.payload.issue.body;
    const hasUncheckedTasks = /-\s\[\s\]/g.test(body);
    let hasMissingKeywords = false;
    if (config.keywords) {
      for (let i = 0; i < config.keywords.length; i++) {
        if (body.indexOf(config.keywords[i]) === -1) {
          hasMissingKeywords = true;
          break;
        }
      }
    }
    if (hasUncheckedTasks || hasMissingKeywords) {
      context.log('Issue is incomplete, missing checkboxes or keywords', {'Keywords': config.keywords, 'Issue Body': body});
      return true;
    }
    return false;
  }

  async function createLabelIfNotExists (context: Context, labelName: string, labelColor: string): Promise<any> {
    const {owner, repo} = context.repo();
    return context.github.issues.getLabel({owner, repo, name: labelName}).catch(() => {
      return context.github.issues.createLabel({owner, repo, name: labelName, color: labelColor});
    })
  }

  async function addLabelToIssue (context: Context, config: any): Promise<any> {
    const issueLabel = context.issue({labels: [config.labelName]});
    await createLabelIfNotExists(context, config.labelName, config.labelColor);
    return context.github.issues.addLabels(issueLabel);
  }

  async function removeLabelFromIssue (context: Context, config: any): Promise<any> {
    const labelName = config.labelName;
    const labelRemoval = context.issue({name: labelName});
    return context.github.issues.removeLabel(labelRemoval);
  }
}

export default robot;
