#!/usr/bin/env node

var program = require('commander');
var swarm = require('./lib/swarm');
var kubernetes = require('./lib/kubernetes');
var output = require("./lib/output");
var image = require("./lib/image");
var pjson = require('./package.json');
var cmd = Object.keys(pjson.bin)[0];
var path = require('path');
var ora = require('ora');
var fmt = require('util').format;
var drc = require('docker-registry-client');

function collect(val, collection) {
  collection.push(val);
  return collection;
}

function bool(val) {
  return val == 'true';
}

program
  .usage('[options] <dirs...>')
  .description('Generate YAML for Docker Swarm or Kubernetes')
  .option('-o, --output <output>', 'write to a file, instead of STDOUT')
  .option('-s, --style <style>', 'YAML style: k8s, swarm (default: k8s)', 'k8s')
  .option('-S, --silently', 'generate YAML silently, skip if syntax error, instead of exiting process')
  .option('-e, --environment <environment>', 'append environment to every service definition', collect, [])
  .option('-E, --extend <extend>', 'extend default definition (default: true)', bool, true)
  .option('-f, --file <file>', 'specify an alternate definition file (default: Containerfile)', 'Containerfile')
  .option('-e, --encoding <encoding>', 'specify an encoding to read/write file (default: utf8)', 'utf8')
  .option('-r, --replace <replace>', 'searches a string, or a regular expression and replaces to a new string in generated YAML.', collect, [])
  .on('--help', function() {
    console.log();
    console.log('  %s', pjson.homepage);
    console.log();
  })
  .version(pjson.version)
  .parse(process.argv);

if (!program.args || program.args.length <= 0) {
  console.log('"%s" requires at least one argument.', cmd);
  console.log('See \'%s --help\'.', cmd);
  process.exit(1);
}

var yaml;

if (program.style === 'k8s') {
  yaml = kubernetes.generate(program);
} else if (program.style === 'swarm') {
  yaml = swarm.generate(program);
} else {
  console.log('Unsupported YAML style: %s', program.style);
  console.log('See \'%s --help\'.', cmd);
  process.exit(1);
}

if (program.replace.length > 0) {
  program.replace
    .map(r => r.split('='))
    .forEach(r => {
      var search = r[0];
      var replace = r[1];
      if (search.startsWith('/')) {
        var lastSlash = search.lastIndexOf("/");
        search = new RegExp(search.slice(1, lastSlash), search.slice(lastSlash + 1));
      }
      yaml = yaml.replace(search, replace);
    });
}

if (!program.silently) {
  var fetches = extractImages(yaml)
    .map(drc.parseRepoAndTag)
    .filter(repo => !repo.official)
    .map(repo => {
      repo.schema = 'http';
      return image.exist(repo);
    })
  Promise.all(fetches)
  .then(images => {
    output.write(program.output, yaml, program.encoding);
  })
  .catch(err => {
    console.log(err.message);
    process.exit(1);
  });
} else {
  output.write(program.output, yaml, program.encoding);
}

function extractImages(yaml) {
  var images = [], regex = /image: '(.+)'/g, result;
  while (result = regex.exec(yaml)) {
    images.push(result[1]);
  }
  return images;
}