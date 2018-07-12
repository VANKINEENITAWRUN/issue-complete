export default async function isBodyValid (body: string, config: any) {

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
      } else {
        return true;
      }
    });
  }

  return true;
}
