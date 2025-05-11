# **EdgeBlogCDN 智能访问网关** 

![EdgeBlogCDN](./image.png)

## 项目简介

EdgeBlogCDN是一个轻量级边缘计算和内容分发系统，基于Cloudflare Workers构建，支持多CDN线路的智能测速与自动跳转。项目旨在为博客和网站提供高可用、低延迟、智能分流的极致访问体验。

---

## 主要特性

- **多CDN智能测速**：自动对多条CDN线路进行前端测速，动态选择最快节点，极大提升访问速度和可用性。
- **自动跳转与手动选择**：测速后自动跳转至最快节点，用户也可手动选择任意线路。
- **极致前端体验**：响应式设计，适配PC与移动端，支持深色模式，界面美观现代。
- **零依赖、易部署**：仅需一个`_worker.js`，无第三方依赖，支持Cloudflare Workers一键部署。
- **环境变量灵活自定义**：支持通过环境变量自定义CDN列表、LOGO、背景、备案、广告等，无需改动代码。
- **测速策略可调**：测速轮数、超时、候选筛选等均可配置，兼顾速度与准确性。
- **高可用与安全**：自动降级、错误友好提示，支持自定义favicon、ads.txt等。

---

## 快速开始

### 1. 部署到Cloudflare Workers

1. 注册并登录 [Cloudflare](https://dash.cloudflare.com/)
2. 新建一个Worker服务，将`_worker.js`全部内容粘贴到Worker编辑器中，保存并部署即可。

### 2. 环境变量配置（可选）

可在Cloudflare Workers的环境变量（Vars）中自定义以下参数：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| URL    | CDN节点列表，逗号分隔，支持#注释 | https://a.com#主线,https://b.com#备用 |
| NAME   | 博客/站点名称 | MyBlog |
| TITLE  | 页面主标题 | BlogCDN 智能访问网关 |
| PNG    | LOGO主图URL | https://img.xxx.com/logo.png |
| ICO    | favicon图标URL | https://img.xxx.com/favicon.ico |
| IMG    | 背景图片URL，多个用逗号分隔 | https://img1.com/bg.jpg,https://img2.com/bg.png |
| BEIAN  | 备案信息HTML | <a href='https://icp.gov.moe/'>萌ICP备-xxxx</a> |
| ADS    | 广告内容 | 任意HTML |

如未设置，将使用内置默认值。

---

## 前端体验

- **测速流程**：页面加载后自动对所有CDN节点测速，分为初筛和精测两轮，最终自动跳转最快节点。
- **手动选择**：用户可随时点击任意线路，立即跳转并高亮显示。
- **测速可视化**：每个节点实时显示延迟，颜色分级（极快/较快/中等/较慢/非常慢/失败）。
- **移动端适配**：自适应布局，深色模式自动切换。
- **性能优化**：预加载、预连接、懒加载背景，极致体验。

---

## 目录结构

```
EdgeBlogCDN/
  |_ _worker.js         # Cloudflare Worker主程序
  |_ README.md          # 项目说明
```

---

## 常见问题

- **如何添加/修改CDN节点？**
  - 推荐通过Cloudflare Workers环境变量`URL`配置，支持注释和多节点。
- **支持哪些自定义？**
  - LOGO、背景、备案、广告、站点名、标题、favicon等均可通过环境变量自定义。
- **测速策略能否调整？**
  - 可通过源码调整测速轮数、超时、候选筛选等参数。
- **支持自定义ads.txt和favicon吗？**
  - 支持，分别通过`ADS`和`ICO`变量或默认值。

---


## 参考与鸣谢
- 项目参考:  [Blog-CDN-Gateway](https://github.com/cmliu/Blog-CDN-Gateway)
- 项目部署: [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- 优化支持:  AI人工智能
