/**
 * ============================================================================
 * CONTROLADOR PRINCIPAL DEL CUADERNO INTERACTIVO VIRTUAL DE FÍSICA 3
 * Motor de PageFlip 3D realista, audio síntesis Web Audio, gestos y navegación
 * ============================================================================
 */

/**
 * Generador de efectos de sonido realistas para el giro de hojas de papel
 * Implementado enteramente mediante Web Audio API (100% offline, cero latencia)
 */
class PageFlipAudio {
  constructor() {
    this.enabled = localStorage.getItem('notebook_sound') !== 'false';
    this.audioCtx = null;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('notebook_sound', this.enabled);
    return this.enabled;
  }

  playFlip() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const sampleRate = ctx.sampleRate;
      const duration = 0.28; // 280ms de efecto de roce de papel
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);

      // Ruido texturizado con filtrado browniano para emular textura de papel
      let lastOut = 0.0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.03 * white)) / 1.03;
        lastOut = data[i];
        data[i] *= 3.2;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Filtro paso-banda con barrido dinámico de frecuencias
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + duration);
      filter.Q.setValueAtTime(1.6, ctx.currentTime);

      // Filtro paso-alto para remover resonancias graves
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(450, ctx.currentTime);

      // Envolvente de volumen: ataque rápido y desvanecimiento suave
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noiseSource.connect(filter);
      filter.connect(highpass);
      highpass.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start();
    } catch (err) {
      // Continuar sin audio si el navegador bloquea reproducción automática
    }
  }
}

/**
 * Controlador del Cuaderno y Motor de Animación 3D PageFlip
 */
class NotebookApp {
  constructor() {
    this.currentPage = 1;
    this.totalPages = 10;
    this.isFlipping = false;
    this.pages = document.querySelectorAll('.notebook-page');
    this.binder = document.querySelector('.notebook-binder');

    // Elementos de la interfaz de navegación
    this.pageSelect = document.getElementById('nav-page-select');
    this.btnPrev = document.getElementById('nav-btn-prev');
    this.btnNext = document.getElementById('nav-btn-next');
    this.btnHome = document.getElementById('nav-btn-home');
    this.btnToc = document.getElementById('nav-btn-toc');
    this.btnFullscreen = document.getElementById('nav-btn-fullscreen');
    this.btnSound = document.getElementById('nav-btn-sound');
    this.btnStagePrev = document.getElementById('stage-arrow-prev');
    this.btnStageNext = document.getElementById('stage-arrow-next');
    this.topbarBadge = document.getElementById('topbar-page-badge');
    this.tocModal = document.getElementById('toc-modal');
    this.tocClose = document.getElementById('toc-modal-close');

    // Motor de audio
    this.soundManager = new PageFlipAudio();

    // Estado de componentes inicializados bajo demanda
    this.initializedComponents = {
      geogebra: false,
      simulations: false,
      mindmap: false,
      timeline: false
    };

    this.init();
  }

  init() {
    this.bindNavigationEvents();
    this.bindKeyboardAndTouch();
    this.bindTocEvents();
    this.bindFullscreen();
    this.bindSoundToggle();
    this.bindCornerCurls();
    this.goToPage(1, false);
  }

  bindNavigationEvents() {
    if (this.btnPrev) {
      this.btnPrev.onclick = () => this.prevPage();
    }
    if (this.btnNext) {
      this.btnNext.onclick = () => this.nextPage();
    }
    if (this.btnHome) {
      this.btnHome.onclick = () => this.goToPage(1);
    }
    if (this.btnStagePrev) {
      this.btnStagePrev.onclick = () => this.prevPage();
    }
    if (this.btnStageNext) {
      this.btnStageNext.onclick = () => this.nextPage();
    }
    if (this.pageSelect) {
      this.pageSelect.onchange = (e) => {
        this.goToPage(parseInt(e.target.value, 10));
      };
    }

    // Botón en la portada para abrir el cuaderno
    const journeyBtn = document.getElementById('cover-journey-btn');
    if (journeyBtn) {
      journeyBtn.onclick = (e) => {
        e.stopPropagation();
        this.goToPage(2);
      };
    }
  }

  bindSoundToggle() {
    if (this.btnSound) {
      this.updateSoundButtonUI();
      this.btnSound.onclick = () => {
        const isEnabled = this.soundManager.toggleSound();
        this.updateSoundButtonUI();
        if (isEnabled) {
          this.soundManager.playFlip();
        }
      };
    }
  }

  updateSoundButtonUI() {
    if (!this.btnSound) return;
    if (this.soundManager.enabled) {
      this.btnSound.innerHTML = '<i class="fas fa-volume-up"></i>';
      this.btnSound.title = 'Sonido de pase de hoja: Activado (Clic para silenciar)';
      this.btnSound.classList.remove('sound-muted');
    } else {
      this.btnSound.innerHTML = '<i class="fas fa-volume-mute"></i>';
      this.btnSound.title = 'Sonido de pase de hoja: Silenciado (Clic para activar)';
      this.btnSound.classList.add('sound-muted');
    }
  }

  bindCornerCurls() {
    // Agregar pestañas de esquina interactivas tipo "dog-ear" en las hojas
    this.pages.forEach((page, index) => {
      const pageNum = index + 1;
      const leftLeaf = this.getLeftLeaf(page);
      const rightLeaf = this.getRightLeaf(page);

      // Esquina inferior derecha (para pasar a la página siguiente)
      if (rightLeaf && pageNum < this.totalPages) {
        if (!rightLeaf.querySelector('.page-corner-curl.corner-next')) {
          const curlNext = document.createElement('div');
          curlNext.className = 'page-corner-curl corner-next';
          curlNext.title = `Pasar a la siguiente página (Pág. ${pageNum + 1})`;
          curlNext.innerHTML = `
            <div class="corner-fold"></div>
            <div class="corner-hint"><i class="fas fa-chevron-right"></i></div>
          `;
          curlNext.onclick = (e) => {
            e.stopPropagation();
            this.nextPage();
          };
          rightLeaf.appendChild(curlNext);
        }
      }

      // Esquina inferior izquierda (para volver a la página anterior)
      if (leftLeaf && pageNum > 1) {
        if (!leftLeaf.querySelector('.page-corner-curl.corner-prev')) {
          const curlPrev = document.createElement('div');
          curlPrev.className = 'page-corner-curl corner-prev';
          curlPrev.title = `Volver a la página anterior (Pág. ${pageNum - 1})`;
          curlPrev.innerHTML = `
            <div class="corner-fold"></div>
            <div class="corner-hint"><i class="fas fa-chevron-left"></i></div>
          `;
          curlPrev.onclick = (e) => {
            e.stopPropagation();
            this.prevPage();
          };
          leftLeaf.appendChild(curlPrev);
        }
      }
    });
  }

  bindKeyboardAndTouch() {
    // Atajos con el teclado
    window.addEventListener('keydown', (e) => {
      if (e.target && ['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.prevPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.goToPage(this.totalPages);
      }
    });

    // Deslizamiento táctil (Swipe)
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Deslizar sólo si el movimiento horizontal es dominante
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 55) {
        if (diffX < 0) {
          this.nextPage();
        } else {
          this.prevPage();
        }
      }
    }, { passive: true });
  }

  bindTocEvents() {
    if (this.btnToc && this.tocModal) {
      this.btnToc.onclick = () => {
        this.tocModal.classList.add('open');
      };
    }
    if (this.tocClose && this.tocModal) {
      this.tocClose.onclick = () => {
        this.tocModal.classList.remove('open');
      };
    }
    if (this.tocModal) {
      this.tocModal.onclick = (e) => {
        if (e.target === this.tocModal) {
          this.tocModal.classList.remove('open');
        }
      };
    }

    // Enlaces de la tabla de contenidos rápida
    const tocLinks = document.querySelectorAll('[data-goto-page]');
    tocLinks.forEach((link) => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetPage = parseInt(link.getAttribute('data-goto-page'), 10);
        if (this.tocModal) this.tocModal.classList.remove('open');
        this.goToPage(targetPage);
      };
    });
  }

  bindFullscreen() {
    if (this.btnFullscreen) {
      this.btnFullscreen.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.log(err));
          this.btnFullscreen.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
            this.btnFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
          }
        }
      };
    }
  }

  /**
   * Obtiene la hoja izquierda de cualquier página
   */
  getLeftLeaf(pageElem) {
    if (!pageElem) return null;
    return pageElem.querySelector('.notebook-page-leaf.leaf-left, .cover-left-page');
  }

  /**
   * Obtiene la hoja derecha de cualquier página
   */
  getRightLeaf(pageElem) {
    if (!pageElem) return null;
    return pageElem.querySelector('.notebook-page-leaf.leaf-right, .cover-right-page');
  }

  /**
   * Crea un clon visual idéntico de una hoja para la animación 3D
   */
  createLeafClone(leafElem) {
    if (!leafElem) {
      const dummy = document.createElement('div');
      dummy.className = 'notebook-page-leaf';
      return dummy;
    }

    const clone = leafElem.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

    // Duplicar el contenido visual de lienzos Canvas (GeoGebra, Simuladores)
    const srcCanvases = leafElem.querySelectorAll('canvas');
    const cloneCanvases = clone.querySelectorAll('canvas');
    srcCanvases.forEach((src, idx) => {
      const dest = cloneCanvases[idx];
      if (dest && src.width && src.height) {
        dest.width = src.width;
        dest.height = src.height;
        const ctx = dest.getContext('2d');
        if (ctx) {
          ctx.drawImage(src, 0, 0);
        }
      }
    });

    // Mantener la posición de scroll en la hoja clonada
    const srcScrolls = leafElem.querySelectorAll('.leaf-scroll-body');
    const cloneScrolls = clone.querySelectorAll('.leaf-scroll-body');
    srcScrolls.forEach((src, idx) => {
      if (cloneScrolls[idx]) {
        cloneScrolls[idx].scrollTop = src.scrollTop;
      }
    });

    // Eliminar pestañas de esquina de la hoja clonada para evitar duplicados en el vuelo
    clone.querySelectorAll('.page-corner-curl').forEach(el => el.remove());

    return clone;
  }

  /**
   * Navega a una página específica aplicando la animación 3D PageFlip
   */
  goToPage(pageNum, animated = true) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    if (pageNum === this.currentPage && animated) return;
    if (this.isFlipping) return;

    // Si es la carga inicial o pantalla pequeña móvil donde el libro es vertical
    const isMobile = window.innerWidth <= 860;
    if (!animated || isMobile || !this.binder) {
      this.switchPageDirect(pageNum);
      return;
    }

    // Ejecutar animación 3D de vuelta de página
    this.executePageFlip(pageNum);
  }

  /**
   * Transición directa sin animación 3D (para inicio o pantallas estrechas)
   */
  switchPageDirect(pageNum) {
    this.currentPage = pageNum;
    this.pages.forEach((page, index) => {
      const pIdx = index + 1;
      if (pIdx === pageNum) {
        page.classList.add('active');
        page.classList.remove('flipping-target');
        const leafScrolls = page.querySelectorAll('.leaf-scroll-body');
        leafScrolls.forEach(s => s.scrollTop = 0);
      } else {
        page.classList.remove('active', 'flipping-target');
      }
    });

    this.updateControlsUI(pageNum);
    this.lazyInitPageComponents(pageNum);
    this.renderMath();
  }

  /**
   * Motor de Giro de Hoja en 3D (PageFlip)
   */
  executePageFlip(targetPageNum) {
    this.isFlipping = true;
    const fromPageNum = this.currentPage;
    const direction = targetPageNum > fromPageNum ? 'next' : 'prev';

    const currentPageElem = document.getElementById(`page-${fromPageNum}`);
    const targetPageElem = document.getElementById(`page-${targetPageNum}`);

    if (!currentPageElem || !targetPageElem) {
      this.switchPageDirect(targetPageNum);
      this.isFlipping = false;
      return;
    }

    // Reproducir sonido de papel crujiente
    this.soundManager.playFlip();

    // Bloquear temporalmente botones mientras dura la animación
    this.setNavButtonsDisabled(true);

    // Preparar página destino en el fondo
    targetPageElem.classList.add('flipping-target');
    targetPageElem.querySelectorAll('.leaf-scroll-body').forEach(s => s.scrollTop = 0);

    // Crear el elemento de hoja giratoria (Flipper)
    const flipper = document.createElement('div');
    flipper.className = `pageflip-leaf ${direction === 'next' ? 'flip-forward' : 'flip-backward'}`;

    const faceFront = document.createElement('div');
    faceFront.className = 'pageflip-face face-front';
    const sheenFront = document.createElement('div');
    sheenFront.className = 'pageflip-sheen';
    faceFront.appendChild(sheenFront);

    const faceBack = document.createElement('div');
    faceBack.className = 'pageflip-face face-back';
    const sheenBack = document.createElement('div');
    sheenBack.className = 'pageflip-sheen';
    faceBack.appendChild(sheenBack);

    // Sombra proyectada en la página subyacente
    const castShadow = document.createElement('div');
    castShadow.className = `pageflip-cast-shadow ${direction === 'next' ? 'shadow-right' : 'shadow-left'}`;

    let hiddenLeaf = null;

    if (direction === 'next') {
      // Giro hacia adelante: Hoja derecha de página actual se despega y gira
      const currentRight = this.getRightLeaf(currentPageElem);
      const targetLeft = this.getLeftLeaf(targetPageElem);

      faceFront.appendChild(this.createLeafClone(currentRight));
      faceBack.appendChild(this.createLeafClone(targetLeft));

      // Ocultar hoja derecha actual para revelar la hoja derecha del destino debajo
      if (currentRight) {
        hiddenLeaf = currentRight;
        hiddenLeaf.style.visibility = 'hidden';
      }
    } else {
      // Giro hacia atrás: Hoja izquierda de página actual se despega y gira a la derecha
      const currentLeft = this.getLeftLeaf(currentPageElem);
      const targetRight = this.getRightLeaf(targetPageElem);

      faceFront.appendChild(this.createLeafClone(currentLeft));
      faceBack.appendChild(this.createLeafClone(targetRight));

      // Ocultar hoja izquierda actual para revelar la hoja izquierda del destino debajo
      if (currentLeft) {
        hiddenLeaf = currentLeft;
        hiddenLeaf.style.visibility = 'hidden';
      }
    }

    flipper.appendChild(faceFront);
    flipper.appendChild(faceBack);

    this.binder.appendChild(castShadow);
    this.binder.appendChild(flipper);

    // Duración de la animación en sincronía con notebook.css (650ms)
    const animDuration = 650;

    setTimeout(() => {
      // Limpieza y activación de la nueva página
      if (flipper.parentNode) flipper.parentNode.removeChild(flipper);
      if (castShadow.parentNode) castShadow.parentNode.removeChild(castShadow);

      if (hiddenLeaf) {
        hiddenLeaf.style.visibility = '';
      }

      currentPageElem.classList.remove('active');
      targetPageElem.classList.remove('flipping-target');
      targetPageElem.classList.add('active');

      this.currentPage = targetPageNum;
      this.updateControlsUI(targetPageNum);
      this.lazyInitPageComponents(targetPageNum);
      this.renderMath();

      this.isFlipping = false;
      this.setNavButtonsDisabled(false);
    }, animDuration);
  }

  setNavButtonsDisabled(disabled) {
    if (this.btnPrev) this.btnPrev.disabled = disabled || (this.currentPage === 1);
    if (this.btnNext) this.btnNext.disabled = disabled || (this.currentPage === this.totalPages);
    if (this.btnStagePrev) this.btnStagePrev.disabled = disabled || (this.currentPage === 1);
    if (this.btnStageNext) this.btnStageNext.disabled = disabled || (this.currentPage === this.totalPages);
  }

  updateControlsUI(pageNum) {
    // Actualizar estilo del binder si es portada
    if (this.binder) {
      if (pageNum === 1) {
        this.binder.classList.add('is-cover');
      } else {
        this.binder.classList.remove('is-cover');
      }
    }

    // Actualizar controles de navegación
    if (this.pageSelect) this.pageSelect.value = pageNum;
    if (this.btnPrev) this.btnPrev.disabled = (pageNum === 1);
    if (this.btnNext) this.btnNext.disabled = (pageNum === this.totalPages);
    if (this.btnStagePrev) this.btnStagePrev.disabled = (pageNum === 1);
    if (this.btnStageNext) this.btnStageNext.disabled = (pageNum === this.totalPages);
    if (this.topbarBadge) this.topbarBadge.textContent = `Pág. ${pageNum} / ${this.totalPages}`;
  }

  nextPage() {
    if (this.currentPage < this.totalPages && !this.isFlipping) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1 && !this.isFlipping) {
      this.goToPage(this.currentPage - 1);
    }
  }

  lazyInitPageComponents(pageNum) {
    // Página 3: Mapa Mental y Línea de Tiempo
    if (pageNum === 3) {
      if (!this.initializedComponents.mindmap && window.MindMapManager) {
        new window.MindMapManager('mindmap-canvas');
        this.initializedComponents.mindmap = true;
      }
      if (!this.initializedComponents.timeline && window.TimelineManager) {
        new window.TimelineManager('timeline-track-items', 'timeline-detail-card');
        this.initializedComponents.timeline = true;
      }
    }

    // Página 7: Laboratorio GeoGebra
    if (pageNum === 7) {
      if (!this.initializedComponents.geogebra && window.GeoGebraPlane) {
        setTimeout(() => {
          window.geogebraInstance = new window.GeoGebraPlane('geogebra-canvas-elem');
          this.initializedComponents.geogebra = true;
        }, 50);
      } else if (window.geogebraInstance) {
        setTimeout(() => {
          window.geogebraInstance.initCanvasSize();
          window.geogebraInstance.render();
        }, 60);
      }
    }

    // Página 8: Simulaciones en Vivo
    if (pageNum === 8) {
      if (!this.initializedComponents.simulations) {
        setTimeout(() => {
          if (window.SpringMassSimulator) {
            window.springSimInstance = new window.SpringMassSimulator('spring-canvas-elem');
          }
          if (window.SimplePendulumSimulator) {
            window.pendulumSimInstance = new window.SimplePendulumSimulator('pendulum-canvas-elem');
          }
          this.initializedComponents.simulations = true;
        }, 50);
      } else {
        setTimeout(() => {
          if (window.springSimInstance) window.springSimInstance.initCanvasSize();
          if (window.pendulumSimInstance) window.pendulumSimInstance.initCanvasSize();
        }, 60);
      }
    }
  }

  renderMath() {
    if (window.renderMathInElement) {
      setTimeout(() => {
        const activePage = document.querySelector('.notebook-page.active');
        if (activePage) {
          window.renderMathInElement(activePage, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          });
        }
      }, 30);
    }
  }
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new NotebookApp();
});
