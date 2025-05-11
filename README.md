# **EdgeBlogCDN 智能访问网关** 

![EdgeBlogCDN](./image.png)

## 项目简介

EdgeBlogCDN是一个轻量级边缘计算和内容分发系统，基于Cloudflare Workers构建，支持多CDN线路智能测速和自动跳转功能。该项目旨在为博客和网站提供高可用性和低延迟的访问体验。


## 主要功能

- **多CDN智能测速**: 自动测试多个CDN节点的响应速度
- **自动线路优选**: 根据测速结果智能选择最快的CDN线路
- **响应式设计**: 完美适配各种设备尺寸，从手机到桌面
- **暗黑/明亮模式**: 支持自动跟随系统主题或手动切换
- **优雅过渡效果**: 在重定向前展示测速结果和访问信息
- **高度可配置**: 通过环境变量轻松自定义各项参数

## 部署方法

### 通过Cloudflare部署

1. 在Cloudflare Workers中创建一个新的Worker
2. 将`_worker.js`文件内容复制到Worker编辑器中
3. 保存并部署

### 配置说明

可以通过以下环境变量自定义网关行为：

| 环境变量 | 说明 | 默认值示例 |
|---------|------|-----------|
| URL | CDN链接列表，多个链接用逗号分隔 | 预设的6个CDN链接 |
| NAME | 站点名称 | Code9527 Blog |
| TITLE | 页面标题 | BlogCDN 智能访问网关 |
| PNG | 站点LOGO图片URL | https://img.115694.xyz/img_tx1.jpg |
| ICO | 站点图标URL | https://image.115694.xyz/img_erha.png |
| BEIAN | 备案信息HTML | `<a href='https://icp.gov.moe/'>萌ICP备-20070707号</a>` |
| ADS | 广告代码 | 空 |

## 测速策略

- 系统采用两阶段测速策略:

1. **初筛阶段**: 对所有CDN进行初步测试，筛选出响应最快的40%
2. **精测阶段**: 对筛选后的CDN进行多轮精确测速，最终选择最快线路

- 测速参数可以在代码的`CONFIG.SPEED_TEST`部分自定义。

## 注意事项

- 确保所有CDN链接指向相同的网站内容
- 建议至少配置3个以上的CDN线路以获得最佳效果
- 测速结果会受到用户网络环境的影响


## 技术栈

- Cloudflare Workers
- 现代JavaScript (ES6+)
- CSS3 (响应式设计)

---

## 致谢
- 项目参考:  [Blog-CDN-Gateway](https://github.com/cmliu/Blog-CDN-Gateway)
- 优化支持:  AI人工智能
