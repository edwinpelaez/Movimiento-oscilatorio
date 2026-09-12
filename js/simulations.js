/**
 * ============================================================================
 * SIMULADORES FÍSICOS INTERACTIVOS EN TIEMPO REAL
 * 1. Sistema Masa-Resorte Horizontal con Vectores y Medidores de Energía
 * 2. Péndulo Simple con Descomposición Vectorial de Fuerzas
 * ============================================================================
 */

class SpringMassSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Parámetros Físicos
    this.m = 1.0;     // Masa [kg]
    this.k = 25.0;    // Constante elástica [N/m]
    this.A = 80;      // Amplitud en pixels (~ 0.8 m escalado)
    this.b = 0.0;     // Coeficiente de amortiguamiento

    // Estado dinámico
    this.x = this.A;  // Posición actual
    this.v = 0.0;     // Velocidad actual
    this.isRunning = true;
    this.lastTime = performance.now();

    this.initCanvasSize();
    this.setupUI();
    window.addEventListener('resize', () => this.initCanvasSize());
    this.animate();
  }

  initCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width > 0 ? rect.width : (this.canvas.parentElement.clientWidth || 380);
    this.height = 250;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    const wallX = 35;
    const availableWidth = this.width - wallX;
    this.equilibriumX = wallX + availableWidth * 0.46;

    // Amplitud segura para que nunca toque la pared ni el borde derecho
    const maxSafeA = Math.max(35, Math.min(this.equilibriumX - wallX - 45, this.width - this.equilibriumX - 55));
    if (this.A > maxSafeA) {
      this.A = maxSafeA;
      this.x = this.A;
    }
  }

  updatePhysics(dt) {
    if (!this.isRunning) return;
    const clampedDt = Math.min(dt, 0.05); // Evitar saltos de integración
    
    // Ecuación dinámica: m*a = -k*x - b*v  =>  a = -(k/m)*x - (b/m)*v
    const a = -(this.k / this.m) * (this.x) - (this.b / this.m) * this.v;
    this.v += a * clampedDt;
    this.x += this.v * clampedDt;
  }

  animate() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.updatePhysics(dt);
    this.render();
    this.updateEnergyMeters();

    requestAnimationFrame(() => this.animate());
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const wallX = 35;
    const groundY = 175;
    const blockWidth = 48;
    const blockHeight = 38;
    const currentBlockX = this.equilibriumX + this.x - blockWidth / 2;
    const currentBlockY = groundY - blockHeight;

    // 1. Pared y Piso
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(wallX - 10, 30, 10, groundY - 30 + 10);
    ctx.fillRect(wallX - 10, groundY, this.width - wallX, 8);

    // Patrón de rayado en la pared (hatch)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (let y = 35; y < groundY; y += 12) {
      ctx.beginPath();
      ctx.moveTo(wallX - 10, y);
      ctx.lineTo(wallX - 2, y - 8);
      ctx.stroke();
    }

    // Línea de equilibrio punteada
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.equilibriumX, 35);
    ctx.lineTo(this.equilibriumX, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '10px "Outfit", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('x = 0', this.equilibriumX, groundY + 20);

    // 2. Resorte Helicoidal Realista
    this.drawCoilSpring(ctx, wallX, groundY - blockHeight / 2, currentBlockX, groundY - blockHeight / 2);

    // 3. Bloque / Masa oscilante
    const gradient = ctx.createLinearGradient(currentBlockX, currentBlockY, currentBlockX, groundY);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(1, '#0284c7');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#0f2b48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(currentBlockX, currentBlockY, blockWidth, blockHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Texto de masa
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m = ${this.m}kg`, currentBlockX + blockWidth / 2, currentBlockY + blockHeight / 2 + 4);

    // 4. Vector Fuerza Elástica: F_e = -k * x
    const forceMag = -this.x * 0.5; // Factor de escala visual seguro
    if (Math.abs(forceMag) > 3) {
      this.drawVector(
        ctx,
        currentBlockX + blockWidth / 2,
        currentBlockY - 14,
        currentBlockX + blockWidth / 2 + forceMag,
        currentBlockY - 14,
        '#dc2626',
        'Fe'
      );
    }

    // 5. Vector Velocidad: v
    const velMag = this.v * 0.32;
    if (Math.abs(velMag) > 3) {
      this.drawVector(
        ctx,
        currentBlockX + blockWidth / 2,
        currentBlockY - 28,
        currentBlockX + blockWidth / 2 + velMag,
        currentBlockY - 28,
        '#16a34a',
        'v'
      );
    }
  }

  drawCoilSpring(ctx, x1, y1, x2, y2) {
    const coils = 14;
    const springLen = x2 - x1;
    const coilWidth = springLen / coils;
    const coilRadius = 14;

    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    // Tramo recto inicial
    ctx.lineTo(x1 + 10, y1);

    for (let i = 0; i < coils; i++) {
      const startX = x1 + 10 + i * (springLen - 20) / coils;
      const midX = startX + (springLen - 20) / (coils * 2);
      const endX = startX + (springLen - 20) / coils;
      const yOffset = (i % 2 === 0 ? -1 : 1) * coilRadius;

      ctx.lineTo(midX, y1 + yOffset);
      ctx.lineTo(endX, y1);
    }

    // Tramo recto final
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  drawVector(ctx, fromX, fromY, toX, toY, color, label) {
    const pad = 6;
    const safeToX = Math.max(pad, Math.min(this.width - pad, toX));
    const safeToY = Math.max(pad, Math.min(this.height - pad, toY));
    const headLen = 7;
    const angle = Math.atan2(safeToY - fromY, safeToX - fromX);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(safeToX, safeToY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(safeToX, safeToY);
    ctx.lineTo(safeToX - headLen * Math.cos(angle - Math.PI / 6), safeToY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(safeToX - headLen * Math.cos(angle + Math.PI / 6), safeToY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 10px "Outfit", sans-serif';
    ctx.fillText(label, safeToX, safeToY - 6);
    ctx.restore();
  }

  updateEnergyMeters() {
    // Escala métrica aproximada: 100px = 1m
    const xMeters = this.x / 100;
    const vMeters = this.v / 100;

    const Ec = 0.5 * this.m * (vMeters * vMeters);
    const Ep = 0.5 * this.k * (xMeters * xMeters);
    const Et = Ec + Ep;

    const maxEt = 0.5 * this.k * Math.pow(this.A / 100, 2) || 1;

    const pctK = Math.min(100, Math.max(0, (Ec / maxEt) * 100));
    const pctU = Math.min(100, Math.max(0, (Ep / maxEt) * 100));

    const fillK = document.getElementById('spring-meter-k');
    const fillU = document.getElementById('spring-meter-u');
    const valK = document.getElementById('spring-val-k');
    const valU = document.getElementById('spring-val-u');
    const valT = document.getElementById('spring-val-t');

    if (fillK) fillK.style.width = `${pctK}%`;
    if (fillU) fillU.style.width = `${pctU}%`;
    if (valK) valK.textContent = `${Ec.toFixed(2)} J`;
    if (valU) valU.textContent = `${Ep.toFixed(2)} J`;
    if (valT) valT.textContent = `${Et.toFixed(2)} J`;
  }

  setupUI() {
    const btnToggle = document.getElementById('spring-btn-play');
    const btnReset = document.getElementById('spring-btn-reset');
    const sliderK = document.getElementById('spring-slider-k');
    const sliderM = document.getElementById('spring-slider-m');
    const sliderA = document.getElementById('spring-slider-a');

    if (btnToggle) {
      btnToggle.onclick = () => {
        this.isRunning = !this.isRunning;
        btnToggle.innerHTML = this.isRunning
          ? '<i class="fas fa-pause"></i> Pausa'
          : '<i class="fas fa-play"></i> Reanudar';
      };
    }

    if (btnReset) {
      btnReset.onclick = () => {
        this.x = this.A;
        this.v = 0;
        this.render();
      };
    }

    if (sliderK) {
      sliderK.oninput = (e) => {
        this.k = parseFloat(e.target.value);
        const lbl = document.getElementById('spring-label-k');
        if (lbl) lbl.textContent = `${this.k} N/m`;
      };
    }

    if (sliderM) {
      sliderM.oninput = (e) => {
        this.m = parseFloat(e.target.value);
        const lbl = document.getElementById('spring-label-m');
        if (lbl) lbl.textContent = `${this.m} kg`;
      };
    }

    if (sliderA) {
      sliderA.oninput = (e) => {
        this.A = parseFloat(e.target.value);
        this.x = this.A;
        this.v = 0;
        const lbl = document.getElementById('spring-label-a');
        if (lbl) lbl.textContent = `${(this.A / 100).toFixed(2)} m`;
      };
    }
  }
}

// -------------------------------------------------------------
// Simulador de Péndulo Simple con Vectores Dinámicos
// -------------------------------------------------------------
class SimplePendulumSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Parámetros Físicos
    this.L = 130;        // Longitud en pixels (~ 1.3 m escalado)
    this.g = 9.8;        // Aceleración de gravedad [m/s^2]
    this.theta0 = 0.35;  // Ángulo inicial (~ 20 grados en radianes)
    this.theta = this.theta0;
    this.omega = 0.0;    // Velocidad angular

    this.isRunning = true;
    this.lastTime = performance.now();

    this.initCanvasSize();
    this.setupUI();
    window.addEventListener('resize', () => {
      this.initCanvasSize();
    });
    this.animate();
  }

  initCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width > 0 ? rect.width : (this.canvas.parentElement.clientWidth || 380);
    this.height = 250;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.pivotX = this.width / 2;
    this.pivotY = 22;
  }

  updatePhysics(dt) {
    if (!this.isRunning) return;
    const clampedDt = Math.min(dt, 0.05);

    // Ecuación de movimiento del péndulo simple: alpha = -(g / L) * sin(theta)
    const scaledL = this.L / 100;
    const alpha = -(this.g / scaledL) * Math.sin(this.theta);
    this.omega += alpha * clampedDt;
    this.theta += this.omega * clampedDt;
  }

  animate() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.updatePhysics(dt);
    this.render();
    this.updateEnergyMeters();

    requestAnimationFrame(() => this.animate());
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Escala visual calculada para que el péndulo y vectores quepan holgadamente
    const visualL = this.L * 0.76;
    const bobX = this.pivotX + visualL * Math.sin(this.theta);
    const bobY = this.pivotY + visualL * Math.cos(this.theta);
    const bobRadius = 13;

    // 1. Soporte Rígido Superior
    ctx.fillStyle = '#0f2b48';
    ctx.fillRect(this.pivotX - 35, this.pivotY - 8, 70, 8);

    // 2. Línea de Referencia Vertical (Equilibrio theta = 0)
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(this.pivotX, this.pivotY);
    ctx.lineTo(this.pivotX, this.pivotY + visualL + 16);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Arco de Ángulo Theta
    if (Math.abs(this.theta) > 0.04) {
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const startAngle = Math.PI / 2;
      const endAngle = Math.PI / 2 + this.theta;
      ctx.arc(this.pivotX, this.pivotY, 32, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
      ctx.stroke();

      ctx.font = '10px "Outfit", sans-serif';
      ctx.fillStyle = '#d97706';
      ctx.fillText(`θ`, this.pivotX + (this.theta > 0 ? 12 : -18), this.pivotY + 44);
    }

    // 4. Hilo del Péndulo
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.pivotX, this.pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // 5. Lenteja / Masa del Péndulo
    const grad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Vectores de Fuerza Dinámicos
    // Vector Peso: P = mg (Hacia abajo, acotado seguro)
    this.drawVector(ctx, bobX, bobY, bobX, bobY + 30, '#dc2626', 'P = mg');

    // Vector Tensión: T (Hacia el pivote)
    const tenMag = 30 * Math.cos(this.theta);
    const tenX = bobX - tenMag * Math.sin(this.theta);
    const tenY = bobY - tenMag * Math.cos(this.theta);
    this.drawVector(ctx, bobX, bobY, tenX, tenY, '#2563eb', 'T');

    // Vector Fuerza Tangencial Restauradora
    const restMag = -30 * Math.sin(this.theta);
    const restX = bobX + restMag * Math.cos(this.theta);
    const restY = bobY - restMag * Math.sin(this.theta);
    if (Math.abs(restMag) > 3) {
      this.drawVector(ctx, bobX, bobY, restX, restY, '#16a34a', 'Ft');
    }
  }

  drawVector(ctx, fromX, fromY, toX, toY, color, label) {
    const pad = 6;
    const safeToX = Math.max(pad, Math.min(this.width - pad, toX));
    const safeToY = Math.max(pad, Math.min(this.height - pad, toY));
    const headLen = 6;
    const angle = Math.atan2(safeToY - fromY, safeToX - fromX);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(safeToX, safeToY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(safeToX, safeToY);
    ctx.lineTo(safeToX - headLen * Math.cos(angle - Math.PI / 6), safeToY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(safeToX - headLen * Math.cos(angle + Math.PI / 6), safeToY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 9px "Outfit", sans-serif';
    ctx.fillText(label, safeToX + 4, safeToY + 2);
    ctx.restore();
  }

  updateEnergyMeters() {
    const scaledL = this.L / 100;
    const v = this.omega * scaledL;
    const h = scaledL * (1 - Math.cos(this.theta));
    const m = 1.0;

    const Ec = 0.5 * m * v * v;
    const Ep = m * this.g * h;
    const maxEt = m * this.g * (scaledL * (1 - Math.cos(this.theta0))) || 1;

    const pctK = Math.min(100, Math.max(0, (Ec / maxEt) * 100));
    const pctU = Math.min(100, Math.max(0, (Ep / maxEt) * 100));

    const fillK = document.getElementById('pendulum-meter-k');
    const fillU = document.getElementById('pendulum-meter-u');
    const valK = document.getElementById('pendulum-val-k');
    const valU = document.getElementById('pendulum-val-u');

    if (fillK) fillK.style.width = `${pctK}%`;
    if (fillU) fillU.style.width = `${pctU}%`;
    if (valK) valK.textContent = `${Ec.toFixed(2)} J`;
    if (valU) valU.textContent = `${Ep.toFixed(2)} J`;
  }

  setupUI() {
    const btnToggle = document.getElementById('pendulum-btn-play');
    const btnReset = document.getElementById('pendulum-btn-reset');
    const sliderL = document.getElementById('pendulum-slider-l');
    const sliderT = document.getElementById('pendulum-slider-t');

    if (btnToggle) {
      btnToggle.onclick = () => {
        this.isRunning = !this.isRunning;
        btnToggle.innerHTML = this.isRunning
          ? '<i class="fas fa-pause"></i> Pausa'
          : '<i class="fas fa-play"></i> Reanudar';
      };
    }

    if (btnReset) {
      btnReset.onclick = () => {
        this.theta = this.theta0;
        this.omega = 0;
        this.render();
      };
    }

    if (sliderL) {
      sliderL.oninput = (e) => {
        this.L = parseFloat(e.target.value);
        const lbl = document.getElementById('pendulum-label-l');
        if (lbl) lbl.textContent = `${(this.L / 100).toFixed(2)} m`;
      };
    }

    if (sliderT) {
      sliderT.oninput = (e) => {
        const deg = parseFloat(e.target.value);
        this.theta0 = deg * (Math.PI / 180);
        this.theta = this.theta0;
        this.omega = 0;
        const lbl = document.getElementById('pendulum-label-t');
        if (lbl) lbl.textContent = `${deg}°`;
      };
    }
  }
}

window.SpringMassSimulator = SpringMassSimulator;
window.SimplePendulumSimulator = SimplePendulumSimulator;
