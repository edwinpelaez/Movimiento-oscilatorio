/**
 * ============================================================================
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN SPA / PWA
 * Navegación de páginas, atajos de teclado, pantalla completa y gestión de estado
 * ============================================================================
 */

class NotebookApp {
  constructor() {
    this.currentPage = 1;
    this.totalPages = 10;
    this.pages = document.querySelectorAll('.notebook-page');
    this.pageSelect = document.getElementById('nav-page-select');
    this.btnPrev = document.getElementById('nav-btn-prev');
    this.btnNext = document.getElementById('nav-btn-next');
    this.btnHome = document.getElementById('nav-btn-home');
    this.btnToc = document.getElementById('nav-btn-toc');
    this.btnFullscreen = document.getElementById('nav-btn-fullscreen');
    this.topbarBadge = document.getElementById('topbar-page-badge');
    this.tocModal = document.getElementById('toc-modal');
    this.tocClose = document.getElementById('toc-modal-close');

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
    this.goToPage(1);
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
    if (this.pageSelect) {
      this.pageSelect.onchange = (e) => {
        this.goToPage(parseInt(e.target.value, 10));
      };
    }

    // Botón de apertura en la portada
    const journeyBtn = document.getElementById('cover-journey-btn');
    if (journeyBtn) {
      journeyBtn.onclick = (e) => {
        e.stopPropagation();
        this.goToPage(2);
      };
    }
  }

  bindKeyboardAndTouch() {
    // Teclas de flecha
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        this.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.prevPage();
      } else if (e.key === 'Home') {
        this.goToPage(1);
      } else if (e.key === 'End') {
        this.goToPage(this.totalPages);
      }
    });

    // Deslizamiento táctil (Swipe)
    let touchStartX = 0;
    let touchEndX = 0;

    window.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    }, { passive: true });
  }

  handleSwipe(startX, endX) {
    const threshold = 60; // Pixels mínimos para considerar un deslizamiento
    if (endX < startX - threshold) {
      this.nextPage(); // Deslizar hacia la izquierda -> Siguiente
    } else if (endX > startX + threshold) {
      this.prevPage(); // Deslizar hacia la derecha -> Anterior
    }
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

    // Enlaces de la tabla de contenidos
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

  goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;

    // Actualizar visibilidad de páginas
    this.pages.forEach((page, index) => {
      const pageIndex = index + 1;
      if (pageIndex === pageNum) {
        page.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const scrollBody = page.querySelector('.page-scroll-body');
        if (scrollBody) scrollBody.scrollTop = 0;
      } else {
        page.classList.remove('active');
      }
    });

    // Actualizar clase en el binder para ocultar o mostrar las anillas exteriores
    const binder = document.querySelector('.notebook-binder');
    if (binder) {
      if (pageNum === 1) {
        binder.classList.add('is-cover');
      } else {
        binder.classList.remove('is-cover');
      }
    }

    // Actualizar controles de navegación
    if (this.pageSelect) this.pageSelect.value = pageNum;
    if (this.btnPrev) this.btnPrev.disabled = (pageNum === 1);
    if (this.btnNext) this.btnNext.disabled = (pageNum === this.totalPages);
    if (this.topbarBadge) this.topbarBadge.textContent = `Pág. ${pageNum} / ${this.totalPages}`;

    // Inicialización bajo demanda de componentes complejos
    this.lazyInitPageComponents(pageNum);

    // Renderizar KaTeX
    this.renderMath();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
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
