# Container YAML generator

Command line tool to generate a YAML for Docker Swarm or Kubernetes


## Install

```
$ npm install softleader/container-yaml-generator -g
$ gen-yaml --version
17.11.5
```

or build from suorce code:

```
$ git clone git@github.com:softleader/container-yaml-generator.git
$ cd container-yaml-generator
$ npm install -g
$ gen-yaml --version
17.11.5
```

or run on Docker:

```
$ docker run -itd -v path/to/gen-yaml-dir:/app softleader/gen-yaml
74c01f835b14f73d4b7e396c8377c9e3e2616e67f2893855f63fbd21ff6290f8

$ docker exec 74c0 gen-yaml --version
17.11.5
```

`path/to/gen-yaml-dir` is the root dir where you want `gen-yaml` to access

## Usage

![](./doc/overview.svg)

```
$ gen-yaml --help

  Usage: index [options] <dirs...>

  Generate YAML for Docker Swarm or Kubernetes


  Options:

    -o, --output <output>            write to a file, instead of STDOUT
    -s, --style <style>              YAML style: k8s, swarm (default: k8s) (default: k8s)
    -S, --silently                   generate YAML silently, skip if syntax error, instead of exiting process
    -e, --environment <environment>  append environment to every service definition (default: )
    -E, --extend <true or false>     extend default definition (default: true) (default: true)
    -f, --file <file>                specify an alternate definition file (default: Containerfile) (default: Containerfile)
    --net0 <net0>                    specify a external network for 'net0'
    --volume0 <volume0>              specify a device for 'volume0'
    -e, --encoding <encoding>        specify an encoding to read/write file (default: utf8) (default: utf8)
    --dev-ipAddress <ipAddress>      activate dev mode, will add ipAddress properties to every service definition
    --dev-port <port>                determine dev port in dev mode
    --dev-ignore <ignore>            determine dev ignore service names in dev mode
    -V, --version                    output the version number
    -h, --help                       output usage information

  https://github.com/softleader/container-yaml-generator#readme
```

## Containerfile

A *Containerfile* is a YAML file, which usually place in the root directory of the project, contains the definition of service in Kubernetes or Docker Swarm, 


```
your-app
├── src
│   ├── main
│   └── test
├── pom.xml
├── Containerfile
└── ...
```

The top level in *Containerfile* determines style:

```yaml
swarm:
  ...
k8s:
  ...
```

- `swarm` - for Docker Swarm
- `k8s` - for Kubernetes

### swarm

You can use every syntax of [compose-file](https://docs.docker.com/compose/compose-file/) version 3.3 format in each service swarm configuration. Every service configuration extends a default configuration by defualt.

> You can `$ gen-yaml --extend false ...` to switch off the extension

#### A real Containerfile example

```yaml
swarm:
  common-file-upload-rpc:
    image: 'softleader/eureka'
    volumes:
      - '/tmp/uploaded:/uploaded'
    deploy:
      resources:
        limits:
          cpus: '0.5'
```

after `gen-yaml`

```yaml
common-file-upload-rpc:
  image: 'softleader/eureka'
  volumes:
    - '/tmp/uploaded:/uploaded'
  deploy:
    mode: replicated
    replicas: 1
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
    restart_policy:
      condition: on-failure
      delay: 5s
  networks:
    - net0
```

#### A minimum Containerfile

All you have to do is just define service name and image

```yaml
swarm:
  calculate-rpc:
    image: softleader.com.tw:5000/softleader-calculate-rpc:v1.0.0
```

### k8s

Kubernetes style YAML is coming soon :)

### Dev mode

dev mode is design for Spring cloud + eureka artitecture projects, it publishes port to docker automatically to let developer access from outside docker 

```
$ gen-yaml -s swarm --dev-ipAddress 192.168.1.60 --dev-port 50000 --dev-ignore some-service $(ls)
```

- `--dev-ipAddress` - will add `-Deureka.instance.ipAddress` and  `-Deureka.instance.hostname` to system properties
- `--dev-port` - determine a port to start publish
- `--dev-ignore` - determine the service name to ignore apply dev mode

## Example

### Generate YAML by all subdir in current dir

```
~/temp
├── softleader-calculate-ratio-rpc
│   └── Containerfile
├── softleader-calculate-rpc
│   └── Containerfile
├── softleader-common-file-upload-rpc
│   └── Containerfile
└── softleader-common-seq-number-rpc
    └── Containerfile
```

```
$ pwd
~/temp

$ gen-yaml -s swarm -o docker-compose.yml $(ls)
```


### Generate YAML in current dir

```
$ gen-yaml -s swarm -o docker-compose.yml .
```


### Add environment to every service definitions

```
$ gen-yaml -s swarm -o docker-compose.yml \
	-e DEVOPS_OPTS="-DdataSource.username=xxx -DdataSource.password=ooo" $(ls)
```


```yaml
# docker-compose.yml

setting-system-param-rpc:
  image: 'softleader/eureka'
  deploy:
    ...
  environment:
    DEVOPS_OPTS: '-DdataSource.username=xxx -DdataSource.password=ooo'
```
