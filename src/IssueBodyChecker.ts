import { Context } from "probot";

export default class IssueBodyChecker {
  public async isBodyValid (body: string, config: any, context: Context) {
    if (!body) {
      return false;
    }

    if (config.checkCheckboxes && /-\s\[\s\]/g.test(body)) {
      return false;
    }

    if (config.keywords) {
      config.keywords.forEach((keyword: string) => {
        if (body.indexOf(keyword) === -1) {
          return false;
        }
      });
    }
  }
}