/**
 * ============================================================================
 * MAPA MENTAL INTERACTIVO Y LÍNEA DE TIEMPO HISTÓRICA
 * Renderizado SVG reactivo, nodos expandibles y detalles contextuales
 * ============================================================================
 */

const MindMapData = {
  root: {
    id: 'root',
    title: 'Movimiento Oscilatorio & M.A.S.',
    icon: 'fas fa-atom',
    desc: 'Estudio cinemático, dinámico y energético de cuerpos que oscilan periódicamente en torno a una posición de equilibrio estable bajo fuerzas restauradoras.'
  },
  nodes: [
    {
      id: 'cinematica',
      title: 'Cinemática del M.A.S.',
      icon: 'fas fa-chart-line',
      x: 18, y: 22,
      class: 'child-1',
      desc: 'Describe la evolución temporal de la posición, velocidad y aceleración sin atender las causas que lo originan.',
      details: [
        '<strong>Elongación:</strong> $x(t) = A \\cos(\\omega t + \\phi)$',
        '<strong>Velocidad:</strong> $v(t) = -A\\omega \\sin(\\omega t + \\phi)$ (desfase de $\\pi/2$ rad)',
        '<strong>Aceleración:</strong> $a(t) = -A\\omega^2 \\cos(\\omega t + \\phi) = -\\omega^2 x(t)$ (desfase de $\\pi$ rad)'
      ]
    },
    {
      id: 'dinamica',
      title: 'Dinámica & Ley de Hooke',
      icon: 'fas fa-cogs',
      x: 72, y: 22,
      class: 'child-2',
      desc: 'Causa física de la oscilación generada por una fuerza proporcional y opuesta al desplazamiento.',
      details: [
        '<strong>Fuerza Restauradora:</strong> $F_e = -k x$',
        '<strong>2da Ley de Newton:</strong> $m\\frac{d^2x}{dt^2} = -k x$',
        '<strong>Ecuación Diferencial:</strong> $\\frac{d^2x}{dt^2} + \\omega^2 x = 0$',
        '<strong>Frecuencia Propia:</strong> $\\omega = \\sqrt{k/m}$'
      ]
    },
    {
      id: 'energia',
      title: 'Energía en el M.A.S.',
      icon: 'fas fa-bolt',
      x: 18, y: 72,
      class: 'child-3',
      desc: 'Conservación de la energía mecánica en ausencia de fuerzas disipativas (amortiguamiento nulo).',
      details: [
        '<strong>Energía Cinética:</strong> $E_c = \\frac{1}{2}m v^2 = \\frac{1}{2}m\\omega^2 A^2 \\sin^2(\\omega t + \\phi)$',
        '<strong>Energía Potencial:</strong> $E_p = \\frac{1}{2}k x^2 = \\frac{1}{2}k A^2 \\cos^2(\\omega t + \\phi)$',
        '<strong>Energía Total Mecánica:</strong> $E = E_c + E_p = \\frac{1}{2}k A^2 = \\text{constante}$'
      ]
    },
    {
      id: 'sistemas',
      title: 'Sistemas Oscilantes',
      icon: 'fas fa-sliders-h',
      x: 72, y: 72,
      class: 'child-4',
      desc: 'Aplicaciones prototípicas en la física y la ingeniería.',
      details: [
        '<strong>Masa-Resorte:</strong> $T = 2\\pi \\sqrt{m/k}$',
        '<strong>Péndulo Simple:</strong> $T = 2\\pi \\sqrt{L/g}$ (para pequeñas oscilaciones $\\sin\\theta \\approx \\theta$)',
        '<strong>Péndulo Físico:</strong> $T = 2\\pi \\sqrt{I / (mgd)}$',
        '<strong>Péndulo de Torsión:</strong> $T = 2\\pi \\sqrt{I / \\kappa}$'
      ]
    }
  ]
};

const TimelineData = [
  {
    year: '1583',
    scientist: 'Galileo Galilei',
    avatar: 'fas fa-hourglass-half',
    title: 'Descubrimiento del Isocronismo del Péndulo',
    desc: 'Observando el balanceo de un candelabro en la Catedral de Pisa y comparándolo con su propio pulso cardíaco, Galileo descubrió que el periodo de oscilación de un péndulo es independiente de la amplitud (isocronismo para pequeños ángulos).'
  },
  {
    year: '1673',
    scientist: 'Christiaan Huygens',
    avatar: 'fas fa-clock',
    title: 'Invención del Reloj de Péndulo y Horologium Oscillatorium',
    desc: 'Huygens patentó el primer reloj de péndulo de alta precisión del mundo y dedujo rigurosamente la fórmula matemática del periodo del péndulo simple $T = 2\\pi\\sqrt{L/g}$, además de descubrir la cicloide como curva tautócrona.'
  },
  {
    year: '1678',
    scientist: 'Robert Hooke',
    avatar: 'fas fa-compress-arrows-alt',
    title: 'Formulación de la Ley de Elasticidad',
    desc: 'Hooke publicó su célebre anagrama "ceiiinosssttuv" (Ut tensio, sic vis: "como la extensión, así la fuerza"), estableciendo que la fuerza elástica es directamente proporcional al estiramiento o compresión ($F = -kx$).'
  },
  {
    year: '1687',
    scientist: 'Isaac Newton',
    avatar: 'fas fa-apple-alt',
    title: 'Fundamentación Dinámica en los Principia',
    desc: 'En su obra cumbre Philosophiae Naturalis Principia Mathematica, Newton conectó la segunda ley del movimiento $F = m\\cdot a$ con las fuerzas elásticas, sentando las bases analíticas del movimiento armónico simple.'
  },
  {
    year: '1739',
    scientist: 'Leonhard Euler',
    avatar: 'fas fa-calculator',
    title: 'Solución Analítica de la EDO y Resonancia',
    desc: 'Euler resolvió formalmente las ecuaciones diferenciales lineales con coeficientes constantes que describen las oscilaciones libres y forzadas, descubriendo teóricamente el fenómeno crítico de la resonancia mecánica.'
  }
];

class MindMapManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.modal = document.getElementById('mindmap-modal');
    this.render();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.container.offsetParent !== null) {
          this.render();
        }
      }, 100);
    });
  }

  render() {
    this.container.innerHTML = '';

    // Crear SVG para las líneas de conexión curvas
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;');
    this.container.appendChild(svg);

    // Nodo Raíz Central
    const rootNode = document.createElement('div');
    rootNode.className = 'mindmap-node root';
    rootNode.style.left = '50%';
    rootNode.style.top = '48%';
    rootNode.style.transform = 'translate(-50%, -50%)';
    rootNode.innerHTML = `<i class="${MindMapData.root.icon}"></i> ${MindMapData.root.title}`;
    rootNode.onclick = () => this.showDetail(MindMapData.root.title, MindMapData.root.desc, []);
    this.container.appendChild(rootNode);

    // Nodos Hijos
    MindMapData.nodes.forEach((node) => {
      const el = document.createElement('div');
      el.className = `mindmap-node ${node.class}`;
      el.style.left = `${node.x}%`;
      el.style.top = `${node.y}%`;
      el.style.transform = 'translate(-50%, -50%)';
      el.innerHTML = `<i class="${node.icon}"></i> ${node.title}`;
      el.onclick = () => this.showDetail(node.title, node.desc, node.details);
      this.container.appendChild(el);

      // Dibujar línea conectora curvada en SVG
      setTimeout(() => {
        const rootRect = rootNode.getBoundingClientRect();
        const nodeRect = el.getBoundingClientRect();
        const contRect = this.container.getBoundingClientRect();

        const x1 = rootRect.left + rootRect.width / 2 - contRect.left;
        const y1 = rootRect.top + rootRect.height / 2 - contRect.top;
        const x2 = nodeRect.left + nodeRect.width / 2 - contRect.left;
        const y2 = nodeRect.top + nodeRect.height / 2 - contRect.top;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2 - 20;
        path.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
        path.setAttribute('stroke', '#94a3b8');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }, 50);
    });
  }

  showDetail(title, desc, details = []) {
    if (!this.modal) return;
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <h4 style="font-size:1.05rem;color:#38bdf8;">${title}</h4>
      <button onclick="document.getElementById('mindmap-modal').style.display='none'" style="background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;">&times;</button>
    </div>
    <p style="font-size:0.88rem;color:#e2e8f0;margin-bottom:8px;">${desc}</p>`;

    if (details.length > 0) {
      html += '<ul style="font-size:0.85rem;color:#cbd5e1;padding-left:18px;line-height:1.6;">';
      details.forEach(d => {
        html += `<li>${d}</li>`;
      });
      html += '</ul>';
    }

    this.modal.innerHTML = html;
    this.modal.style.display = 'block';

    // Re-renderizar KaTeX si hay fórmulas
    if (window.renderMathInElement) {
      window.renderMathInElement(this.modal, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  }
}

class TimelineManager {
  constructor(containerId, detailCardId) {
    this.container = document.getElementById(containerId);
    this.detailCard = document.getElementById(detailCardId);
    if (!this.container) return;
    this.render();
    this.showScientist(TimelineData[0]);
  }

  render() {
    this.container.innerHTML = '';
    TimelineData.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'timeline-item';
      el.innerHTML = `
        <div class="timeline-dot">${index + 1}</div>
        <div class="timeline-year">${item.year}</div>
        <div class="timeline-name">${item.scientist}</div>
      `;
      el.onclick = () => this.showScientist(item);
      this.container.appendChild(el);
    });
  }

  showScientist(item) {
    if (!this.detailCard) return;
    this.detailCard.innerHTML = `
      <div class="timeline-avatar"><i class="${item.avatar}"></i></div>
      <div style="flex:1;">
        <div style="font-size:0.8rem;color:#0284c7;font-weight:700;text-transform:uppercase;">Hito Histórico (${item.year})</div>
        <h4 style="font-size:1.1rem;color:#0f2b48;margin:2px 0 6px 0;">${item.scientist}: ${item.title}</h4>
        <p style="font-size:0.88rem;color:#475569;line-height:1.5;">${item.desc}</p>
      </div>
    `;

    if (window.renderMathInElement) {
      window.renderMathInElement(this.detailCard, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  }
}

window.MindMapManager = MindMapManager;
window.TimelineManager = TimelineManager;
