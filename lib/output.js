// var ora = require('ora');
var fs = require("fs-extra");
var path = require('path');

exports.write = (whereTo, content, encoding) => {
  if (!!whereTo) {
    // var spinner = ora("Writing '" + path.resolve(whereTo) + "'...").start();
    try {
      fs.writeFileSync(whereTo, content, encoding);
      // spinner.succeed("Writing '" + path.resolve(whereTo) + "', done.");
      console.info("Writing '" + path.resolve(whereTo) + "', done.");
    } catch (err) {
      // spinner.fail("Failed to write file: " + err);
      console.error("Failed to write file: " + err);
    }
  } else {
    console.log(content);
  }
}