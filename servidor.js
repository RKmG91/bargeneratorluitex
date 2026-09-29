import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bwipjs from 'bwip-js';

const TIPOS = new Set(['code128', 'code39', 'ean13', 'ean8', 'upca', 'interleaved2of5', 'qrcode', 'datamatrix']);
const ARQUIVOS = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/estilos.css': ['estilos.css', 'text/css'] };
const MAXIMO_TEXTO = 120;
const PONTOS_POR_POLEGADA = 72;

function numero(parametros, nome, padrao, minimo, maximo, inteiro = false) {
    const valor = parametros.has(nome) ? Number(parametros.get(nome)) : padrao;
    if (!Number.isFinite(valor) || valor < minimo || valor > maximo || (inteiro && !Number.isInteger(valor))) {
        throw new Error(nome + ': informe um número entre ' + minimo + ' e ' + maximo + (inteiro ? ', inteiro.' : '.'));
    }
    return valor;
}

function opcoes(parametros) {
    const tipo = parametros.get('tipo') || 'code128';
    const texto = parametros.get('texto');
    if (!TIPOS.has(tipo)) throw new Error('Tipo de código não suportado.');
    if (!texto || texto.length > MAXIMO_TEXTO) throw new Error('Informe texto com 1 a 120 caracteres.');
    const dpi = numero(parametros, 'dpi', 203, 203, 600, true);
    if (![203, 300, 600].includes(dpi)) throw new Error('DPI deve ser 203, 300 ou 600.');
    const modulo = numero(parametros, 'modulo', 2, 1, 6, true);
    const altura = numero(parametros, 'altura', 15, 5, 60);
    const legenda = parametros.get('legenda') ?? 'true';
    if (!['true', 'false'].includes(legenda)) throw new Error('Legenda deve ser true ou false.');
    const rotacao = parametros.get('rotacao') ?? '0';
    const orientacoes = { '0': 'N', '90': 'R', '180': 'I', '270': 'L' };
    if (!Object.hasOwn(orientacoes, rotacao)) throw new Error('Rotação deve ser 0, 90, 180 ou 270.');
    return { bcid: tipo, text: texto, scale: modulo, rotate: orientacoes[rotacao],
        height: altura * dpi / (PONTOS_POR_POLEGADA * modulo),
        includetext: legenda === 'true', textxalign: 'center',
        backgroundcolor: 'FFFFFF', paddingwidth: 10, paddingheight: 10 };
}

function enviar(resposta, status, tipo, conteudo, extras = {}) {
    resposta.writeHead(status, { 'Content-Type': tipo, 'X-Content-Type-Options': 'nosniff', ...extras });
    resposta.end(conteudo);
}

async function codigoBarras(url, resposta) {
    let imagem;
    try { imagem = await bwipjs.toBuffer(opcoes(url.searchParams)); }
    catch (erro) {
        return enviar(resposta, 400, 'text/plain; charset=utf-8', 'Código inválido: ' + String(erro.message || erro));
    }
    enviar(resposta, 200, 'image/png', imagem, {
        'Cache-Control': 'no-store',
        'Content-Disposition': (url.searchParams.get('download') === '1' ? 'attachment' : 'inline') + '; filename="codigo-barras.png"'
    });
}

async function atender(requisicao, resposta) {
    if (requisicao.method !== 'GET') return enviar(resposta, 405, 'text/plain', 'Use GET.', { Allow: 'GET' });
    const url = new URL(requisicao.url, 'http://localhost');
    if (url.pathname === '/barcode.png') return codigoBarras(url, resposta);
    if (url.pathname === '/health') return enviar(resposta, 200, 'application/json', '{"status":"ok"}');
    const arquivo = ARQUIVOS[url.pathname];
    if (!arquivo) return enviar(resposta, 404, 'text/plain; charset=utf-8', 'Página não encontrada.');
    const conteudo = await readFile(new URL('./public/' + arquivo[0], import.meta.url));
    enviar(resposta, 200, arquivo[1] + '; charset=utf-8', conteudo, {
        'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
}

export function criarServidor() {
    return http.createServer((requisicao, resposta) => {
        atender(requisicao, resposta).catch(erro => {
            console.error('Falha ao atender requisição:', erro.message);
            if (!resposta.headersSent) enviar(resposta, 500, 'text/plain', 'Erro interno ao gerar resposta.');
            else resposta.destroy();
        });
    });
}

function iniciar() {
    const porta = Number(process.env.PORT || 3000);
    const endereco = process.env.HOST || '127.0.0.1';
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT deve estar entre 1 e 65535.');
    const servidor = criarServidor();
    servidor.on('error', erro => { console.error('Não foi possível iniciar: ' + erro.message); process.exitCode = 1; });
    servidor.listen(porta, endereco, () => console.log('BarGenerator disponível em http://' + endereco + ':' + porta));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) iniciar();
