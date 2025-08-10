const API_BASE = '';

async function api(path, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: {}
    };

    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(API_BASE + path, opts);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    
    if (res.status === 204) return null;

    return await res.json();
  } catch (err) {
    console.error('Erro de API', err);
    throw err;
  }
}

const itemsSection = document.getElementById('itemsSection');
const globalLike = document.getElementById('global-like');
const globalDislike = document.getElementById('global-dislike');



async function loadAndRender() {
  try {
    let items = await api('/items');

    if (!items || items.length === 0) {
      items = await seedInitialItems();
    }
    renderItems(items);
  } catch (err) {
    console.error('Erro ao carregar itens', err);
    const cached = localStorage.getItem('moviesAppData');
    if (cached) {
      renderItems(JSON.parse(cached));
    } else {
      itemsSection.innerHTML = '<p>Erro ao conectar com a API e sem dados locais.</p>';
    }
  }
}

function renderItems(items) {
  itemsSection.innerHTML = '';
  let totalLike = 0, totalDislike = 0;

  localStorage.setItem('moviesAppData', JSON.stringify(items));

  items.forEach(item => {
    totalLike += Number(item.gostei || 0);
    totalDislike += Number(item.naoGostei || 0);

    const card = document.createElement('div');
    card.className = 'card';

    if (item.imagem) {
      const img = document.createElement('img');
      img.src = item.imagem;
      img.onerror = function() { this.replaceWith(placeholderEl()); };
      card.appendChild(img);
    } else {
      card.appendChild(placeholderEl());
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div class="title">${escapeHtml(item.titulo)}</div>
                      <div class="genre">${escapeHtml(item.genero)}</div>`;
    card.appendChild(meta);

    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = item.descricao || '';
    card.appendChild(desc);

    const votes = document.createElement('div');
    votes.className = 'votes';
    const likeBtn = document.createElement('button');
    likeBtn.className = 'btn-neu';
    likeBtn.textContent = `Gostei (${item.gostei || 0})`;
    likeBtn.onclick = () => vote(item.id, 'gostei');

    const dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'btn-neu';
    dislikeBtn.textContent = `Não Gostei (${item.naoGostei || 0})`;
    dislikeBtn.onclick = () => vote(item.id, 'naoGostei');

    votes.appendChild(likeBtn);
    votes.appendChild(dislikeBtn);
    card.appendChild(votes);

    const counters = document.createElement('div');
    counters.className = 'counters';
    counters.textContent = `Positivos: ${item.gostei || 0} • Negativos: ${item.naoGostei || 0}`;
    card.appendChild(counters);

    itemsSection.appendChild(card);
  });

  globalLike.textContent = totalLike;
  globalDislike.textContent = totalDislike;
}

function placeholderEl() {
  const p = document.createElement('div');
  p.className = 'placeholder';
  p.textContent = 'Imagem indisponível';
  return p;
}

function escapeHtml(str) {
  return String(str||'').replace(/[&<>"']/g, function(m){ 
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; 
  });
}

async function vote(id, tipo) {
  try {
    // Usando PATCH para atualizar votos
    await api(`/items/${id}/vote`, 'POST', { tipo });
    await loadAndRender();
  } catch (err) {
    alert('Erro ao registrar voto. Tente novamente.');
  }
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('fldTitle').value.trim();
  const genre = document.getElementById('fldGenre').value.trim();
  const img = document.getElementById('fldImage').value.trim();
  const desc = document.getElementById('fldDesc').value.trim();

  if (!title || !genre || !img) {
    alert('Preencha Título, Gênero e Imagem (URL).');
    return;
  }
  try {
    // Usando POST para criar um novo item
    await api('/items', 'POST', {
      titulo: title,
      genero: genre,
      descricao: desc,
      imagem: img
    });
    document.getElementById('addForm').reset();
    await loadAndRender();
  } catch (err) {
    alert('Erro ao cadastrar item.');
  }
});



// Inicializa a aplicação
loadAndRender();
