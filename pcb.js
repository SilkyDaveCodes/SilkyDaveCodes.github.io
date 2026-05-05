(function() {
  const canvas = document.getElementById('pcb-canvas');
  const ctx = canvas.getContext('2d');

  const TRACE_COLOR = 'rgba(255, 79, 79,';
  const VIA_COLOR   = 'rgba(79, 163, 224,';
  const GRID = 40;

  let W, H, cols, rows;
  const traces = [];
  const MAX_TRACES = 18;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = Math.floor(W / GRID);
    rows = Math.floor(H / GRID);
  }

  function randGrid(max) { return Math.floor(Math.random() * max) * GRID; }

  function Trace() { this.init(); }

  Trace.prototype.init = function() {
    this.x1 = randGrid(cols);
    this.y1 = randGrid(rows);

    const horizFirst = Math.random() < 0.5;
    const leg1 = (3 + Math.floor(Math.random() * 8)) * GRID;
    const leg2 = (3 + Math.floor(Math.random() * 8)) * GRID;
    const dir1 = Math.random() < 0.5 ? 1 : -1;
    const dir2 = Math.random() < 0.5 ? 1 : -1;

    if (horizFirst) {
      this.corner = { x: this.x1 + dir1 * leg1, y: this.y1 };
      this.x2 = this.corner.x;
      this.y2 = this.y1 + dir2 * leg2;
    } else {
      this.corner = { x: this.x1, y: this.y1 + dir1 * leg1 };
      this.x2 = this.x1 + dir2 * leg2;
      this.y2 = this.corner.y;
    }

    this.totalLen = Math.abs(this.corner.x - this.x1)
                  + Math.abs(this.corner.y - this.y1)
                  + Math.abs(this.x2 - this.corner.x)
                  + Math.abs(this.y2 - this.corner.y);

    this.progress  = 0;
    this.speed     = 1.5 + Math.random() * 2.5;
    this.alpha     = 0;
    this.phase     = 'fadein';
    this.holdTimer = 0;
    this.width     = Math.random() < 0.15 ? 2.5 : 1.2;
    this.hasVia    = Math.random() < 0.5;
    this.delay     = Math.random() * 180;
  };

  Trace.prototype.update = function() {
    if (this.delay > 0) { this.delay--; return; }

    if (this.phase === 'fadein') {
      this.alpha += 0.04;
      if (this.alpha >= 1) { this.alpha = 1; this.phase = 'draw'; }
    } else if (this.phase === 'draw') {
      this.progress += this.speed;
      if (this.progress >= this.totalLen) {
        this.progress = this.totalLen;
        this.phase = 'hold';
        this.holdTimer = 60 + Math.random() * 120;
      }
    } else if (this.phase === 'hold') {
      this.holdTimer--;
      if (this.holdTimer <= 0) this.phase = 'fadeout';
    } else if (this.phase === 'fadeout') {
      this.alpha -= 0.018;
      if (this.alpha <= 0) { this.alpha = 0; this.phase = 'done'; }
    }
  };

  Trace.prototype.pointAt = function(p) {
    const seg1 = Math.abs(this.corner.x - this.x1) + Math.abs(this.corner.y - this.y1);
    if (p <= seg1) {
      const t = p / seg1;
      return {
        x: this.x1 + (this.corner.x - this.x1) * t,
        y: this.y1 + (this.corner.y - this.y1) * t
      };
    } else {
      const t = (p - seg1) / (this.totalLen - seg1);
      return {
        x: this.corner.x + (this.x2 - this.corner.x) * t,
        y: this.corner.y + (this.y2 - this.corner.y) * t
      };
    }
  };

  Trace.prototype.draw = function() {
    if (this.alpha <= 0) return;
    const tip = this.pointAt(this.progress);
    const seg1Len = Math.abs(this.corner.x - this.x1) + Math.abs(this.corner.y - this.y1);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.lineWidth   = this.width;
    ctx.lineCap     = 'square';
    ctx.shadowColor = TRACE_COLOR + '0.6)';
    ctx.shadowBlur  = 4;
    ctx.strokeStyle = TRACE_COLOR + '0.7)';

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    if (this.progress <= seg1Len) {
      ctx.lineTo(tip.x, tip.y);
    } else {
      ctx.lineTo(this.corner.x, this.corner.y);
      ctx.lineTo(tip.x, tip.y);
    }
    ctx.stroke();

    // Start pad
    ctx.fillStyle  = TRACE_COLOR + '0.9)';
    ctx.shadowBlur = 6;
    ctx.fillRect(this.x1 - 3, this.y1 - 3, 6, 6);

    // Via at corner
    if (this.hasVia && this.progress >= seg1Len) {
      ctx.strokeStyle = VIA_COLOR + '0.85)';
      ctx.shadowColor = VIA_COLOR + '0.6)';
      ctx.fillStyle   = 'rgba(7,8,10,1)';
      ctx.lineWidth   = 1.2;
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.arc(this.corner.x, this.corner.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = VIA_COLOR + '0.5)';
      ctx.beginPath();
      ctx.arc(this.corner.x, this.corner.y, 6.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // End pad
    if (this.progress >= this.totalLen) {
      ctx.shadowColor = TRACE_COLOR + '0.6)';
      ctx.fillStyle   = TRACE_COLOR + '0.9)';
      ctx.fillRect(this.x2 - 3, this.y2 - 3, 6, 6);
    }

    // Drawing head dot
    if (this.phase === 'draw') {
      ctx.shadowColor = TRACE_COLOR + '1)';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  function loop() {
    ctx.clearRect(0, 0, W, H);
    while (traces.length < MAX_TRACES) traces.push(new Trace());
    for (let i = 0; i < traces.length; i++) {
      traces[i].update();
      traces[i].draw();
      if (traces[i].phase === 'done') traces[i].init();
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  loop();
})();
