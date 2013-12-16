/**
 * This file has one endpoint which sits on /version-check via the POST method.
 * It recieves a github commit hook, and then runs through some logic, given the
 * right conditions it will create a release.
 *
 * 1. Make call against the repository in question for last commit before this push
 * 2. From that commit fetch the file_tree at the time that commit was made
 * 3. Grab the package.json blob from the tree, and convert it into json and grab the version
 * 4. Repeat steps 1-3 but with the new commit
 * 5. Compare the version from step 3 and from step 4 if they are different submit a new release
 *
 */


var Q = require('q')
  , api = process.env.GITHUB_URL;

module.exports = function(app) {
  app.post("/version-check", function(req, res) {

    res.send(202);

    var payload = JSON.parse(req.body.payload);

    if (typeof payload === 'undefined') { return console.log("Invalid Payload"); }
    if (payload.ref.toLowerCase() !== "refs/heads/master") { return; }
    if (payload.head_commitmodified.indexOf("package.json") === -1) { return; }

    var owner = payload.repository.owner.name
      , repo = payload.repository.name
      , commit_url = api + "/repos/" + owner + "/" + repo + "/git/commits/"
      , old_version, new_version;

    get_commit(commit_url + payload.before)
      .then(get_tree)
      .then(get_package_json_blob)
      .then(
        function (result) {
          old_version = JSON.parse(new Buffer(result.content, "base64")).version;
          return commit_url + payload.after;
        }
      )
      .then(get_commit)
      .then(get_tree)
      .then(get_package_json_blob)
      .then(
        function (result) {
          new_version = JSON.parse(new Buffer(result.content, "base64")).version;
        }
      )
      .then(
        function success() {

          if (old_version !== new_version) {
            create_release(new_version, payload.after, payload.head_commit.message);
          }

          return console.log({"old_version": old_version, "new_version": new_version});
        },
        function failure(error) { return console.log(error); }
      );
  });
};

function get_commit(url) {
  var deferred = Q.defer();

  superagent
    .get(url)
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
    .end(function(error, res) {
      if (error) { deferred.reject(error); }
      if (!res.ok) { deferred.reject(res.status); }

      deferred.resolve(res.body);
    });

  return deferred.promise;
}

function create_release(new_verion, commit, message) {
  superagent
    .post(api + "/repos/" + owner + "/" + repo + "/releases")
    .send({
      "tag_name": new_version,
      "target_commitish": commit,
      "name": new_version,
      "body": message
    })
    .end(function(error, response) {
      if (error) { console.log(error); }
      if (!response.ok) { console.log(response.status); }
    });
}
