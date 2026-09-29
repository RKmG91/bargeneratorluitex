# BarGenerator

Gerador local com interface em português inspirada no fluxo do TEC-IT: escolher formato, informar dados, visualizar e baixar. Gera imagens no próprio servidor, sem chamadas externas durante o uso.

## Executar no Windows

Instale Node.js 22 ou superior. Abra iniciar.cmd; na primeira execução, ele instala a dependência via npm. Ou execute na pasta:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd start
```

Abra http://localhost:3000/ (interface).
Imagem: http://localhost:3000/barcode.png?tipo=code128&texto=123456789

O processo precisa permanecer ligado. CTRL+C encerra a execução no terminal.

## Gerar pacote para outro servidor

```powershell
npm.cmd run build
```

Saída: dist/bargenerator-1.0.0.tgz. Este projeto JavaScript não requer compilação nativa: o build empacota os fontes para Windows ou Linux, com Node.js instalado no destino.

Extraia o pacote no destino:

```sh
tar -xzf bargenerator-1.0.0.tgz
cd package
npm install --omit=dev --ignore-scripts
```

O npm inclui npm-shrinkwrap.json no pacote para fixar a árvore de dependências. A instalação inicial exige acesso ao registro npm; o uso posterior é local.

Linux:
```sh
HOST=0.0.0.0 PORT=3000 npm start
```

Windows PowerShell:
```powershell
$env:HOST = "0.0.0.0"
$env:PORT = "3000"
npm.cmd start
```

Acesse http://IP-DO-SERVIDOR:3000/. Libere a porta na rede interna conforme necessário. HOST padrão é 127.0.0.1. 0.0.0.0 habilita interfaces de rede; não é o endereço a colocar no iReport. O serviço não tem autenticação e destina-se à rede interna.

## Docker

Com Docker e Compose instalados, na pasta extraída ou na pasta do projeto:

```sh
docker compose up -d --build
docker compose logs -f
```

Compose publica porta 3000 e reinicia o serviço automaticamente. PORTA_PUBLICA permite mudar a porta externa. Em instalação sem Docker, configure um serviço do sistema para permanecer ativo após reinicializações.

## Parâmetros da imagem

GET /barcode.png

| Parâmetro | Padrão | Valores |
|---|---|---|
| texto | obrigatório | 1–120 caracteres, codificados na URL |
| tipo | code128 | code128, code39, ean13, ean8, upca, interleaved2of5, qrcode, datamatrix |
| dpi | 203 | 203, 300 ou 600 |
| modulo | 2 | 1–6 pontos da impressora por módulo |
| altura | 15 | 5–60 mm, barras lineares |
| legenda | true | true ou false |
| rotacao | 0 | 0, 90, 180 ou 270 graus, no sentido horário |
| download | ausente | 1 para baixar como arquivo |

Entradas incompatíveis retornam HTTP 400 com motivo. EAN/UPC precisam de conteúdo e dígito verificador válidos. O motor pode calcular o dígito quando se fornece a quantidade de dígitos sem o verificador. Não corta espaços nem remove zeros. QR Code/Data Matrix determinam seu tamanho pelo conteúdo e módulo; altura não controla códigos 2D.

As margens brancas são preservadas. O DPI controla o cálculo da altura das barras. O PNG é dimensionado em pixels; a imagem não depende de metadados DPI. Largura física = largura em pixels × 25,4 / DPI. A tela mostra tamanho total, incluindo margens e legenda.

A rotação é aplicada ao PNG completo, incluindo legenda e margens. A prévia, o download e a URL usam o mesmo ângulo. Em 90° e 270°, largura e altura trocam de posição. Sem o parâmetro, a imagem mantém a orientação original.

Exemplo: http://localhost:3000/barcode.png?tipo=code128&texto=123456789&rotacao=90

## iReport / JasperReports

Para girar o código, acrescente `&rotacao=90` (ou 270 para o outro sentido) antes de `&texto=` na URL. Ajuste a largura e a altura da caixa Image para a dimensão rotacionada mostrada na tela. Evite aplicar uma segunda rotação no iReport.

Insira um componente Image. Configure Image Expression Class como java.net.URL. Exemplo de expressão, substituindo CODIGO pelo campo real do relatório:

```java
new java.net.URL(
    "http://IP-DO-SERVIDOR:3000/barcode.png?tipo=code128&dpi=203&modulo=2&altura=15&texto="
    + java.net.URLEncoder.encode($F{CODIGO} == null ? "" : $F{CODIGO}.toString(), "UTF-8")
)
```

Evite renderizar o componente quando CODIGO for nulo ou vazio: use Print When Expression. Um código ausente deve ser tratado pelo relatório.

Use isLazy=false para carregar na geração e onErrorType=Error para evidenciar falhas. Preserve proporção (RetainShape). Configure a caixa na dimensão física da imagem: pontos Jasper = pixels × 72 / DPI. RetainShape sozinho não assegura correspondência com os pontos da impressora; a caixa também precisa ter o tamanho correto. Conteúdos variáveis podem mudar a largura, portanto dimensione com base no maior conteúdo esperado e valide o resultado.

O endereço deve ser acessível pela máquina que executa JasperReports. localhost aponta para essa máquina, não necessariamente para o computador do usuário. Dentro de contêiner, localhost aponta para o próprio contêiner.

Imprima a 100%, sem ajustar à página. Não estique a imagem. Valide na Zebra e no leitor: geração de PNG não corrige velocidade, temperatura, driver ou escala de impressão. Modelo da Zebra, etiqueta e versão do iReport ainda precisam ser confirmados; nenhum relatório .jasper foi compilado ou testado neste projeto.

## Verificação

```sh
npm test
```

Testes cobrem formatos suportados, assinatura PNG, dimensões, entradas inválidas, download, rotas e métodos HTTP. /health retorna {"status":"ok"}.

Referências:
- https://barcode.tec-it.com/en (referência de interface)
- https://github.com/metafloor/bwip-js (motor de geração)
- https://jasperreports.sourceforge.net/6.21.3/sample.reference/images/index.html (imagens por URL)

## Publicação automática

O GitHub Actions testa e publica a imagem Docker a cada push na main. Consulte [deploy/DEPLOY-AUTOMATICO.md](deploy/DEPLOY-AUTOMATICO.md) para instalar pelo GHCR, fixar versões e concluir a automação no servidor de destino.
