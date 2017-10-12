var path = require('path');
var fs = require("fs-extra");
var yaml = require('js-yaml');
var extend = require('extend');

var defaultService = {
  "deploy": {
    "mode": "replicated",
    "replicas": 1,
    "resources": {
      "limits": {
        "memory": "512M"
      }
    },
    "restart_policy": {
      "condition": "on-failure",
      "delay": "5s"
    }
  },
  "networks": [
    "softleader"
  ]
};
var defaultCompose = {
  "version": "3.3",
  "services": {},
  "networks": {
    "softleader": {
      "external": {
        "name": "softleader"
      }
    }
  }
}

exports.generate = options => {
  var compose = JSON.parse(JSON.stringify(defaultCompose));
  options.args
    .map(dir => path.resolve(dir || ''))
    .filter(dir => fs.statSync(dir).isDirectory())
    .map(dir => path.resolve(dir, options.file))
    .map(file => loadService(file, options.style, options.encoding))
    .forEach(service => extend(true, compose.services, service));
  return yaml.safeDump(compose);
}

function loadService(file, style, encoding) {
  if (!fs.existsSync(file)) {
    console.log('no such file, open \'%s\'', file);
    process.exit(1);
  }
  
  var loaded = yaml.safeLoad(fs.readFileSync(file, encoding));
  if (!loaded) {
    console.log('no content, open \'%s\'', file);
    process.exit(1);
  }

  var styles = Object.keys(loaded);
  if (!styles.includes(style)) {
    console.log('SyntaxError: Must declare \'%s\' style: %s', style, file);
    process.exit(1);
  }

  style = loaded[style];

  var keys = Object.keys(style);
  if (keys.length != 1) {
    console.log('SyntaxError: Must declare exactly 1 service name: %s', file);
    process.exit(1);
  }

  var service = style[keys[0]];
  if (!service || !("image" in service)) {
    console.log('SyntaxError: Must declare \'image\' in service: %s', file);
    process.exit(1);
  }

  var target = JSON.parse(JSON.stringify(defaultService));
  style[keys[0]] = extend(true, target, service);
  return style;
}
