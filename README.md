# Container YAML generator

Command line tool to generate a YAML for Docker Swarm or Kubernetes

## Install

Clone and install via npm

```
$ git clone git@github.com:softleader/container-yaml-generator.git
$ cd container-yaml-generator
$ npm install -g
```

## Usage

![](./doc/overview.svg)

```
$ gen-yaml --help

  Usage: gen-yaml [options] <dirs ...>

  Generate YAML for Docker Swarm or Kubernetes


  Options:

    -o --output <output>      write to a file, instead of STDOUT
    -s --style <style>        YAML style, supports 'swarm' or 'k8s' (default: swarm)
    -f --file <file>          specify an alternate definition file (default: Containerfile)
    -e --encoding <encoding>  specify an encoding to read definition file (default: utf8)
    -V, --version             output the version number
    -h, --help                output usage information

  https://github.com/softleader/container-yaml-generator#readme

```

## Example

### 產生當前目錄下所有子目錄的 YAML

假設目錄結構如下:

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

在 `~/temp` 中執行:

```
$ gen-yaml -o docker-compose.yml $(ls)
```

則會產生 `~/temp/docker-compose.yml` 檔案, 裡面包含了上述 4 個 rpc 服務

### 依照指定目錄產生 YAML

```
$ gen-yaml -o docker-compose.yml .
```

則產生的 `docker-compose.yml` 檔案只包含當前目錄中的服務 

