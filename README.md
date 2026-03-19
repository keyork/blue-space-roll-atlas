# 蓝色空间·时序薯盘

`Blue Space Potato Atlas`

一个面向“土豆流转 / 时序市场”场景的前端演示项目。它以星图式指挥界面呈现 24 小时时段的连续市场状态，用于展示价格脊线、收放梯队、我方土豆牌、存薯、成交与盯梢器策略。

项目名取自刘慈欣《三体》中的星舰 **蓝色空间**。这个名字适合本项目的视觉语境: 深空、观测、航迹、常驻侧轨，以及对多时段市场态势的持续监控。

## 适合展示什么

- 未来交易日的 24 小时时段连续观察
- 最新成交价、收一 / 放一价差、收放 1-3 价格定位
- 我方土豆牌在图谱和左侧精读轨中的独立标记
- 每小时持仓、可收 / 可放上限、已搓成、未搓成
- 自动盯梢器按小时配置价格边界、电量比例和最大电量

## 界面结构

- 左侧 `Focus Rail`
  常驻精读轨。显示当前聚焦时段的最新成交、我方土豆牌、价差、存薯、搓成 / 未成，以及 `收10 -> 收1 -> 放1 -> 放10` 的完整梯队。

- 中间 `Potato Atlas`
  主图谱。突出价格关系，只保留高价值信号:
  最新成交脊线、收一 / 放一价差走廊、收放 1-3 价格定位、我方土豆牌信标、方向流、存薯、搓成与未成。

- 右侧 `Trading Desk`
  操作台。用于手动挂单、撤单、查看事件流，以及逐小时配置盯梢器参数。

## 当前业务约束

- 每个时段最多只能有一笔我方土豆牌
- 若该时段此前已经搓成，则后续土豆牌方向必须与已搓成方向一致
- 我方土豆牌价格必须吸附到对应方向的薯盘价格
- 当前实现中，我方土豆牌只允许贴 `1` 或 `2` 档

## 技术栈

- React 18
- Vite 5
- 原生 SVG 可视化
- 纯前端 mock 数据驱动

## 本地启动

```bash
npm install
npm run dev
```

构建生产版本:

```bash
npm run build
```

本地预览构建结果:

```bash
npm run preview
```

## 部署到 GitHub Pages

这个项目已经补好了 GitHub Pages 所需配置:

- `vite.config.js` 会在 GitHub Actions 构建时自动推导仓库名并设置 `base`
- `.github/workflows/deploy-pages.yml` 会在推送到 `main` 后自动部署

操作步骤:

1. 在 GitHub 上新建仓库，比如 `blue-space-roll-atlas`
2. 把本地仓库推上去

```bash
git remote add origin git@github.com:<你的用户名>/blue-space-roll-atlas.git
git branch -M main
git push -u origin main
```

3. 打开仓库页面，进入 `Settings -> Pages`
4. `Source` 选择 `GitHub Actions`
5. 等待 `Actions` 里的 `Deploy GitHub Pages` 工作流跑完

发布地址通常是:

```text
https://<你的用户名>.github.io/<仓库名>/
```

如果你后面把默认分支改成别的名字，要同步修改 `.github/workflows/deploy-pages.yml` 里的分支配置。

## 目录概览

```text
src/
  components/
    HoverRail.jsx      左侧常驻精读轨
    TradingAtlas.jsx   中间主图谱
    TradingDesk.jsx    右侧操作台
    OrderBookPanel.jsx 下方梯队详情
    MetricsPanel.jsx   下方指标详情
  hooks/
    useFlash.js
  lib/
    market.js          mock 数据与业务规则
  App.jsx
  main.jsx
  styles.css
```

## 设计取向

- 避免传统“驾驶舱 UI”套皮
- 更像深空观测图，而不是一堆圆角控制卡片
- 中间主图重价不重量，细节量感放到侧轨和详情面板
- 用色块、明度和色温分区，而不是重边框分区

## 适合继续演进的方向

- 接入真实节假日日历与开放交易日逻辑
- 接入真实后端行情 / 挂撤单接口
- 增加回放模式与时段事件追踪
- 增加多日切换、多策略对比与风险提示层
