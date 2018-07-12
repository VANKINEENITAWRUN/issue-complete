// Requiring probot allows us to mock out a robot instance
// tslint:disable:mocha-no-side-effect-code
import { Application } from "probot";
const issueComplete = require("../src/index");
const issueOpenedWithUnchecked = require("./fixtures/issueOpenedWithUnchecked");
const issueOpenedMissingKeywords = require("./fixtures/issueOpenedMissingKeywords");
const issueReopenedIncomplete = require("./fixtures/issueReopenedIncomplete");
const issueOpenedComplete = require("./fixtures/issueOpenedComplete");
const issueUpdatedComplete = require("./fixtures/issueUpdatedComplete");
const issueUpdatedIncomplete = require("./fixtures/issueUpdatedIncomplete");

let app: Application;
let github: any;

beforeEach(() => {
  app = new Application();
  issueComplete(app);
  github = {
    repos: {
      getContent: jest.fn().mockImplementation(() => Promise.resolve({
        // tslint:disable-next-line:max-line-length
        data: {content: Buffer.from(`labelName: waiting-for-user-information\nlabelColor: f7c6c7\ncommentText: Thanks for opening an issue on bot-testing.\ncheckCheckboxes: true\nkeywords:\n  - gist\n  - recreate`).toString("base64")},
      }))
    },
    issues: {
      createLabel: jest.fn(),
      removeLabel: jest.fn(),
      createComment: jest.fn(),
      addLabels: jest.fn(),
      getLabel: jest.fn().mockImplementation(() => Promise.reject(new Error()))
    },
    query: jest.fn(() => Promise.resolve({
      repository: {
        label: {
          name: "waiting-for-user-information"
        }
      }
    }))
  };
  app.auth = () => Promise.resolve(github);
});

describe("issues are incomplete", () => {
  test("unchecked boxes, adds a label and comment to a newly opened issue", async () => {
    await app.receive(issueOpenedWithUnchecked);
    expect(github.repos.getContent).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      path: ".github/issuecomplete.yml"
    });
    expect(github.issues.addLabels).toHaveBeenCalled();
    expect(github.issues.createComment).toHaveBeenCalled();
  });

  test("missing keywords, adds a label and comment to a newly opened issue", async () => {
    await app.receive(issueOpenedMissingKeywords);
    expect(github.repos.getContent).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      path: ".github/issuecomplete.yml"
    });
    expect(github.issues.addLabels).toHaveBeenCalled();
    expect(github.issues.createComment).toHaveBeenCalled();
  });

  test("unchecked boxes and missing keywords, adds a label and comment to a reopened issue", async () => {
    await app.receive(issueReopenedIncomplete);
    expect(github.repos.getContent).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      path: ".github/issuecomplete.yml"
    });
    expect(github.issues.addLabels).toHaveBeenCalled();
    expect(github.issues.createComment).toHaveBeenCalled();
  });

  test("does not comment on updated issue with no checkboxes filled", async () => {
    await app.receive(issueUpdatedIncomplete);
    expect(github.repos.getContent).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      path: ".github/issuecomplete.yml"
    });
    expect(github.issues.addLabels).toHaveBeenCalled();
    expect(github.issues.createComment).not.toHaveBeenCalled();
  });
});

describe("issues are complete", () => {
  test("boxes checked and has keywords, does not add label or comment to opened issue", async () => {
    await app.receive(issueOpenedComplete);
    expect(github.repos.getContent).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      path: ".github/issuecomplete.yml"
    });
    expect(github.issues.addLabels).not.toHaveBeenCalled();
    expect(github.issues.createComment).not.toHaveBeenCalled();
  });

  test("boxes checked and has keywords, removes label to updated issue", async () => {
    await app.receive(issueUpdatedComplete);
    expect(github.repos.getContent).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      path: ".github/issuecomplete.yml"
    });
    expect(github.issues.removeLabel).toHaveBeenCalledWith({
      owner: "szeck87",
      repo: "bot-testing",
      name: "waiting-for-user-information"
    });
    expect(github.issues.addLabels).not.toHaveBeenCalled();
    expect(github.issues.createComment).not.toHaveBeenCalled();
  });
});
