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
        "cpus": "1",
        "memory": "512M"
      }
    },
    "restart_policy": {
      "condition": "on-failure",
      "delay": "5s",
      "max_attempts": 720
    },
    "update_config": {
      "parallelism": 1,
      "delay": "10s",
      "failure_action": "continue",
      "monitor": "60s",
      "max_failure_ratio": 0.3  
    }
  },
  "networks": [
    "net0"
  ]
};
var defaultCompose = {
  "version": "3.3",
  "services": {},
  "networks": {
    "net0": {
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

  var name = keys[0];
  var service = style[name];
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
    style[name] = extend(true, target, service);
  }

  options.environment
    .map(r => r.split('='))
    .forEach(e => {
      if (!style[name].environment) {
        style[name].environment = {};
      }
      style[name].environment[e[0]] = e.slice(1).join("=")
    });
    
  return style;
}
