#!/usr/bin/env node

var program = require('commander');
var swarm = require('./lib/swarm');
var kubernetes = require('./lib/kubernetes');
var pjson = require('./package.json');
var cmd = Object.keys(pjson.bin)[0];

program
  .usage('[options] <dirs ...>')
  .description('Generate YAML for Docker Swarm or Kubernetes')
  .option('-o --output <output>', 'write to a file, instead of STDOUT')
  .option('-s --style <style>', 'YAML style, supports \'swarm\' or \'k8s\' (default: swarm)', 'swarm')
  .option('-f --file <file>', 'specify an alternate definition file (default: Containerfile)', 'Containerfile')
  .option('-e --encoding <encoding>', 'specify an encoding to read definition file (default: utf8)', 'utf8')
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

if (program.style === 'k8s') {
  kubernetes.generate(program);
} else if (program.style === 'swarm') {
  swarm.generate(program);
} else {
  console.log('Unsupported YAML style: %s', program.style);
  console.log('See \'%s --help\'.', cmd);
  process.exit(1);
}