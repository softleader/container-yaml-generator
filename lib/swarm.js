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
    .map(file => loadService(file, options))
    .forEach(service => extend(true, compose.services, service));
  return yaml.safeDump(compose);
}

function loadService(file, options) {
  if (!fs.existsSync(file)) {
    if (!options.silently) {
      console.log('no such file, open \'%s\'', file);
      process.exit(1);
    } else {
      return;
    }
  }
  
  var loaded = yaml.safeLoad(fs.readFileSync(file, options.encoding));
  if (!loaded) {
    if (!options.silently) {
      console.log('no content, open \'%s\'', file);
      process.exit(1);
    } else {
      return;
    }
  }

  var styles = Object.keys(loaded);
  if (!styles.includes(options.style)) {
    if (!options.silently) {
      console.log('does not include \'%s\' style, open \'%s\'', options.style, file);
      process.exit(1);
    } else {
      return;
    }
  }

  var style = loaded[options.style];

  var keys = Object.keys(style);
  if (keys.length != 1) {
    if (!options.silently) {
      console.log('SyntaxError: Must declare exactly 1 service name: %s', file);
      process.exit(1);
    } else {
      return;
    }
  }

  var service = style[keys[0]];
  if (!service || !("image" in service)) {
    if (!options.silently) {
      console.log('SyntaxError: Must declare \'image\' in service: %s', file);
      process.exit(1);
    } else {
      return;
    }
  }

  if (options.extend) {
    var target = JSON.parse(JSON.stringify(defaultService));
    style[keys[0]] = extend(true, target, service);
  }

  return style;
}
