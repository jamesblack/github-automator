var Q = require('q')
  , api = process.env.GITHUB_URL
  , superagent = require('superagent');

module.exports = function(app) {
  app.post("/version-check", function(req, res) {
    console.log("Version Check");

    console.log(req.body);
    if (req.body.ref.toLowerCase() !== "refs/heads/master") { return res.send({}); }
    if (req.body.head_commit.modified.indexOf("package.json") === -1) { return res.send({}); }

    var owner = req.body.repository.owner.name;
    var repo = req.body.repository.name;
    var new_commit_url = api + "/repos/" + owner + "/" + repo + "/git/commits/" + req.body.after;
    var old_commit_url = api + "/repos/" + owner + "/" + repo + "/git/commits/" + req.body.before;

    var old_version, new_version;

    get_commit(old_commit_url)
      .then(get_tree)
      .then(get_package_json_blob)
      .then(
        function (result) {
          var buffer = new Buffer(result.content, "base64");
          old_version = JSON.parse(buffer).version;
          return new_commit_url;
        }
      )
      .then(get_commit)
      .then(get_tree)
      .then(get_package_json_blob)
      .then(
        function (result) {
          var buffer = new Buffer(result.content, "base64");
          new_version = JSON.parse(buffer).version;
        }
      )
      .then(
        function success() {

          // if (old_version !== new_version) {
          //   superagent
          //     .post(api + "/repos/" + owner + "/" + repo + "/releases")
          //     .set('Accept', 'application/json')
          //     .set('User-Agent', 'curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8r zlib/1.2.5')
          //     .set('Content-Type', 'application/json')
          //     .send({
          //       "tag_name": new_version,
          //       "target_commitish": req.body.after,
          //       "name": new_version,
          //       "body": req.body.head_commit.message
          //     })
          //     .auth("jamesblack", "eCgaming1800")
          //     .end(function(error, response) {
          //       if (error) { console.log(error); }
          //       if (!response.ok) { console.log(res.status); }
          //     });

          // }
          res.send({"old_version": old_version, "new_version": new_version});
        },
        function failure(error) {
          console.log(error);
          res.send(error);
        }
      );
  });
};

function get_commit(url) {
  var deferred = Q.defer();

  superagent
    .get(url)
    .set('Accept', 'application/json')
    .set('User-Agent', 'curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8r zlib/1.2.5')
    .set('Content-Type', 'application/json')
    .auth("jamesblack", "eCgaming1800")
    .end(function(error, res) {
      if (error) { deferred.reject(error); }
      if (!res.ok) { deferred.reject(res.status); }
      deferred.resolve(res.body);
    });

    return deferred.promise;
}

function get_tree(commit) {
  var deferred = Q.defer();

  superagent
    .get(commit.tree.url)
    .set('Accept', 'application/json')
    .set('User-Agent', 'curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8r zlib/1.2.5')
    .set('Content-Type', 'application/json')
    .auth("jamesblack", "eCgaming1800")
    .end(function(error, res) {
      if (error) { deferred.reject(error); }
      if (!res.ok) { deferred.reject(res.status); }

      deferred.resolve(res.body);
    });

  return deferred.promise;
}

function get_package_json_blob(tree) {
  var deferred = null;
  var url = null;
  var i;

  for (i = 0; i < tree.tree.length; i++) {
    if (tree.tree[i].path.toLowerCase() === "package.json") {
      url = tree.tree[i].url;
      break;
    }
  }

  if (!url) { return Q.reject({"error": "file not found"}); }

  deferred = Q.defer();

  superagent
    .get(url)
    .set('Accept', 'application/json')
    .set('User-Agent', 'curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8r zlib/1.2.5')
    .set('Content-Type', 'application/json')
    .auth("jamesblack", "eCgaming1800")
    .end(function(error, res) {

      if (error) { deferred.reject(error); }
      if (!res.ok) { deferred.reject(res.status); }

      deferred.resolve(res.body);
    });

  return deferred.promise;
}
