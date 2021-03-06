#!/usr/bin/env node

var program = require('commander');
var swarm = require('./lib/swarm');
var kubernetes = require('./lib/kubernetes');
var output = require("./lib/output");
var image = require("./lib/image");
var pjson = require('./package.json');
var cmd = Object.keys(pjson.bin)[0];
var path = require('path');
var fmt = require('util').format;
var drc = require('docker-registry-client');
var jsyaml = require('js-yaml');
// var dot = require('dot-object');

function collect(val, collection) {
  collection.push(val);
  return collection;
}

function bool(val) {
  return val == 'true';
}

// function keyValue(val, collection) {
//   val = val.split('=');
//   let key = val[0];
//   let value = val.slice(1).join('=');
//   if (!key) {
//     console.log("  error: option `-D <%s>=[%s]' argument missing", key, value);
//     process.exit(1);   
//   }
//   collection.push({key: key, value: value});
//   return collection;
// }

// function dev(val) {
//   val = val.split('/');
//   let hostname = val[0];
//   let port = val[1] || '50000';
//   let ignore = val[2] || ''
//   return {
//     hostname: hostname,
//     port: parseInt(port),
//     ignore: ignore.split(",")
//   };
// }

program
  .usage('[options] <dirs...>')
  .description('Generate YAML for Docker Swarm or Kubernetes')
  .option('-o, --output <output>', 'write to a file, instead of STDOUT')
  .option('-s, --style <style>', 'YAML style: k8s, swarm (default: k8s)', 'k8s')
  .option('-S, --silently', 'generate YAML silently, skip if syntax error, instead of exiting process', 0)
  .option('-e, --environment <environment>', 'append environment to every service definition', collect, [])
  .option('-E, --extend <true or false>', 'extend default definition (default: true)', bool, true)
  .option('-f, --file <file>', 'specify an alternate definition file (default: Containerfile)', 'Containerfile')
  .option('--net0 <net0>', 'specify a external network for \'net0\'')
  .option('--volume0 <volume0>', 'specify a device for \'volume0\'')
  .option('-e, --encoding <encoding>', 'specify an encoding to read/write file (default: utf8)', 'utf8')
  // .option('-D <name>=[value]', 'set a YAML property.', keyValue, [])
  .option('--dev-ipAddress <ipAddress>', 'activate dev mode, will add ipAddress properties to every service definition')
  .option('--dev-port <port>', 'determine dev port in dev mode', parseInt)
  .option('--dev-ignore <ignore>', 'determine dev ignore service names in dev mode')
  .on('--help', function() {
    console.log();
    console.log('  %s', pjson.homepage);
    console.log();
  })
  .version(pjson.version)
  .parse(process.argv);

if (!program.args || program.args.length <= 0) {
  console.error('"%s" requires at least one argument.', cmd);	
  console.error('See \'%s --help\'.', cmd);
  process.exit(1);
}

var yaml;

if (program.style === 'k8s') {
  yaml = kubernetes.generate(program);
} else if (program.style === 'swarm') {
  yaml = swarm.generate(program);
} else {
  console.error('Unsupported YAML style: %s', program.style);
  console.error('See \'%s --help\'.', cmd);
  process.exit(1);
}

// if (program.replace.length > 0) {
//   program.replace
//     .map(r => r.split('='))
//     .forEach(r => {
//       var search = r[0];
//       var replace = r[1];
//       if (search.startsWith('/')) {
//         var lastSlash = search.lastIndexOf("/");
//         search = new RegExp(search.slice(1, lastSlash), search.slice(lastSlash + 1));
//       }
//       yaml = yaml.replace(search, replace);
//     });
// }

// if (program.D.length > 0) {
//   var loaded = jsyaml.safeLoad(yaml);
//   program.D.forEach(d => {
//       try {
//         dot.str(d.key, d.value, loaded);
//       } catch (error) {
//         console.log('%s to [%s]', error, value);
//         process.exit(1);    
//       }
//     });
//   yaml = jsyaml.safeDump(loaded);
// }

if (!program.silently) {
  var fetches = extractImages(program.style, yaml)
    .filter(repo => {
      try {
        !drc.parseRepo(repo.split(':')[0]).index.official
      } catch (err) {
        console.error('error checking %s', repo);
        throw err
      }
    })
    .map(drc.parseRepoAndTag)
    .map(repo => {
      repo.schema = 'http';
      return image.exist(repo);
    })
  Promise.all(fetches)
  .then(images => {
    output.write(program.output, yaml, program.encoding);
  })
  .catch(err => {
    console.error(err.message);
    console.error("\n\n" + yaml)
    process.exit(1);
  });
} else {
  output.write(program.output, yaml, program.encoding);
}

function extractImages(style, yaml) {
  let y = jsyaml.safeLoad(yaml);
  if (style == "swarm") {
    // let regex = /image: (.+)/g, result;
    // while (result = regex.exec(yaml)) {
    //   images.push(result[1].replace(/'/g, ''));
    // }
    // console.log(images);
    return Object.keys(y.services).map(key => y.services[key].image)
  } 
  // k8s
  else {
    return [];
  }
}