import { ThemeName } from '../shared/types';

export interface UICallbacks {
  onTogglePause: () => void;
  onToggleAutoRotate: () => void;
  onSetIntensity: (value: number) => void;
  onSetTheme: (theme: ThemeName) => void;
  onSetCenterCount: (value: number) => void;
  onSetRingWidth: (value: number) => void;
  onSetSpread: (value: number) => void;
  onSetCameraRadius: (value: number) => void;
}

export class UIController {
  private container: HTMLDivElement;
  private isVisible = false;
  private isPaused = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: UICallbacks) {
    this.container = document.createElement('div');
    this.container.id = 'ui-controls';
    this.render(callbacks);
    document.body.appendChild(this.container);
    this.bindEvents(callbacks);
    this.show();
  }

  private render(cb: UICallbacks): void {
    this.container.innerHTML = `
      <style>
        #ui-controls {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 24px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          z-index: 1000;
          transition: opacity 0.3s ease, transform 0.3s ease;
          opacity: 0;
          transform: translateX(-50%) translateY(10px);
          pointer-events: none;
          user-select: none;
          font-family: 'Segoe UI', sans-serif;
        }
        #ui-controls.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
          pointer-events: auto;
        }
        .ui-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }
        .ui-btn:hover {
          background: rgba(255,255,255,0.2);
        }
        .ui-btn.active {
          background: rgba(0,100,255,0.3);
          border-color: rgba(0,100,255,0.5);
        }
        .ui-label {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
        }
        .ui-slider {
          -webkit-appearance: none;
          width: 64px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.2);
          outline: none;
        }
        .ui-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #4488ff;
          cursor: pointer;
        }
        .ui-separator {
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.15);
        }
      </style>
      <button class="ui-btn" id="btn-pause">⏸ 暂停</button>
      <button class="ui-btn active" id="btn-rotate">🔄 旋转</button>
      <div class="ui-separator"></div>
      <span class="ui-label">强度</span>
      <input type="range" class="ui-slider" id="slider-intensity" min="0" max="2" step="0.1" value="1">
      <div class="ui-separator"></div>
      <span class="ui-label">数量</span>
      <input type="range" class="ui-slider" id="slider-centers" min="1" max="5" step="1" value="1">
      <span class="ui-label" id="label-centers">1</span>
      <div class="ui-separator"></div>
      <span class="ui-label">粗细</span>
      <input type="range" class="ui-slider" id="slider-ringwidth" min="0.002" max="0.05" step="0.001" value="0.01">
      <span class="ui-label" id="label-ringwidth">0.01</span>
      <div class="ui-separator"></div>
      <span class="ui-label">分散</span>
      <input type="range" class="ui-slider" id="slider-spread" min="0.4" max="1" step="0.05" value="0.7">
      <span class="ui-label" id="label-spread">0.7</span>
      <div class="ui-separator"></div>
      <span class="ui-label">视角</span>
      <input type="range" class="ui-slider" id="slider-camera" min="4" max="20" step="0.5" value="8">
      <span class="ui-label" id="label-camera">8</span>
      <div class="ui-separator"></div>
      <span class="ui-label">主题</span>
      <button class="ui-btn active" data-theme="neon-wave">🌈 霓虹</button>
      <button class="ui-btn" data-theme="fluid">🌊 流体</button>
    `;
  }

  private bindEvents(cb: UICallbacks): void {
    const btnPause = this.container.querySelector('#btn-pause') as HTMLButtonElement;
    const btnRotate = this.container.querySelector('#btn-rotate') as HTMLButtonElement;
    const slider = this.container.querySelector('#slider-intensity') as HTMLInputElement;
    const sliderCenters = this.container.querySelector('#slider-centers') as HTMLInputElement;
    const labelCenters = this.container.querySelector('#label-centers') as HTMLSpanElement;
    const sliderRingW = this.container.querySelector('#slider-ringwidth') as HTMLInputElement;
    const labelRingW = this.container.querySelector('#label-ringwidth') as HTMLSpanElement;
    const sliderSpread = this.container.querySelector('#slider-spread') as HTMLInputElement;
    const labelSpread = this.container.querySelector('#label-spread') as HTMLSpanElement;
    const sliderCamera = this.container.querySelector('#slider-camera') as HTMLInputElement;
    const labelCamera = this.container.querySelector('#label-camera') as HTMLSpanElement;
    const themeBtns = this.container.querySelectorAll('[data-theme]');

    btnPause.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      btnPause.textContent = this.isPaused ? '▶ 播放' : '⏸ 暂停';
      cb.onTogglePause();
    });

    btnRotate.addEventListener('click', () => {
      btnRotate.classList.toggle('active');
      cb.onToggleAutoRotate();
    });

    slider.addEventListener('input', () => {
      cb.onSetIntensity(parseFloat(slider.value));
    });

    sliderCenters.addEventListener('input', () => {
      const v = parseInt(sliderCenters.value);
      labelCenters.textContent = String(v);
      cb.onSetCenterCount(v);
    });

    sliderRingW.addEventListener('input', () => {
      const v = parseFloat(sliderRingW.value);
      labelRingW.textContent = v.toFixed(3);
      cb.onSetRingWidth(v);
    });

    sliderSpread.addEventListener('input', () => {
      const v = parseFloat(sliderSpread.value);
      labelSpread.textContent = v.toFixed(2);
      cb.onSetSpread(v);
    });

    sliderCamera.addEventListener('input', () => {
      const v = parseFloat(sliderCamera.value);
      labelCamera.textContent = String(v);
      cb.onSetCameraRadius(v);
    });

    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.theme as ThemeName;
        themeBtns.forEach((b) => (b as HTMLElement).classList.remove('active'));
        (btn as HTMLElement).classList.add('active');
        cb.onSetTheme(theme);
      });
    });

    document.addEventListener('mousemove', (e) => {
      if (e.clientY > window.innerHeight - 100) {
        if (!this.isVisible) {
          this.show();
        }
        this.scheduleHide();
      }
    });

    // 鼠标移到面板上时取消自动隐藏
    this.container.addEventListener('mouseenter', () => this.cancelHide());
    this.container.addEventListener('mouseleave', () => {
      if (this.isVisible) this.scheduleHide();
    });
  }

  private show(): void {
    this.isVisible = true;
    this.container.classList.add('visible');
  }

  private hide(): void {
    this.isVisible = false;
    this.container.classList.remove('visible');
  }

  private scheduleHide(): void {
    this.cancelHide();
    this.hideTimer = setTimeout(() => this.hide(), 2000);
  }

  private   cancelHide(): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  setLocked(locked: boolean): void {
    this.cancelHide();
    this.container.style.display = locked ? 'none' : '';
    this.container.classList.toggle('visible', !locked);
    this.isVisible = !locked;
  }

  dispose(): void {
    this.cancelHide();
    this.container.remove();
  }
}
