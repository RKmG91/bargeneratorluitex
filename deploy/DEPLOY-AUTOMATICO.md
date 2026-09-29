# Publicação automática e deploy

## O que está automatizado

A cada push na branch main, GitHub Actions instala as dependências fixadas e executa os testes. Depois constrói a imagem Linux amd64, executa os testes dentro dela, valida HTTP e publica no GitHub Container Registry:

- Canal atualizado: `ghcr.io/rkmg91/bargeneratorluitex:main`.
- Identificação por commit: `ghcr.io/rkmg91/bargeneratorluitex:sha-COMMIT_COMPLETO`.

Pull requests executam os testes, sem publicar imagens. Também é possível executar o workflow manualmente na aba Actions, selecionando main.

O workflow usa GITHUB_TOKEN fornecido pelo GitHub. Não exige salvar token pessoal para publicar. A visibilidade do pacote GHCR é independente da visibilidade do repositório: confirme em Packages antes de permitir download anônimo.

## Limite atual

**Publicação automática da imagem não significa atualização automática do servidor.** O servidor oficial ainda não foi definido. Não há workflow que acessa produção nem credenciais de produção cadastradas.

Depois que a infraestrutura informar servidor, acesso e domínio, configurar uma etapa de deploy que use a identificação da imagem daquela execução, aguarde o healthcheck e permita retorno à imagem anterior.

## Instalação pelo registro

Copie compose-registry.yaml para uma pasta permanente no servidor. Requisitos: Docker para contêineres Linux amd64 e Compose com suporte a --wait.

Se o pacote for privado, autentique-se antes com uma conta que tenha permissão de leitura no pacote. Use um token apropriado para leitura de packages e entrada segura; não coloque o token no arquivo Compose ou no repositório.

```sh
docker login ghcr.io -u SEU_USUARIO
docker compose -p bargenerator -f compose-registry.yaml pull
docker compose -p bargenerator -f compose-registry.yaml up -d --wait --wait-timeout 90
curl --fail http://127.0.0.1:3000/health
```

O Compose publica por padrão apenas no loopback do host. A infraestrutura deve configurar domínio, HTTPS e proxy reverso conforme MANUAL-INSTALACAO.md.

Se já existe uma instalação pelo pacote offline, não suba uma segunda instância na mesma porta. Preserve o mesmo nome de projeto Compose da instalação existente (consulte docker compose ls) ao substituir sua configuração, ou planeje a migração.

## Atualizar manualmente enquanto o servidor não tem automação

```sh
docker compose -p bargenerator -f compose-registry.yaml pull
docker compose -p bargenerator -f compose-registry.yaml up -d --wait --wait-timeout 90
```

O canal main muda a cada publicação bem-sucedida. Para fixar uma versão, crie um arquivo .env na pasta do Compose:

```dotenv
BARGENERATOR_IMAGEM=ghcr.io/rkmg91/bargeneratorluitex:sha-COMMIT_COMPLETO
ENDERECO_PUBLICACAO=127.0.0.1
PORTA_PUBLICA=3000
```

Substitua COMMIT_COMPLETO pelo SHA exibido na execução do workflow. Preserve o valor anterior antes de atualizar. Para rollback, restaure a referência anterior no .env e repita pull e up.

## Informações necessárias para concluir o deploy automático

- Servidor de destino e arquitetura.
- Método autorizado: SSH ou runner instalado no ambiente.
- Nome do projeto Compose existente e pasta de instalação.
- Domínio, proxy e endpoint externo para validação.
- Credenciais cadastradas em GitHub Secrets/Environment pela infraestrutura, nunca em mensagens ou arquivos versionados.

## Pacote offline

O código e os instaladores ficam no Git. Imagens grandes e ZIPs ficam em Releases, fora do histórico Git. O pacote da Release inicial é um snapshot; alterações posteriores da main são publicadas no GHCR pelo workflow. Elas não atualizam automaticamente o ZIP daquela Release.

## Referências

- [Publicar imagens Docker com GitHub Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
