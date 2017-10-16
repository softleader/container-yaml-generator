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

    -o, --output <output>            write to a file, instead of STDOUT
    -s, --style <style>              YAML style: k8s, swarm (default: k8s)
    -S, --silently                   generate YAML silently, skip if syntax error, instead of exiting process
    -e, --environment <environment>  append environment to every service definition
    -E, --extend <extend>            extend default definition (default: true)
    -f, --file <file>                specify an alternate definition file (default: Containerfile)
    -e, --encoding <encoding>        specify an encoding to read/write file (default: utf8)
    -r, --replace <replace>          searches a string, or a regular expression and replaces to a new string in generated YAML.
    -V, --version                    output the version number
    -h, --help                       output usage information

  https://github.com/softleader/container-yaml-generator#readme
```

## Containerfile

*Containerfile* 定義了該 app 在部署時會用到的資源, 預設讀取位置是專案的 root:

```
your-app
├── src
│   ├── main
│   └── test
├── pom.xml
├── Dockerfile
├── Jenkinsfile
└── Containerfile
```

*Containerfile* 一共分成兩種定義的 style:

- `swarm` - for Docker Swarm
- `k8s` - for Kubernetes

sytle 一定要在整份 *Containerfile* 的第一層:

```yaml
swarm:
  ...
  
k8s:
  ...
```

### swarm

能夠定義的內容及專寫方式完全依照 [compose-file](https://docs.docker.com/compose/compose-file/) 的規範

#### default

以下是預設的內容, 也就是下述這些 tag 如果你沒定義, 將直接使用預設的內容:

```yaml
deploy:
  mode: replicated
  replicas: 1
  resources:
    limits:
      memory: 512M
  restart_policy:
    condition: on-failure
    delay: 5s
networks:
- softleader
```

#### a real Containerfile example

```yaml
swarm:
  common-file-upload-rpc:
    image: softleader.com.tw:5000/softleader-common-file-upload-rpc:${TAG}
    volumes:
      - /tmp/uploaded:/uploaded
    deploy:
      resources:
        limits:
          cpus: '0.5'
```

經過 `gen-yaml` 轉換後將會變成:

```yaml
common-file-upload-rpc:
  image: 'softleader.com.tw:5000/softleader-common-file-upload-rpc:${TAG}'
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
    - softleader
```

#### a minimum Containerfile

如果你沒有任何額外設定, 一個最小的 *Containerfile* 只需要定義 service name 以及其 image 位置即可

```yaml
swarm:
  calculate-rpc:
    image: softleader.com.tw:5000/softleader-calculate-rpc:${TAG}
```

### k8s

Kubernetes style YAML is coming soon :)

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
$ gen-yaml -s swarm -o docker-compose.yml $(ls)
```

則會產生 `~/temp/docker-compose.yml` 檔案, 裡面包含了上述 4 個 rpc 服務

### 產生當前目錄的 YAML

```
$ gen-yaml -s swarm -o docker-compose.yml .
```

則產生的 `docker-compose.yml` 檔案只包含當前目錄中的服務 

### 產生 YAML 後將 ${TAG} 取代成 v1.0.0

```
$ gen-yaml -s swarm -o docker-compose.yml -r /\\\${TAG}/g=v1.0.0 $(ls)
```

### 動態對所有服務增加更多的環境參數


```
$ gen-yaml -s swarm -o docker-compose.yml -e DEVOPS_OPTS=“-DdataSource.username=xxx -DdataSource.password=ooo” $(ls)
```

*DEVOPS_OPTS* 是所有 rpc 預留的 docker 環境變數，可以強制覆蓋 config-server 回傳的參數

> 可用在部署公司測試環境時，更換掉客戶的 config-server 中的某些參數