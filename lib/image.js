var fmt = require('util').format;
var fetch = require('node-fetch');

exports.exist = repo => {
  var url = fmt('%s://%s/v2/%s/tags/list', repo.schema || 'http', repo.index.name, repo.remoteName);
  return fetch(url)
  .then(res => res.json())
  .then(res => {
    if (!!res.errors) {
      throw Error(fmt("DockerRemoteApiError: '%s': %s", url, res.errors.map(err => err.message).join(", ")));
    }
    return res;
  })
  .then(json => {
    if (!json.tags.includes(repo.tag)) {
      throw Error(fmt("ImageError: tag '%s:%s' not found: %s", repo.localName, repo.tag, url));
    }
    return json;
  });
}