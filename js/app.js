// Ponto de Entrada da Aplicação - Sistema Integrado de Gestão e Operações
import { getCurrentSession, login, logout, getCurrentUser } from './services/auth.js';
import { getItems, createItem, updateItem, deleteItem } from './services/api.js';
import { initIcons } from './utils/icons.js';
import { getCurrentCoordinates, startCameraStream, captureCameraFrame, stopCameraStream, AudioRecorder } from './utils/media.js';

// Estado Global da Aplicação
const state = {
  operations: [],
  activeCameraStream: null,
  audioRecorder: new AudioRecorder(),
  capturedPhoto: null,
  recordedAudio: null
};

// Inicialização da Aplicação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  setupEventListeners();
  checkAuthSession();
  loadOperationsData();
});

/**
 * Verifica sessão ativa
 */
async function checkAuthSession() {
  try {
    await getCurrentSession();
  } catch (e) {
    console.warn('Verificação de sessão via Supabase em modo demonstrativo.');
  }
  const user = getCurrentUser();

  const userProfileEl = document.getElementById('user-profile-info');
  if (userProfileEl) {
    if (user) {
      userProfileEl.innerHTML = `
        <span class="text-sm font-semibold text-slate-700">${user.user_metadata?.full_name || user.email}</span>
        <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">${user.user_metadata?.role || 'Operador'}</span>
      `;
    } else {
      userProfileEl.innerHTML = `<span class="text-sm text-slate-500">Visitante / Convidado</span>`;
    }
  }
}

/**
 * Carrega a lista de operações e atualiza a interface
 */
async function loadOperationsData() {
  state.operations = await getItems('operations');
  renderDashboardStats();
  renderOperationsTable();
  initIcons();
}

/**
 * Renderiza os dados estatísticos do Dashboard
 */
function renderDashboardStats() {
  const total = state.operations.length;
  const emAndamento = state.operations.filter(op => op.status === 'em_andamento').length;
  const pendentes = state.operations.filter(op => op.status === 'pendente').length;
  const concluidas = state.operations.filter(op => op.status === 'concluido').length;

  const statTotal = document.getElementById('stat-total');
  const statAndamento = document.getElementById('stat-andamento');
  const statPendentes = document.getElementById('stat-pendentes');
  const statConcluidas = document.getElementById('stat-concluidas');

  if (statTotal) statTotal.textContent = total;
  if (statAndamento) statAndamento.textContent = emAndamento;
  if (statPendentes) statPendentes.textContent = pendentes;
  if (statConcluidas) statConcluidas.textContent = concluidas;
}

/**
 * Renderiza a tabela principal de operações
 */
function renderOperationsTable() {
  const tbody = document.getElementById('operations-table-body');
  if (!tbody) return;

  if (state.operations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-500">
          Nenhuma operação cadastrada no sistema.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.operations.map(op => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="font-medium text-slate-900">${escapeHtml(op.title)}</td>
      <td class="text-slate-600 max-w-xs truncate">${escapeHtml(op.description || '-')}</td>
      <td>
        <span class="badge badge-${op.status}">
          ${formatStatus(op.status)}
        </span>
      </td>
      <td>
        <span class="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 uppercase">
          ${escapeHtml(op.priority || 'média')}
        </span>
      </td>
      <td class="text-slate-500 text-xs">${op.location_address ? escapeHtml(op.location_address) : 'Não informada'}</td>
      <td class="text-right">
        <div class="inline-flex items-center space-x-2">
          <button class="btn btn-secondary btn-sm btn-status-toggle" data-id="${op.id}" title="Alterar Status">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-delete-op" data-id="${op.id}" title="Excluir Operação">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Utilitário de escape HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formata o texto do status
 */
function formatStatus(status) {
  switch (status) {
    case 'em_andamento': return 'Em Andamento';
    case 'pendente': return 'Pendente';
    case 'concluido': return 'Concluído';
    case 'cancelado': return 'Cancelado';
    default: return status;
  }
}

/**
 * Configura os ouvintes de eventos da UI
 */
function setupEventListeners() {
  // Modal de Nova Operação
  const btnNewOp = document.getElementById('btn-new-operation');
  const modalOp = document.getElementById('modal-operation');
  const btnCloseModalOp = document.getElementById('btn-close-modal-op');
  const formOp = document.getElementById('form-operation');

  if (btnNewOp && modalOp) {
    btnNewOp.addEventListener('click', () => {
      modalOp.classList.remove('hidden');
    });
  }

  if (btnCloseModalOp && modalOp) {
    btnCloseModalOp.addEventListener('click', () => {
      modalOp.classList.add('hidden');
    });
  }

  if (formOp) {
    formOp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('op-title').value;
      const description = document.getElementById('op-description').value;
      const priority = document.getElementById('op-priority').value;
      const address = document.getElementById('op-address').value;

      await createItem('operations', {
        title,
        description,
        priority,
        status: 'pendente',
        location_address: address
      });

      formOp.reset();
      modalOp.classList.add('hidden');
      await loadOperationsData();
    });
  }

  // Tabela Operações - Ações de Status e Deleção
  const tbody = document.getElementById('operations-table-body');
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const toggleBtn = e.target.closest('.btn-status-toggle');
      const deleteBtn = e.target.closest('.btn-delete-op');

      if (toggleBtn) {
        const id = toggleBtn.getAttribute('data-id');
        const op = state.operations.find(item => item.id === id);
        if (op) {
          const nextStatus = {
            'pendente': 'em_andamento',
            'em_andamento': 'concluido',
            'concluido': 'pendente'
          }[op.status] || 'pendente';

          await updateItem('operations', id, { status: nextStatus });
          await loadOperationsData();
        }
      }

      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        if (confirm('Deseja realmente remover esta operação?')) {
          await deleteItem('operations', id);
          await loadOperationsData();
        }
      }
    });
  }

  // Geolocalização
  const btnGeo = document.getElementById('btn-get-location');
  if (btnGeo) {
    btnGeo.addEventListener('click', async () => {
      const statusEl = document.getElementById('geo-status-text');
      if (statusEl) statusEl.textContent = 'Obtendo coordenadas geográficas...';
      try {
        const coords = await getCurrentCoordinates();
        const addressInput = document.getElementById('op-address');
        if (addressInput) {
          addressInput.value = `Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}`;
        }
        if (statusEl) statusEl.textContent = `Coordenadas capturadas com sucesso! Precision: ${coords.accuracy}m`;
      } catch (err) {
        if (statusEl) statusEl.textContent = `Erro: ${err.message}`;
      }
    });
  }

  // Modal de Login
  const btnLoginOpen = document.getElementById('btn-login-modal-open');
  const modalLogin = document.getElementById('modal-login');
  const btnCloseLogin = document.getElementById('btn-close-modal-login');
  const formLogin = document.getElementById('form-login');
  const btnLogout = document.getElementById('btn-logout');

  if (btnLoginOpen && modalLogin) {
    btnLoginOpen.addEventListener('click', () => {
      modalLogin.classList.remove('hidden');
    });
  }

  if (btnCloseLogin && modalLogin) {
    btnCloseLogin.addEventListener('click', () => {
      modalLogin.classList.add('hidden');
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      await login(email, password);
      await checkAuthSession();
      modalLogin.classList.add('hidden');
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await logout();
      await checkAuthSession();
    });
  }

  // Câmera
  const btnStartCamera = document.getElementById('btn-start-camera');
  const btnCapturePhoto = document.getElementById('btn-capture-photo');
  const btnStopCamera = document.getElementById('btn-stop-camera');
  const videoEl = document.getElementById('camera-video-preview');
  const photoPreviewEl = document.getElementById('photo-preview-img');

  if (btnStartCamera) {
    btnStartCamera.addEventListener('click', async () => {
      try {
        state.activeCameraStream = await startCameraStream(videoEl);
        if (videoEl) videoEl.classList.remove('hidden');
        if (btnCapturePhoto) btnCapturePhoto.classList.remove('hidden');
        if (btnStopCamera) btnStopCamera.classList.remove('hidden');
        btnStartCamera.classList.add('hidden');
      } catch (err) {
        alert(`Erro na câmera: ${err.message}`);
      }
    });
  }

  if (btnCapturePhoto) {
    btnCapturePhoto.addEventListener('click', () => {
      if (videoEl) {
        const photoData = captureCameraFrame(videoEl);
        state.capturedPhoto = photoData;
        if (photoPreviewEl) {
          photoPreviewEl.src = photoData;
          photoPreviewEl.classList.remove('hidden');
        }
      }
    });
  }

  if (btnStopCamera) {
    btnStopCamera.addEventListener('click', () => {
      if (state.activeCameraStream) {
        stopCameraStream(state.activeCameraStream);
        state.activeCameraStream = null;
      }
      if (videoEl) videoEl.classList.add('hidden');
      if (btnCapturePhoto) btnCapturePhoto.classList.add('hidden');
      if (btnStopCamera) btnStopCamera.classList.add('hidden');
      if (btnStartCamera) btnStartCamera.classList.remove('hidden');
    });
  }

  // Áudio
  const btnStartAudio = document.getElementById('btn-start-audio');
  const btnStopAudio = document.getElementById('btn-stop-audio');
  const audioPlayback = document.getElementById('audio-playback');

  if (btnStartAudio) {
    btnStartAudio.addEventListener('click', async () => {
      try {
        await state.audioRecorder.start();
        btnStartAudio.classList.add('hidden');
        if (btnStopAudio) btnStopAudio.classList.remove('hidden');
      } catch (err) {
        alert(`Erro ao iniciar gravação de áudio: ${err.message}`);
      }
    });
  }

  if (btnStopAudio) {
    btnStopAudio.addEventListener('click', async () => {
      try {
        const result = await state.audioRecorder.stop();
        state.recordedAudio = result;
        if (audioPlayback) {
          audioPlayback.src = result.url;
          audioPlayback.classList.remove('hidden');
        }
        btnStopAudio.classList.add('hidden');
        if (btnStartAudio) btnStartAudio.classList.remove('hidden');
      } catch (err) {
        alert(`Erro ao parar gravação de áudio: ${err.message}`);
      }
    });
  }
}
