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
    -s, --style <style>              YAML style: k8s, swarm (default: k8s)
    -S, --silently                   generate YAML silently, skip if syntax error, instead of exiting process
    -e, --environment <environment>  append environment to every service definition
    -E, --extend <true or false>     extend default definition (default: true)
    -f, --file <file>                specify an alternate definition file (default: Containerfile)
    -e, --encoding <encoding>        specify an encoding to read/write file (default: utf8)
    --dev <hostname>[/port]          add dev properties to every service definition
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

### --dev \<hostname>[/port]

`--dev` adds several configurations into YAML exposes ports to host for every services. It is design for Spring cloud + eureka project.

```
$ gen-yaml -s swarm --dev 192.169.1.91 $(ls)
```

service use `192.169.1.91` as hostname to registry into Spring eureka, therefor you can discover and access service from eureka.

By defualt `--dev` exposes port starting from 50000, you can determine where to start as well:

```
$ gen-yaml -s swarm --dev 192.169.1.91/40000 $(ls)
```

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
