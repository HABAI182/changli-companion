# 离火长明 · Hyperframes 宣传片 v2

45 秒、60fps；1920×1080 和 1080×1920 分别排版。奶油白、珊瑚色、大字号中文和连续角色画面。源模型没有重新绘制，素材来自实际浏览器运行的 Live2D 桌宠与设置页。

## 编辑与导出

使用 Hyperframes 0.8.149。解压完整交付包中的工程后，素材、字体、GSAP 和音频均在 `assets/`，无需远程媒体服务。

```powershell
node build-film.cjs --activate=wide
npx hyperframes@0.8.149 preview --background
npx hyperframes@0.8.149 check
npx hyperframes@0.8.149 render --fps 60 --quality delivery --output wide.mp4
```

可切换布局：`wide`、`portrait`、`wide-master`、`portrait-master`、`cover-wide`、`cover-bilibili`。布局源在 `layouts/*.html.source`；`index.html` 是当前活动布局。修改 `build-film.cjs` 后重新生成会覆盖生成的 HTML；手工在 Studio 编辑时先保留自己的文件。

“母版”仅移除宣传标题、标签和片尾下载文字，保留真实软件画面中的文字和 UI。浏览器版录屏不作为 Windows 托盘、全局输入、穿透或原生拖动能力的证据。

## 素材与来源

- `hero.webm`：45 秒、2700 帧、1080×1080、透明 VP9，实际模型运行画面
- `settings.webm`：真实大小滑杆和主题操作，4 秒、60fps
- 其余角色图、菜单图和图标：当前项目运行资源或实际截图
- `bgm.wav`：本项目原创合成的 92 BPM 轻音乐，含轻键帽/鼠标声；生成脚本在 `tools/promo/make_music.py`
- `NotoSansSC-promo.ttf`：Noto Sans SC 的本片字符子集，OFL 许可随附
- `gsap.min.js`：GSAP 3.14.2，保留文件自带声明

参考视频仅用于观察角色主导的展示方式，不使用其角色、音乐、画面或标志。

完整资产随本地交付包保存，Git 只跟踪工程和记录，避免在代码仓库中重复存储大体积视频。旧宣传版本位于 `deliveries/media-20261012-v0712`，本版独立保存。
