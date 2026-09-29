import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarServidor } from '../servidor.js';
let servidor, base;
before(async () => {
    servidor = criarServidor();
    servidor.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    base = 'http://127.0.0.1:' + servidor.address().port;
});
after(() => new Promise(resolve => servidor.close(resolve)));
const exemplos = { code128: '00123456789', code39: 'ABC-123', ean13: '5901234123457', ean8: '96385074', upca: '012345678905', interleaved2of5: '12345678', qrcode: 'A&B + teste', datamatrix: 'ABC123' };
for (const [tipo, texto] of Object.entries(exemplos)) {
    test('PNG válido: ' + tipo, async () => {
        const resposta = await fetch(base + '/barcode.png?' + new URLSearchParams({ tipo, texto }));
        assert.equal(resposta.status, 200);
        assert.equal(resposta.headers.get('content-type'), 'image/png');
        const png = Buffer.from(await resposta.arrayBuffer());
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.ok(png.readUInt32BE(16) > 20);
        assert.ok(png.readUInt32BE(20) > 20);
    });
}
test('Rejeita parâmetros inválidos', async () => {
    for (const consulta of ['texto=', 'texto=abc&tipo=ean13', 'texto=123&tipo=inexistente', 'texto=1&dpi=204', 'texto=1&modulo=1.5', 'texto=1&altura=NaN', 'texto=1&legenda=sim', 'texto=' + 'x'.repeat(121)]) {
        const resposta = await fetch(base + '/barcode.png?' + consulta);
        assert.equal(resposta.status, 400, consulta);
    }
});
test('DPI altera altura física sem alterar a largura dos módulos', async () => {
    const imagens = [];
    for (const dpi of [203, 300]) {
        const resposta = await fetch(base + '/barcode.png?texto=123456&legenda=false&dpi=' + dpi);
        imagens.push(Buffer.from(await resposta.arrayBuffer()));
    }
    assert.equal(imagens[0].readUInt32BE(16), imagens[1].readUInt32BE(16));
    assert.ok(imagens[1].readUInt32BE(20) > imagens[0].readUInt32BE(20));
});
test('Rotas da interface, download e métodos', async () => {
    for (const rota of ['/', '/app.js', '/estilos.css', '/health']) assert.equal((await fetch(base + rota)).status, 200);
    assert.equal((await fetch(base + '/inexistente')).status, 404);
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    const resposta = await fetch(base + '/barcode.png?texto=123&download=1');
    assert.match(resposta.headers.get('content-disposition'), /^attachment/);
});

test('Rotação preserva o padrão e troca dimensões em 90 e 270 graus', async () => {
    const imagens = new Map();
    for (const angulo of ['', '0', '90', '180', '270']) {
        const resposta = await fetch(base + '/barcode.png?texto=ABC123456789' + (angulo ? '&rotacao=' + angulo : ''));
        assert.equal(resposta.status, 200);
        imagens.set(angulo, Buffer.from(await resposta.arrayBuffer()));
    }
    assert.deepEqual(imagens.get(''), imagens.get('0'));
    const original = imagens.get('0');
    for (const angulo of ['90', '180', '270']) {
        const imagem = imagens.get(angulo);
        const troca = angulo !== '180';
        assert.equal(imagem.readUInt32BE(16), original.readUInt32BE(troca ? 20 : 16));
        assert.equal(imagem.readUInt32BE(20), original.readUInt32BE(troca ? 16 : 20));
        assert.notDeepEqual(imagem, original);
    }
    assert.notDeepEqual(imagens.get('90'), imagens.get('270'));
});

test('Rejeita rotação inválida e mantém download rotacionado', async () => {
    for (const angulo of ['45', '-90', '360', 'abc', '', '90.5', 'toString']) {
        const resposta = await fetch(base + '/barcode.png?texto=123&rotacao=' + angulo);
        assert.equal(resposta.status, 400, angulo);
        assert.match(await resposta.text(), /Rotação deve ser/);
    }
    const rota = base + '/barcode.png?texto=123&rotacao=90';
    const imagem = await fetch(rota);
    const download = await fetch(rota + '&download=1');
    assert.match(download.headers.get('content-disposition'), /^attachment/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), Buffer.from(await imagem.arrayBuffer()));
});
