var fmt = require('util').format;
var fetch = require('node-fetch');

exports.exist = repo => {
  var url = fmt('%s://%s/v2/%s/tags/list', repo.schema || 'http', repo.index.name, repo.remoteName);
  return fetch(url)
  .then(response => {
    if (!response.ok || response.status !== 200) {
      throw Error(fmt("DockerRemoteApiError: '%s': [%s] %s", url, response.status, response.statusText));
    }
    return response;
  })
  .then(res => res.json())
  .then(json => {
    if (!json.tags.includes(repo.tag)) {
      throw Error(fmt("ImageError: tag not found, make sure '$ docker pull %s:%s' works", repo.localName, repo.tag));
    }
    return json;
  });
}