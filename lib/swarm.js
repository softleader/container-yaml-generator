var path = require('path');
var fs = require("fs-extra");
var yaml = require('js-yaml');
var extend = require('extend');

var defaultService = {
  "deploy": {
    "mode": "replicated",
    "resources": {
      "limits": {
        "cpus": "2",
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
  "version": "3.6",
  "networks": {
    "net0": {
      "driver": "overlay"
    }
  },
  "services": {}
};
var constraintsOnWorker = {
  "placement": {
    "constraints": ['node.role!=manager']
  }
};

exports.generate = options => {
  var compose = JSON.parse(JSON.stringify(defaultCompose));
  if (!!options.net0) {
    compose.networks.net0 = {
      "external": {
        "name": options.net0
      }
    }
  }
  if (!!options.volume0) {
    compose.volumes = {
      "volume0": {
        "driver_opts": {
          "device": options.volume0
        }
      }
    }
  }
  if (!options.devPort) {
    options.devPort = 50000
  }

  options.devPortPublishFrom = options.devIpAddress ? options.devPort : undefined
  options.devPortPublishTo = 0;
  options.args
    .map(dir => path.resolve(dir || ''))
    .filter(dir => fs.statSync(dir).isDirectory())
    .map(dir => path.resolve(dir, options.file))
    .map(file => loadService(file, options))
    .forEach(services => services.forEach(service => extend(true, compose.services, service)));
  if (options.devPortPublishFrom && options.devPortPublishTo > 0) {
    console.log("Auto publish port from [%s] to [%s]", options.devPortPublishFrom, options.devPortPublishTo)
  }
  return yaml.safeDump(compose);
}

function loadService(file, options) {
  if (!fs.existsSync(file)) {
    if (!options.silently) {
      console.error('no such file, open \'%s\'', file);
      process.exit(1);
    } else {
      return;
    }
  }
  
  var loaded 
  try {
    loaded = yaml.safeLoad(fs.readFileSync(file, options.encoding));
  } catch (err) {
    console.error('error loading %s', file);
    throw err
  }
  if (!loaded) {
    if (!options.silently) {
      console.error('no content, open \'%s\'', file);
      process.exit(1);
    } else {
      return;
    }
  }

  var styles = Object.keys(loaded);
  if (!styles.includes(options.style)) {
    if (!options.silently) {
      console.error('does not include \'%s\' style, open \'%s\'', options.style, file);
      process.exit(1);
    } else {
      return;
    }
  }

  var style = loaded[options.style];

  var keys = Object.keys(style);
  // if (keys.length != 1) {
  //   if (!options.silently) {
  //     console.error('SyntaxError: Must declare exactly 1 service name: %s', file);
  //     process.exit(1);
  //   } else {
  //     return;
  //   }
  // }

  return keys.map(name => {
    var service = style[name];
    if (!service || !("image" in service)) {
      if (!options.silently) {
        console.error('SyntaxError: Must declare \'image\' in service: %s', file);
        process.exit(1);
      } else {
        return;
      }
    }
  
    if (options.extend) {
      var target = JSON.parse(JSON.stringify(defaultService));
      style[name] = extend(true, target, service);
    }
  
    var regex = /(.+\/)?([\w\d-]+)(:.+)?/g;
    var match = regex.exec(service.image);
    var app = match ? match[2]: name
    if (!style[name].deploy.labels) {
      style[name].deploy.labels = {}
    }
    style[name].deploy.labels['app'] = app
    
    options.environment
      .map(r => r.split('='))
      .forEach(e => {
        if (!style[name].environment) {
          style[name].environment = {};
        }
        style[name].environment[e[0]] = e.slice(1).join("=")
      });
   
    // options.publish
    //   .forEach(p => {
    //     if (!style[name].ports) {
    //       style[name].ports = [];
    //     }
    //     style[name].ports.push(p);
    //   });
  
     if (options.devIpAddress) {
      if (!options.devIgnore || !options.devIgnore.includes(name)) {
        if (!style[name].ports) {
          style[name].ports = [];
        }
        style[name].ports.push(options.devPort + ":" + options.devPort);
    
        if (!style[name].environment) {
          console.log("Skip appending publish ports to 'DEVOPS_OPTS' because not found any 'environment' in Containerfile of [%s]", name);
        } else {
          let DEVOPS_OPTS = style[name].environment['DEVOPS_OPTS'];
          if (!DEVOPS_OPTS) {
            console.log("Skip appending publish ports to 'DEVOPS_OPTS' because not found any 'environment.DEVOPS_OPTS' in Containerfile of [%s]", name);
          } else {
            style[name].environment['DEVOPS_OPTS'] = DEVOPS_OPTS
                                                    + ' -Dserver.port.random.enable=false'
                                                    + ' -Deureka.instance.preferIpAddress=true'
                                                    + ' -Deureka.instance.hostname=' + options.devIpAddress
                                                    + ' -Deureka.instance.ipAddress=' + options.devIpAddress
                                                    + ' -Dserver.port=' + options.devPort;
            options.devPortPublishTo = options.devPort;
            options.devPort++;
          }
        }
      }
    }
  
    // 我們不在允許 container 可以開在 master, 因此當發現有指定要開在 master 就將之移除 (有些舊專案會這樣設定)
    if (style[name].deploy.placement) {
      removeConstraint(style[name].deploy.placement.constraints, "node.role==manager", name)
    }
    // 強制加上限制條件: container 只能開在非 master node 上 :\
    if (!style[name].deploy.placement) {
      style[name].deploy.placement = {};
    }
    if (!style[name].deploy.placement.constraints) {
      style[name].deploy.placement.constraints = [];
    }
    style[name].deploy.placement.constraints = [...constraintsOnWorker.placement.constraints, ...style[name].deploy.placement.constraints];
  
    return style;
  })
}

function removeConstraint(array, element, name) {
  if (array && array.length > 0) {
    const index = array.findIndex(constraint => {
      return element.replace(/\s+/g, '') === constraint.replace(/\s+/g, '');
    });
    if (index !== -1) {
      console.log('[%s] constraint "%s", which is not allowed, will be removed.', name, element);
      array.splice(index, 1);
    }
  }
}
