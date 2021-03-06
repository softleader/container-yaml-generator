# Container YAML generator

Command line tool to generate a YAML for Docker Swarm or Kubernetes

> [English](./README_en.md)

## Install

```
$ npm install softleader/container-yaml-generator -g
```

or build from suorce code:

```
$ git clone git@github.com:softleader/container-yaml-generator.git
$ cd container-yaml-generator
$ npm install -g
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

能夠定義的內容及專寫方式完全依照 [compose-file](https://docs.docker.com/compose/compose-file/) 的規範, 在 swarm style 中已經有先定義了一組預設的設定, 在產出 yaml 時如果你沒設定就會直接套用預設設定

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
    - net0
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

### Dev mode

dev 模式僅適用於 spring boot + spring eureka 架構, 會自動的 publish port 出來到讓開發人員可以從外面連到 docker 內

```
$ gen-yaml -s swarm --dev-ipAddress 192.168.1.60 --dev-port 50000 --dev-ignore some-service $(ls)
```

- `--dev-ipAddress` - 會設定給 `-Deureka.instance.ipAddress` 及  `-Deureka.instance.hostname`
- `--dev-port` - 要從什麼 port 開始依序 publish
- `--dev-ignore` - 要忽略套用的 service 名稱

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

### 動態對所有服務增加更多的環境參數

```
$ gen-yaml -s swarm -o docker-compose.yml \
	-e DEVOPS_OPTS="-DdataSource.username=xxx -DdataSource.password=ooo" $(ls)
```

產生後 yaml 就會加上:

```yml
# docker-compose.yml

setting-system-param-rpc:
  image: 'softleader.com.tw:5000/softleader-setting-system-param-rpc:${TAG}'
  deploy:
    ...
  environment:
    DEVOPS_OPTS: '-DdataSource.username=xxx -DdataSource.password=ooo'
```

*DEVOPS_OPTS* 是所有 rpc 預留的 docker 環境變數，可以強制覆蓋 config-server 回傳的參數

> 可用在部署公司測試環境時，更換掉客戶的 config-server 中的某些參數
