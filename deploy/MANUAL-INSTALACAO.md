# Manual de instalação — BarGenerator

**Versão da imagem:** `bargenerator:1.0.0`

**Plataforma:** Linux `amd64` (Intel/AMD x86-64)

**Público:** equipe de infraestrutura.

## 1. Objetivo

Disponibilizar um serviço que recebe o conteúdo pela URL e retorna uma imagem PNG de código de barras. O servidor Sankhya na nuvem precisa acessar esse serviço durante a geração dos relatórios.

Fluxo: **Sankhya na nuvem → domínio HTTPS → proxy reverso → BarGenerator**.

O computador do usuário não precisa permanecer ligado depois que a aplicação estiver instalada no servidor oficial.

## 2. Pré-requisitos

- Servidor com Docker funcionando e suporte a contêineres Linux amd64.
- Docker Compose com suporte a `docker compose up --wait`.
- Permissão para executar comandos Docker.
- Porta local disponível; padrão: TCP 3000.
- Para acesso do Sankhya: domínio acessível, certificado HTTPS válido e proxy reverso.
- Configuração do Docker para iniciar junto com o servidor.

Não é necessário instalar Node.js, npm ou banco de dados. A imagem contém a aplicação e suas dependências. A instalação pelo pacote não exige baixar a imagem de um registro.

No Windows, o ambiente Docker deve suportar contêineres Linux. Um host configurado apenas para contêineres Windows não executa esta imagem. Em servidor ARM, solicite uma imagem compatível.

## 3. Arquivos da entrega

Extraia `bargenerator-docker-1.0.0-linux-amd64.zip` para uma pasta permanente no servidor. Mantenha os arquivos juntos:

| Arquivo | Finalidade |
|---|---|
| `bargenerator-1.0.0-linux-amd64.tar.gz` | Imagem Docker exportada |
| `compose.yaml` | Configuração do serviço |
| `instalar.sh` | Instalador Linux |
| `instalar.ps1` | Instalador PowerShell |
| `SHA256SUMS.txt` | SHA-256 da imagem para conferir a transferência |
| `LEIA-ME.txt` | Instruções resumidas |

Este manual pode ser enviado separadamente do ZIP original.

Exemplos de pasta: `/opt/bargenerator` no Linux ou `C:\BarGenerator` no Windows. Execute os comandos a seguir na pasta que contém o `compose.yaml`.

## 4. Conferir o ambiente e a integridade

Verifique se o Docker está disponível:

```sh
docker version
docker compose version
```

No Linux:

```sh
sha256sum -c SHA256SUMS.txt
```

O resultado deve indicar `OK`.

No PowerShell:

```powershell
Get-FileHash .\bargenerator-1.0.0-linux-amd64.tar.gz -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

Compare os hashes, desconsiderando maiúsculas e minúsculas. Se divergirem, transfira novamente a imagem antes de instalar.

## 5. Instalar

### Linux

```sh
sh instalar.sh
```

### Windows com Docker para contêineres Linux

```powershell
.\instalar.ps1
```

Se a política da empresa impedir execução de scripts, use a instalação manual abaixo, sem alterar a política.

### Instalação manual

Os mesmos comandos funcionam em Linux e PowerShell:

```sh
docker load -i bargenerator-1.0.0-linux-amd64.tar.gz
docker compose up -d --wait --wait-timeout 90
docker compose ps
```

O instalador importa a imagem e inicia o serviço. O Compose usa `pull_policy: never`: se a imagem não estiver carregada, a inicialização falhará em vez de tentar baixá-la.

Aguarde o estado **healthy**. Se houver erro:

```sh
docker compose logs --tail 100
```

## 6. Validar no próprio servidor

No Linux:

```sh
curl --fail http://127.0.0.1:3000/health
curl --fail "http://127.0.0.1:3000/barcode.png?tipo=code128&texto=123456789&rotacao=90" -o teste-barcode.png
```

No PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-WebRequest "http://127.0.0.1:3000/barcode.png?tipo=code128&texto=123456789&rotacao=90" -OutFile teste-barcode.png
```

A rota de saúde deve retornar:

```json
{"status":"ok"}
```

Abra `teste-barcode.png` e confira a imagem. A interface está disponível em `http://127.0.0.1:3000/` no próprio servidor.

## 7. Configurar porta e interface de rede

Por padrão, o Compose publica **127.0.0.1:3000** no servidor. Isso permite que um proxy reverso no mesmo host acesse a aplicação, sem publicar diretamente a porta em todas as interfaces.

Para mudar a porta, crie um arquivo chamado `.env` ao lado do `compose.yaml`:

```dotenv
ENDERECO_PUBLICACAO=127.0.0.1
PORTA_PUBLICA=3001
```

Aplique:

```sh
docker compose up -d --wait --wait-timeout 90
```

Nesse exemplo, o proxy e os testes devem usar a porta 3001. A porta interna do contêiner continua sendo 3000.

Se o projeto de rede exigir acesso direto por outra máquina, configure uma interface apropriada ou `ENDERECO_PUBLICACAO=0.0.0.0`. Restrinja o acesso no firewall conforme a topologia. Essa configuração, por si só, não cria HTTPS nem resolve NAT ou CGNAT.

## 8. Publicar por HTTPS

A infraestrutura deve:

1. Definir um domínio, por exemplo `barcode.empresa.com.br`.
2. Configurar o DNS para o ponto de entrada da empresa.
3. Configurar certificado válido e sua renovação.
4. Configurar um proxy reverso para encaminhar as requisições ao BarGenerator.
5. Preservar caminho e parâmetros da URL.
6. Confirmar a acessibilidade a partir do servidor Sankhya na nuvem.

**Proxy no mesmo host:** destino padrão `http://127.0.0.1:3000`.

**Proxy em outro contêiner:** `127.0.0.1` aponta para o próprio contêiner do proxy. A infraestrutura deve configurar uma rede Docker compartilhada e usar o nome de serviço `bargenerator:3000`, garantindo que ambos estejam nessa rede.

**Proxy em outra máquina:** usar o IP de rede do servidor, configurar a publicação da porta e restringir o acesso ao proxy.

A aplicação não possui autenticação. Caso seja possível, restrinja o acesso pelos IPs de saída do Sankhya, confirmados com a hospedagem. Não aplique login interativo, CAPTCHA ou desafios de navegador à rota de imagem: JasperReports precisa recebê-la diretamente.

O parâmetro `texto` pode conter dados de negócio. Considere não registrar a query string nos logs do proxy.

Teste o endereço definitivo:

```sh
curl --fail https://barcode.empresa.com.br/health
curl --fail "https://barcode.empresa.com.br/barcode.png?tipo=code128&texto=123456789&rotacao=90" -o teste-publico.png
```

Substitua o domínio de exemplo pelo domínio real. Validar pelo navegador do usuário não substitui o teste a partir do ambiente Sankhya.

## 9. Configurar a URL no iReport

Substitua o endereço local pelo domínio definitivo:

```text
https://barcode.empresa.com.br/barcode.png?tipo=code128&texto=123456789&rotacao=90
```

Para conteúdo dinâmico, configure o componente **Image** com a classe de expressão `java.net.URL`. Exemplo, substituindo `CODIGO` pelo campo real:

```java
new java.net.URL(
    "https://barcode.empresa.com.br/barcode.png?tipo=code128&dpi=203&modulo=2&altura=15&rotacao=90&texto="
    + java.net.URLEncoder.encode(
        $F{CODIGO} == null ? "" : $F{CODIGO}.toString(),
        "UTF-8"
    )
)
```

Trate campos nulos ou vazios no relatório, por exemplo com **Print When Expression**. A API rejeita conteúdo vazio.

Parâmetros disponíveis:

| Parâmetro | Padrão | Valores |
|---|---|---|
| `texto` | Obrigatório | 1 a 120 caracteres, codificados na URL |
| `tipo` | `code128` | `code128`, `code39`, `ean13`, `ean8`, `upca`, `interleaved2of5`, `qrcode`, `datamatrix` |
| `dpi` | `203` | `203`, `300` ou `600` |
| `modulo` | `2` | Inteiro de 1 a 6 |
| `altura` | `15` | 5 a 60 mm; aplica-se às barras lineares |
| `legenda` | `true` | `true` ou `false` |
| `rotacao` | `0` | `0`, `90`, `180` ou `270`, no sentido horário |
| `download` | Ausente | `1` para baixar como arquivo |

A rotação é aplicada ao PNG completo. Em 90° e 270°, largura e altura trocam de posição. Ajuste a caixa da imagem no relatório para evitar redimensionamento inadequado.

A dimensão em pontos do JasperReports corresponde a `pixels × 72 / DPI`. Preserve proporções e imprima a 100%, sem ajustar à página. A qualidade final deve ser validada na Zebra e no leitor.

## 10. Operação

Execute na pasta da instalação:

```sh
# Estado
docker compose ps

# Últimas mensagens
docker compose logs --tail 100

# Acompanhar mensagens
docker compose logs -f

# Reiniciar aplicação
docker compose restart

# Parar sem remover o contêiner
docker compose stop

# Iniciar novamente
docker compose up -d --wait --wait-timeout 90

# Parar e remover contêiner e rede deste projeto
docker compose down
```

A política `unless-stopped` reinicia o processo se ele encerrar e após reinícios do Docker, exceto quando o serviço foi parado manualmente. O Docker precisa iniciar no boot do servidor.

O healthcheck sinaliza falhas, mas o Docker não reinicia automaticamente um contêiner somente por estar `unhealthy`. Configure alertas conforme o monitoramento da empresa.

Não há banco de dados nem volume persistente obrigatório. Preserve o pacote, o `compose.yaml`, o `.env` e as configurações de proxy/certificado para recuperação.

## 11. Atualizações e retorno à versão anterior

Antes de importar uma atualização, preserve a imagem anterior com outra etiqueta:

```sh
docker tag bargenerator:1.0.0 bargenerator:backup-anterior
```

Importe o novo arquivo com `docker load -i ARQUIVO-DA-NOVA-IMAGEM`. Confira a etiqueta carregada e ajuste `image:` no Compose, se ela mudou. Aplique:

```sh
docker compose up -d --force-recreate --wait --wait-timeout 90
```

Valide saúde, geração de imagem e relatório. Para retornar à imagem anterior, configure `image: bargenerator:backup-anterior` no Compose e execute novamente o comando acima.

## 12. Solução de problemas

| Sintoma | Verificação |
|---|---|
| Docker indisponível | Verificar serviço Docker e permissões do usuário |
| Imagem não encontrada | Executar `docker load` e conferir `docker image ls` |
| Erro de arquitetura | Confirmar host Linux amd64 e modo de contêineres Linux |
| Porta ocupada | Alterar `PORTA_PUBLICA` no `.env` e atualizar o proxy |
| Serviço unhealthy | Consultar `docker compose logs --tail 100` |
| Funciona no servidor, mas não fora dele | Conferir DNS, proxy, firewall e interface de publicação |
| Connection refused no Sankhya | Conferir domínio e porta; não usar localhost do PC no relatório |
| HTTP 400 | Conferir conteúdo, formato, dígito verificador e parâmetros |
| HTTP 502/504 no proxy | Conferir serviço, porta de destino e rede do proxy |
| Erro de certificado no JasperReports | Conferir cadeia do certificado e confiança no Java do servidor Sankhya |
| PNG abre, mas impressão fica ruim | Conferir DPI, escala, tamanho da caixa, rotação e configuração da Zebra |

## 13. Checklist de entrega

- [ ] Imagem importada no servidor correto.
- [ ] Serviço com estado healthy.
- [ ] Docker configurado para iniciar com o servidor.
- [ ] Domínio e certificado HTTPS funcionando.
- [ ] Proxy preserva parâmetros e retorna PNG.
- [ ] Acesso validado a partir do servidor Sankhya.
- [ ] URL do relatório atualizada.
- [ ] Impressão física e leitura do código validadas.

**Validação realizada na preparação do pacote:** imagem construída e reimportada no Docker Desktop Linux amd64, serviço saudável, resposta PNG pela porta publicada e 13 testes automatizados aprovados, incluindo rotação. O instalador PowerShell foi executado; o script Linux teve sua sintaxe conferida. A infraestrutura de produção e a impressão física ainda precisam de validação no destino.
