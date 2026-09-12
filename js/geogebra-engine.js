/**
 * ============================================================================
 * MOTOR DE PLANO CARTESIANO INTERACTIVO ESTILO GEOGEBRA
 * Cuadrícula Milimetrada, Reglas en Ejes, Manejo de Escalas y Paleta de Estilos
 * ============================================================================
 */

class GeoGebraPlane {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.wrapper = this.canvas.parentElement;
    
    // Parámetros Físicos del M.A.S.
    this.params = {
      A: options.A || 2.0,       // Amplitud [m]
      omega: options.omega || 1.5,// Frecuencia angular [rad/s]
      phi: options.phi || 0.0,   // Fase inicial [rad]
      showX: true,               // Mostrar x(t)
      showV: true,               // Mostrar v(t)
      showA: false               // Mostrar a(t)
    };

    // Estilos gráficos personalizados
    this.styles = {
      colorX: '#2563eb', // Azul
      colorV: '#dc2626', // Rojo
      colorA: '#059669', // Verde Esmeralda
      lineWidth: 2.5,
      lineDash: [],      // Sólido por defecto
      gridMajorColor: '#cbd5e1',
      gridMinorColor: '#f1f5f9',
      axisColor: '#1e293b'
    };

    // Transformación y Escalas del Plano
    this.scaleX = 45; // Pixels por segundo (eje t)
    this.scaleY = 35; // Pixels por metro (eje x/v/a)
    this.originX = 90; // Pixels desde el borde izquierdo
    this.originY = 210;// Pixels desde el borde superior
    this.defaultOrigin = { x: 90, y: 210, scaleX: 45, scaleY: 35 };

    // Modos de interacción: 'pan', 'inspect', 'default'
    this.mode = 'pan';
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.hoverPoint = null;

    this.initCanvasSize();
    this.bindEvents();
    this.setupUIControls();
    this.render();
  }

  initCanvasSize() {
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width > 0 ? rect.width : (this.wrapper.clientWidth || 780);
    this.height = rect.height > 0 ? rect.height : (this.wrapper.clientHeight || 300);
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.originY = this.height / 2;
    this.defaultOrigin.y = this.height / 2;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.render();
    });

    // Eventos del Mouse / Táctil
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.onMouseDown({ clientX: t.clientX, clientY: t.clientY });
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => this.onMouseUp());
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.isDragging = true;
    this.dragStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.isDragging && this.mode === 'pan') {
      const dx = mouseX - this.dragStart.x;
      const dy = mouseY - this.dragStart.y;
      this.originX += dx;
      this.originY += dy;
      this.dragStart = { x: mouseX, y: mouseY };
      this.render();
    }

    // Coordenadas matemáticas para el inspector
    const t = (mouseX - this.originX) / this.scaleX;
    const yVal = -(mouseY - this.originY) / this.scaleY;
    
    // Actualizar badge flotante de coordenadas
    const coordsBadge = document.getElementById('geogebra-coords');
    if (coordsBadge) {
      coordsBadge.textContent = `t: ${t.toFixed(2)} s | y: ${yVal.toFixed(2)}`;
    }

    if (this.mode === 'inspect') {
      this.hoverPoint = { t, mouseX, mouseY };
      this.render();
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    this.applyZoom(zoomFactor, mouseX, mouseY);
  }

  applyZoom(factor, centerX = this.width / 2, centerY = this.height / 2) {
    const tBefore = (centerX - this.originX) / this.scaleX;
    const yBefore = (centerY - this.originY) / this.scaleY;

    this.scaleX = Math.max(12, Math.min(250, this.scaleX * factor));
    this.scaleY = Math.max(10, Math.min(200, this.scaleY * factor));

    this.originX = centerX - tBefore * this.scaleX;
    this.originY = centerY - yBefore * this.scaleY;

    this.render();
  }

  resetView() {
    this.originX = this.defaultOrigin.x;
    this.originY = this.defaultOrigin.y;
    this.scaleX = this.defaultOrigin.scaleX;
    this.scaleY = this.defaultOrigin.scaleY;
    this.render();
  }

  // -------------------------------------------------------------
  // Renderizado del Papel Milimetrado y Reglas estilo GeoGebra
  // -------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawMillimeterGrid();
    this.drawAxesAndRulers();
    this.drawPhysicsCurves();

    if (this.mode === 'inspect' && this.hoverPoint) {
      this.drawInspectorPoint();
    }
  }

  calculateNiceStep(scale) {
    const targetPixelSpacing = 60;
    const rawStep = targetPixelSpacing / scale;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / magnitude;

    let niceFraction;
    if (fraction <= 1.5) niceFraction = 1;
    else if (fraction <= 3.5) niceFraction = 2;
    else if (fraction <= 7.5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * magnitude;
  }

  drawMillimeterGrid() {
    const ctx = this.ctx;
    const stepX = this.calculateNiceStep(this.scaleX);
    const stepY = this.calculateNiceStep(this.scaleY);

    // 1. Cuadrícula Menor (Subdivisiones papel milimetrado - 5 divisiones por paso)
    const minorStepX = stepX / 5;
    const minorStepY = stepY / 5;

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.8;
    ctx.beginPath();

    // Líneas menores verticales
    const startX = Math.floor(-this.originX / (minorStepX * this.scaleX));
    const endX = Math.ceil((this.width - this.originX) / (minorStepX * this.scaleX));
    for (let i = startX; i <= endX; i++) {
      const px = this.originX + i * minorStepX * this.scaleX;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, this.height);
    }

    // Líneas menores horizontales
    const startY = Math.floor(-this.originY / (minorStepY * this.scaleY));
    const endY = Math.ceil((this.height - this.originY) / (minorStepY * this.scaleY));
    for (let j = startY; j <= endY; j++) {
      const py = this.originY + j * minorStepY * this.scaleY;
      ctx.moveTo(0, py);
      ctx.lineTo(this.width, py);
    }
    ctx.stroke();

    // 2. Cuadrícula Mayor (Marcas principales)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    const majorStartX = Math.floor(-this.originX / (stepX * this.scaleX));
    const majorEndX = Math.ceil((this.width - this.originX) / (stepX * this.scaleX));
    for (let i = majorStartX; i <= majorEndX; i++) {
      const px = this.originX + i * stepX * this.scaleX;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, this.height);
    }

    const majorStartY = Math.floor(-this.originY / (stepY * this.scaleY));
    const majorEndY = Math.ceil((this.height - this.originY) / (stepY * this.scaleY));
    for (let j = majorStartY; j <= majorEndY; j++) {
      const py = this.originY + j * stepY * this.scaleY;
      ctx.moveTo(0, py);
      ctx.lineTo(this.width, py);
    }
    ctx.stroke();
  }

  drawAxesAndRulers() {
    const ctx = this.ctx;
    const stepX = this.calculateNiceStep(this.scaleX);
    const stepY = this.calculateNiceStep(this.scaleY);

    // Ejes Principales (X / t  e  Y / x)
    ctx.strokeStyle = this.styles.axisColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    // Eje Horizontal (t)
    ctx.moveTo(0, this.originY);
    ctx.lineTo(this.width, this.originY);

    // Eje Vertical (x, v, a)
    ctx.moveTo(this.originX, 0);
    ctx.lineTo(this.originX, this.height);
    ctx.stroke();

    // Flechas de dirección en los extremos de los ejes
    this.drawArrow(ctx, this.width - 15, this.originY, this.width, this.originY);
    this.drawArrow(ctx, this.originX, 15, this.originX, 0);

    // Marcas (Ticks) y Números sobre los ejes
    ctx.font = '11px "Outfit", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Marcas en Eje Horizontal (Tiempo t [s])
    const majorStartX = Math.floor(-this.originX / (stepX * this.scaleX));
    const majorEndX = Math.ceil((this.width - this.originX) / (stepX * this.scaleX));
    for (let i = majorStartX; i <= majorEndX; i++) {
      if (i === 0) continue; // El cero se marca aparte
      const val = (i * stepX);
      const px = this.originX + val * this.scaleX;
      
      // Ticks
      ctx.beginPath();
      ctx.moveTo(px, this.originY - 5);
      ctx.lineTo(px, this.originY + 5);
      ctx.stroke();

      // Número
      ctx.fillText(val.toFixed(val % 1 === 0 ? 0 : 1), px, this.originY + 7);
    }

    // Marcas en Eje Vertical
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const majorStartY = Math.floor(-this.originY / (stepY * this.scaleY));
    const majorEndY = Math.ceil((this.height - this.originY) / (stepY * this.scaleY));
    for (let j = majorStartY; j <= majorEndY; j++) {
      if (j === 0) continue;
      const val = (-j * stepY);
      const py = this.originY + j * stepY * this.scaleY;

      // Ticks
      ctx.beginPath();
      ctx.moveTo(this.originX - 5, py);
      ctx.lineTo(this.originX + 5, py);
      ctx.stroke();

      // Número
      ctx.fillText(val.toFixed(val % 1 === 0 ? 0 : 1), this.originX - 8, py);
    }

    // Origen (0,0)
    ctx.fillText('0', this.originX - 6, this.originY + 6);

    // Etiquetas de los Ejes
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillStyle = '#0f2b48';
    ctx.textAlign = 'left';
    ctx.fillText('t (s)', this.width - 32, this.originY - 14);
    ctx.fillText('x, v, a', this.originX + 10, 14);
  }

  drawArrow(ctx, fromX, fromY, toX, toY) {
    const headLen = 8;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = this.styles.axisColor;
    ctx.fill();
  }

  // -------------------------------------------------------------
  // Graficación Dinámica de las Funciones Cinemáticas
  // -------------------------------------------------------------
  drawPhysicsCurves() {
    const ctx = this.ctx;
    const { A, omega, phi, showX, showV, showA } = this.params;

    // 1. Curva de Elongación: x(t) = A * cos(omega * t + phi)
    if (showX) {
      this.plotEquation((t) => A * Math.cos(omega * t + phi), this.styles.colorX, this.styles.lineWidth, []);
    }

    // 2. Curva de Velocidad: v(t) = -A * omega * sin(omega * t + phi)
    if (showV) {
      this.plotEquation((t) => -A * omega * Math.sin(omega * t + phi), this.styles.colorV, this.styles.lineWidth - 0.5, [5, 4]);
    }

    // 3. Curva de Aceleración: a(t) = -A * omega^2 * cos(omega * t + phi)
    if (showA) {
      this.plotEquation((t) => -A * omega * omega * Math.cos(omega * t + phi), this.styles.colorA, this.styles.lineWidth - 0.5, [2, 3]);
    }
  }

  plotEquation(fn, color, width, dash = []) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();

    let started = false;
    for (let px = 0; px <= this.width; px += 2) {
      const t = (px - this.originX) / this.scaleX;
      const yVal = fn(t);
      const py = this.originY - yVal * this.scaleY;

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  drawInspectorPoint() {
    const { t } = this.hoverPoint;
    const { A, omega, phi, showX } = this.params;
    if (!showX) return;

    const xVal = A * Math.cos(omega * t + phi);
    const px = this.originX + t * this.scaleX;
    const py = this.originY - xVal * this.scaleY;

    const ctx = this.ctx;
    ctx.save();

    // Líneas guía punteadas a los ejes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, this.originY);
    ctx.lineTo(px, py);
    ctx.lineTo(this.originX, py);
    ctx.stroke();

    // Punto resaltado con halo
    ctx.setLineDash([]);
    ctx.fillStyle = this.styles.colorX;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tarjeta con valor
    const text = `(t: ${t.toFixed(2)}s, x: ${xVal.toFixed(2)}m)`;
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillStyle = '#0f2b48';
    ctx.fillText(text, px + 10, py - 10);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Conexión con la UI y Barra de Herramientas
  // -------------------------------------------------------------
  setupUIControls() {
    // Botones de Toolbar GeoGebra
    const btnZoomIn = document.getElementById('geo-btn-zoomin');
    const btnZoomOut = document.getElementById('geo-btn-zoomout');
    const btnPan = document.getElementById('geo-btn-pan');
    const btnReset = document.getElementById('geo-btn-reset');
    const btnInspect = document.getElementById('geo-btn-inspect');
    const btnPalette = document.getElementById('geo-btn-palette');
    const palettePopover = document.getElementById('geo-palette-popover');

    if (btnZoomIn) btnZoomIn.onclick = () => this.applyZoom(1.2);
    if (btnZoomOut) btnZoomOut.onclick = () => this.applyZoom(0.83);
    if (btnReset) btnReset.onclick = () => this.resetView();

    if (btnPan) {
      btnPan.onclick = () => {
        this.mode = 'pan';
        this.wrapper.className = 'geogebra-canvas-wrapper pan-mode';
        btnPan.classList.add('active');
        if (btnInspect) btnInspect.classList.remove('active');
      };
    }

    if (btnInspect) {
      btnInspect.onclick = () => {
        this.mode = 'inspect';
        this.wrapper.className = 'geogebra-canvas-wrapper';
        btnInspect.classList.add('active');
        if (btnPan) btnPan.classList.remove('active');
      };
    }

    if (btnPalette && palettePopover) {
      btnPalette.onclick = (e) => {
        e.stopPropagation();
        palettePopover.classList.toggle('open');
      };
      document.addEventListener('click', (e) => {
        if (!palettePopover.contains(e.target) && e.target !== btnPalette) {
          palettePopover.classList.remove('open');
        }
      });
    }

    // Sliders de Parámetros Físicos
    const sliderA = document.getElementById('geo-slider-a');
    const sliderW = document.getElementById('geo-slider-w');
    const sliderP = document.getElementById('geo-slider-p');
    const valA = document.getElementById('geo-val-a');
    const valW = document.getElementById('geo-val-w');
    const valP = document.getElementById('geo-val-p');

    if (sliderA) {
      sliderA.oninput = (e) => {
        this.params.A = parseFloat(e.target.value);
        if (valA) valA.textContent = `${this.params.A.toFixed(1)} m`;
        this.render();
      };
    }
    if (sliderW) {
      sliderW.oninput = (e) => {
        this.params.omega = parseFloat(e.target.value);
        if (valW) valW.textContent = `${this.params.omega.toFixed(1)} rad/s`;
        this.render();
      };
    }
    if (sliderP) {
      sliderP.oninput = (e) => {
        this.params.phi = parseFloat(e.target.value);
        if (valP) valP.textContent = `${this.params.phi.toFixed(2)} rad`;
        this.render();
      };
    }

    // Toggles de curvas en leyenda
    const toggleX = document.getElementById('legend-toggle-x');
    const toggleV = document.getElementById('legend-toggle-v');
    const toggleA = document.getElementById('legend-toggle-a');

    if (toggleX) {
      toggleX.onclick = () => {
        this.params.showX = !this.params.showX;
        toggleX.style.opacity = this.params.showX ? '1' : '0.4';
        this.render();
      };
    }
    if (toggleV) {
      toggleV.onclick = () => {
        this.params.showV = !this.params.showV;
        toggleV.style.opacity = this.params.showV ? '1' : '0.4';
        this.render();
      };
    }
    if (toggleA) {
      toggleA.onclick = () => {
        this.params.showA = !this.params.showA;
        toggleA.style.opacity = this.params.showA ? '1' : '0.4';
        this.render();
      };
    }
  }

  setCurveColor(color) {
    this.styles.colorX = color;
    this.render();
  }

  setLineWidth(width) {
    this.styles.lineWidth = parseFloat(width);
    this.render();
  }
}

// Inicializador global
window.GeoGebraPlane = GeoGebraPlane;
