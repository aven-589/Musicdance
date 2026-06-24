# MusicDance

Windows 全屏音乐可视化。监听电脑输出的音频，实时生成 3D 粒子动画。
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/2a8f08ee-9d2e-4b4c-92fc-60ae5e0c2c0d" />


## 快速使用

下载 `MusicDance.exe`，双击直接运行，无需任何安装。

### 操作

| 按键 | 功能 |
|---|---|
| 鼠标拖拽 | 旋转视角 |
| `B` | 沉浸模式（隐藏 UI，锁定视角） |
| `Ctrl` + `Shift` + `B` | 沉浸模式（全局快捷键） |
| `Esc` | 退出程序 |

### UI 控件

鼠标移到屏幕底部自动显示控制栏：

- **⏸ 暂停** — 暂停动画
- **🔄 旋转** — 自动旋转视角
- **强度** — 音频响应灵敏度
- **数量** — 音符中心数量（1-5）
- **粗细** — 波纹环宽度
- **分散** — 音符中心分散程度
- **视角** — 相机距离
- **主题** — 霓虹 / 流体

## 从源码构建

```bash
npm install
npm run pack
```

输出在 `release\MusicDance.exe`。

### 开发

```bash
npm run dev
```

## 技术栈

- **Electron** — 桌面壳
- **Three.js** — 3D 渲染
- **WASAPI** — 音频环回捕获
- **FFT** — 频谱分析

## 项目结构

```
src/
├── main/          # Electron 主进程
│   ├── main.ts
│   ├── audio-capture.ts   # WASAPI 音频捕获
│   ├── audio-analyzer.ts  # FFT 分析
│   └── wallpaper.ts       # 全局快捷键
├── renderer/      # 渲染进程
│   ├── main.ts
│   ├── ui.ts              # 控制面板
│   ├── theme.ts           # 主题管理
│   ├── global.ts
│   └── scene/
│       ├── glow-centers.ts     # 波纹环系统
│       ├── line-particles.ts   # 霓虹粒子
│       ├── note-particles.ts   # 音符粒子
│       └── textures.ts         # 纹理生成
├── preload/
│   └── preload.ts
└── shared/
    └── types.ts
audio-capture/   # WASAPI 环回捕获程序 (C#)
build/           # 图标资源
scripts/         # 构建脚本
```
##如果你也有想法，想通过自己的想象力去构建艺术，欢迎改进我的程序，或者基于我这个一般般的项目二次开发，有问题请联系：aven27112@gmail.com
