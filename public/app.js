const formulario = document.querySelector('#formulario');
const previa = document.querySelector('#previa');
const estado = document.querySelector('#estado');
const campoUrl = document.querySelector('#url');
const copiar = document.querySelector('#copiar');
const baixar = document.querySelector('#baixar');
let imagemAnterior;

function limparResultado() {
    previa.hidden = true;
    baixar.hidden = true;
    copiar.disabled = true;
    campoUrl.value = '';
    estado.className = '';
    document.querySelector('#vazio').hidden = false;
    document.querySelector('#vazio').textContent = 'Gerando prévia…';
}

function mostrarDimensoes(dpi) {
    const largura = previa.naturalWidth;
    const altura = previa.naturalHeight;
    estado.textContent = largura + ' × ' + altura + ' px · ' +
        (largura * 25.4 / dpi).toFixed(2) + ' × ' + (altura * 25.4 / dpi).toFixed(2) + ' mm a ' + dpi + ' dpi';
}

async function carregarImagem(blob) {
    if (imagemAnterior) URL.revokeObjectURL(imagemAnterior);
    imagemAnterior = URL.createObjectURL(blob);
    previa.src = imagemAnterior;
    await previa.decode();
    previa.hidden = false;
    document.querySelector('#vazio').hidden = true;
}

async function gerar(evento) {
    evento?.preventDefault();
    limparResultado();
    document.querySelector('#gerar').disabled = true;
    const parametros = new URLSearchParams(new FormData(formulario));
    parametros.set('legenda', String(document.querySelector('#legenda').checked));
    const url = new URL('/barcode.png?' + parametros, location.origin);
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error(await resposta.text());
        await carregarImagem(await resposta.blob());
        mostrarDimensoes(Number(parametros.get('dpi')));
        campoUrl.value = url.href;
        baixar.href = url.href + '&download=1';
        baixar.hidden = false;
        copiar.disabled = false;
    } catch (erro) { mostrarErro(erro); }
    finally { document.querySelector('#gerar').disabled = false; }
}

function mostrarErro(erro) {
    estado.className = 'erro';
    estado.textContent = erro.message || 'Falha ao gerar. Verifique se o serviço está ligado.';
    document.querySelector('#vazio').textContent = 'Revise os parâmetros e gere novamente.';
}

copiar.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(campoUrl.value); estado.textContent = 'URL copiada.'; }
    catch { campoUrl.focus(); campoUrl.select(); estado.textContent = 'URL selecionada. Pressione Ctrl+C para copiar.'; }
});
formulario.addEventListener('submit', gerar);
const grupos = { 'Lineares': ['code128', 'code39', 'interleaved2of5'], 'EAN / UPC': ['ean13', 'ean8', 'upca'], 'Bidimensionais': ['qrcode', 'datamatrix'] };
const seletorTipo = document.querySelector('#tipo');
const exemplos = { code128: '123456789', code39: 'ABC-123', interleaved2of5: '12345678', ean13: '5901234123457', ean8: '96385074', upca: '012345678905', qrcode: 'https://exemplo.com.br', datamatrix: 'ABC123' };
for (const [grupo, tipos] of Object.entries(grupos)) {
    const titulo = document.createElement('h3');
    titulo.textContent = grupo;
    document.querySelector('#catalogo').append(titulo);
    for (const tipo of tipos) adicionarFormato(tipo);
}
function adicionarFormato(tipo) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.tipo = tipo;
    botao.textContent = [...seletorTipo.options].find(opcao => opcao.value === tipo).text;
    botao.addEventListener('click', () => { seletorTipo.value = tipo; sincronizarFormato(); });
    document.querySelector('#catalogo').append(botao);
}
function sincronizarFormato() {
    for (const botao of document.querySelectorAll('[data-tipo]')) {
        botao.setAttribute('aria-pressed', String(botao.dataset.tipo === seletorTipo.value));
    }
    document.querySelector('#texto').placeholder = exemplos[seletorTipo.value];
    document.querySelector('#altura').readOnly = ['qrcode', 'datamatrix'].includes(seletorTipo.value);
}
seletorTipo.addEventListener('change', sincronizarFormato);
sincronizarFormato();
gerar();
