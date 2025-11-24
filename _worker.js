/**
 * BlogCDN智能访问网关 
 * 版本: 1.1.4
 * 描述: 轻量级边缘计算和内容分发系统，支持多CDN线路智能测速和自动跳转
 * 优化: 代码精简与性能优化
 */

// 统一配置模块 - 扁平化结构提高可读性
const CONFIG = {
	// 系统核心配置
	VERSION: '1.1.4',          // 当前版本号
	LOG_LEVEL: 1,              // 日志级别（0=DEBUG，1=INFO，2=WARN，3=ERROR）
	TIMEOUT: 3000,             // 默认测速超时时间（毫秒）
	REDIRECT_DELAY: 1000,      // 自动跳转前的延迟（毫秒）
	
	// 测速策略配置
	ROUNDS: 2,                 // 测速轮数，分为初筛和精测
	PRELIM_TIMEOUT: 2000,      // 初筛阶段超时时间（毫秒）
	FINAL_TIMEOUT: 3000,       // 精测阶段超时时间（毫秒），与默认TIMEOUT保持一致
	CANDIDATE_PERCENT: 0.4,    // 初筛后保留的比例
	MIN_CANDIDATES: 2,         // 最少保留的候选数量
	MAX_CANDIDATES: 3,         // 最多保留的候选数量
	TESTS_PER_ROUND: 3,        // 每轮每个URL测试次数
	DELAY_BETWEEN_TESTS: 100,  // 每次测速之间的间隔（毫秒）
	RESOURCE_CHECK_INTERVAL: 50, // 资源检查间隔时间（毫秒）
	RESOURCE_CHECK_BUFFER: 100, // 资源检查缓冲时间（毫秒）
	
	// 资源加载配置
	BG_IMG_TIMEOUT: 5000,      // 背景图片加载超时时间（毫秒）
	BG_IMG_LOAD_DELAY: 500,    // 背景图片加载延迟时间（毫秒）
	IDLE_CALLBACK_TIMEOUT: 2000, // 空闲回调超时时间（毫秒）
	
	// 延迟显示颜色配置
	COLORS: {
		excellent: '#22c55e', // ≤100ms，极快
		good: '#84cc16',      // ≤200ms，较快
		average: '#eab308',   // ≤500ms，中等
		slow: '#f97316',      // ≤1000ms，较慢
		verySlow: '#ef4444',  // >1000ms，非常慢
		error: '#dc2626'      // 错误状态
	},
	
	// 默认博客CDN链接列表
	DEFAULT_URLS: [
		'https://blog.115694.xyz#Cloudflare CDN',
		'https://fastly.blog.115694.xyz#Fastly CDN',
		'https://gblog.115694.xyz#Gcore CDN',
		'https://oneblog.115694.xyz#Edge One',
		'https://rin-blog-f0y.pages.dev#备用地址1'
	],

	// 默认站点基础配置
	SITE: {
		ads: '',
		icoUrl: 'https://image.115694.xyz/img_erha.png',
		logoUrl: 'https://img.115694.xyz/img_tx1.jpg',
		beian: `<a href='https://icp.gov.moe/'>萌ICP备-20070707号</a>`,
		title: 'BlogCDN 智能访问网关',
		name: 'Code9527 Blog',
		bgImg: [
			'https://rpic.origz.com/api.php?category=pixiv',
			'https://api.mtyqx.cn/api/random.php',
			'https://bing.img.run/rand_1366x768.php'
		]
	}
};

/**
 * 日志模块 - 通用版本，同时适用于服务端和客户端
 */
const Logger = {
	// 预定义日志级别数组，避免重复创建
	levels: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
	
	// 统一日志处理方法
	log(message, level = 1) {
		if (level >= CONFIG.LOG_LEVEL && typeof console !== 'undefined') {
			const prefix = `[${this.levels[level]}]`;
			switch (level) {
				case 0: console.debug?.(prefix, message); break;
				case 1: console.info?.(prefix, message); break;
				case 2: console.warn?.(prefix, message); break;
				case 3: console.error?.(prefix, message); break;
				default: console.log?.(prefix, message);
			}
		}
	},
	
	// 简化各级别日志方法，使用箭头函数减少上下文绑定
	debug: message => Logger.log(message, 0),
	info: message => Logger.log(message, 1),
	warn: message => Logger.log(message, 2),
	error: message => Logger.log(message, 3)
};

/**
 * 配置处理模块 - 处理配置解析和验证
 */
const ConfigModule = {
	/**
	 * 解析环境变量和获取URL列表
	 * @param {Object} env - 环境变量对象
	 * @return {string[]} URL列表
	 */
	getUrlList: (env) => {
		let urls = [...CONFIG.DEFAULT_URLS];
		if (env.URL) {
			try {
				const normalizedStr = env.URL.replace(/[\t|"'\r\n]+/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '');
				const parsedUrls = normalizedStr ? normalizedStr.split(',') : [];
				const validUrls = parsedUrls.filter(url => {
					const actualUrl = url.split('#')[0].trim();
					if (!actualUrl) return false;
					try {
						const urlObj = new URL(actualUrl);
						return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
					} catch (e) {
						Logger.warn(`无效URL格式: ${actualUrl}`);
						return false;
					}
				});
				if (validUrls.length > 0) {
					urls = validUrls;
					Logger.info(`从环境变量加载了 ${urls.length} 个有效URL`);
				} else {
					Logger.warn('环境变量中没有有效URL，使用默认列表');
				}
			} catch (error) {
				Logger.error(`解析URL环境变量错误: ${error.message}`);
			}
		}
		if (urls.length === 0) {
			Logger.warn('没有配置URL，使用默认列表');
			urls = [...CONFIG.DEFAULT_URLS];
		}
		return urls;
	},
	
	/**
	 * 初始化站点配置
	 * @param {Object} env - 环境变量对象
	 * @return {Object} 处理后的配置
	 */
	initSiteConfig: (env) => {
		const config = { ...CONFIG.SITE };
		// 从环境变量覆盖配置
		Object.keys(CONFIG.SITE).forEach(key => {
			if (env[key]) config[key] = env[key];
		});
		
		// 处理背景图片
		if (env.bgImg) {
			try {
				const normalizedStr = env.bgImg.replace(/[\t|"'\r\n]+/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '');
				const images = normalizedStr ? normalizedStr.split(',') : [];
				if (images.length > 0) {
					config.bgImg = images[Math.floor(Math.random() * images.length)];
				}
			} catch (error) {
				Logger.error(`解析bgImg环境变量错误: ${error.message}`);
			}
		} else if (Array.isArray(config.bgImg) && config.bgImg.length > 0) {
			config.bgImg = config.bgImg[Math.floor(Math.random() * config.bgImg.length)];
		}
		
		// 确保背景图片是字符串格式
		if (typeof config.bgImg !== 'string') {
			config.bgImg = Array.isArray(config.bgImg) && config.bgImg.length > 0 ? 
				config.bgImg[0] : '';
		}
		
		// 确保必要字段存在
		const requiredFields = ['name', 'title', 'logoUrl', 'icoUrl'];
		const missingFields = requiredFields.filter(field => !config[field]);
		if (missingFields.length > 0) {
			Logger.warn(`配置缺少必要字段: ${missingFields.join(', ')}`);
			// 设置默认空白图片
			const emptyImg = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
			if (missingFields.includes('logoUrl')) config.logoUrl = emptyImg;
			if (missingFields.includes('icoUrl')) config.icoUrl = emptyImg;
		}
		
		return config;
	}
};

/**
 * UI模块 - 负责HTML生成和UI相关处理
 * 主要负责页面结构、样式和前端测速逻辑的注入
 */
const UIModule = {
	/**
	 * 生成HTML页面
	 * @param {Object} config - 配置对象
	 * @param {string[]} urls - URL列表
	 * @param {string} path - 当前路径
	 * @param {string} params - URL参数
	 * @return {string} HTML字符串
	 * 负责输出完整的响应页面，包含测速脚本和自适应样式
	 */
	generateHTML: ({ config, urls, path, params }) => {
		const { name, title, logoUrl, beian, bgImg, icoUrl } = config;
		
		// 提取需要预加载的域名 - 使用Set避免重复处理
		const extractDomains = (urlsList) => {
			const domains = new Set();
			
			// 收集资源域名
			const collectDomain = (url) => {
				if (!url) return;
				try {
					const domain = new URL(url).hostname;
					if (domain) domains.add(domain);
				} catch(e) {
					Logger.debug(`无效资源URL: ${url}`);
				}
			};
			
			// 处理资源URL
			[logoUrl, icoUrl, bgImg].filter(Boolean).forEach(collectDomain);
			
			// 处理CDN URL
			urlsList.forEach(urlString => {
				try {
					const parts = urlString.split('#');
					collectDomain(parts[0]);
				} catch(e) {
					Logger.debug(`无效CDN URL: ${urlString}`);
				}
			});
			
			return Array.from(domains);
		};
		
		// 生成预加载链接 - 使用模板字符串减少字符串连接操作
		const domains = extractDomains(urls);
		const preloadLinks = domains.map(domain => 
			`<link rel="dns-prefetch" href="https://${domain}">
			<link rel="preconnect" href="https://${domain}">`
		).join('\n\t\t\t');
		
		// 生成HTML内容
		return `
		<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>${name} - ${title}</title>
			
			<!-- 资源优化策略 -->
			<meta http-equiv="x-dns-prefetch-control" content="on">
			${preloadLinks}
			<link rel="preload" href="${logoUrl}" as="image" fetchpriority="high">
			
			<style>
				:root {
					--primary: #6bdf8f;
					--primary-dark: #5bc77d;
					--text-primary: #1a1f36;
					--text-secondary: #94a3b8;
					--bg-light: rgba(255, 255, 255, 0.6);
					--bg-light-hover: rgba(255, 255, 255, 0.8);
					--bg-dark: rgba(30, 41, 59, 0.7);
					--bg-dark-hover: rgba(30, 41, 59, 0.8);
					--shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
					--shadow-hover: 0 12px 36px rgba(0, 0, 0, 0.15);
					--border-light: 1px solid rgba(255, 255, 255, 0.18);
					--border-dark: 1px solid rgba(255, 255, 255, 0.08);
					--radius: 24px;
					--radius-sm: 12px;
					--transition: all 0.3s ease;
					--safe-inset-top: env(safe-area-inset-top, 0px);
					--safe-inset-bottom: env(safe-area-inset-bottom, 0px);
					--bg-render-mode: high-quality;
					--octo-arm-origin-x: 52%; 
					--octo-arm-origin-y: 42%;
				}
				
				/* 应用背景渲染模式 */
				@supports (background-image: -webkit-image-set(url("") 1x)) {
					.bg-loaded body {
						background-image: -webkit-image-set(var(--bg-image) 1x);
						image-rendering: var(--bg-render-mode);
					}
				}
				
				/* 基础样式 */
				html, body {
					width: 100%;
					height: 100%;
					overflow-x: hidden;
				}
				
				* {margin: 0; padding: 0; box-sizing: border-box;}
				
				body {
					font-family: -apple-system, system-ui, sans-serif;
					background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
					min-height: 100vh;
					display: flex;
					justify-content: center;
					align-items: center;
					padding: 15px;
					padding-top: calc(15px + var(--safe-inset-top));
					padding-bottom: calc(15px + var(--safe-inset-bottom));
					margin: 0;
					transition: background 0.8s ease;
				}
				
				/* 背景图片样式 */
				.bg-loaded body {
					background-image: var(--bg-image);
					background-size: cover;
					background-position: center center;
					background-repeat: no-repeat;
					background-attachment: fixed;
				}
				
				/* 深色主题 */
				@media (prefers-color-scheme: dark) {
					body {background: linear-gradient(120deg, #2a5298 0%, #1a2980 100%);}
					.container {background: var(--bg-dark); border: var(--border-dark);}
					h1, .description {color: rgba(255, 255, 255, 0.9);}
					ul li {background: var(--bg-dark-hover); color: rgba(255, 255, 255, 0.9);}
					ul li:hover {background: rgba(30, 41, 59, 0.8);}
					.testing {color: #cbd5e1;}
					.best-indicator.comprehensive {
						background: linear-gradient(90deg, #22c55e, #4ade80);
						color: white;
						background-size: 200% 100%;
						animation: highlight-pulse 2s ease infinite;
						border: none;
						font-weight: bold;
						padding: 3px 8px;
						margin-left: 10px;
						border-radius: 4px;
						box-shadow: 0 2px 5px rgba(34, 197, 94, 0.4);
						text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
					}
					.comprehensive-best {
						border-left: 3px solid #4ade80 !important;
						background: linear-gradient(to right, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.15)) !important;
					}
				}
				
				/* 主容器 */
				.container {
					background: var(--bg-light);
					backdrop-filter: blur(10px);
					-webkit-backdrop-filter: blur(10px);
					border-radius: var(--radius);
					padding: 30px;
					width: 480px;
					min-height: 620px;
					max-width: 100%;
					box-shadow: var(--shadow);
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					transition: var(--transition);
					border: var(--border-light);
					margin: 0 auto;
					will-change: transform, box-shadow;
				}

				.container:hover {transform: translateY(-5px); box-shadow: var(--shadow-hover);}
		
				/* Logo样式 */
				.logo-container {position: relative; width: 180px; height: 180px; margin-bottom: 20px;}
				.logo {
					width: 100%;
					height: 100%;
					border-radius: 50%;
					border: 8px solid white;
					box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
					animation: pulse 2s infinite;
					object-fit: cover;
					will-change: box-shadow;
				}
				
				/* 动画定义 */
				@keyframes pulse {
					0% {box-shadow: 0 0 0 0 rgba(107, 223, 143, 0.4);}
					70% {box-shadow: 0 0 0 20px rgba(107, 223, 143, 0);}
					100% {box-shadow: 0 0 0 0 rgba(107, 223, 143, 0);}
				}
				@keyframes blink {0%, 100% {opacity: 1;} 50% {opacity: 0.6;}}
				@keyframes octocat-wave {
					0%, 100% {transform: rotate(0)}
					20%, 60% {transform: rotate(-25deg)}
					40%, 80% {transform: rotate(10deg)}
				}
				@keyframes highlight-pulse {
					0%, 100% {background-position: 0% 50%;}
					50% {background-position: 100% 50%;}
				}
				@keyframes pulse-best {
					0% {box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);}
					70% {box-shadow: 0 0 0 6px rgba(74, 222, 128, 0);}
					100% {box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);}
				}

				/* 标题和内容样式 */
				h1 {
					color: var(--text-primary);
					font-size: 28px;
					font-weight: 700;
					text-align: center;
					margin: 0 0 30px 0;
					padding-bottom: 15px;
					position: relative;
				}
				h1::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 50%;
					transform: translateX(-50%);
					width: 60px;
					height: 4px;
					background: var(--primary);
					border-radius: 2px;
				}
				.description {width: 100%; padding: 0 15px; margin-bottom: 15px; font-weight: 600;}
				ul {list-style: none; width: 100%;}
				ul li {
					color: var(--text-primary);
					font-size: 16px;
					line-height: 1.6;
					padding: 12px 15px;
					margin-bottom: 10px;
					background: var(--bg-light-hover);
					border-radius: var(--radius-sm);
					display: flex;
					justify-content: space-between;
					align-items: center;
					transition: var(--transition);
					cursor: pointer;
					will-change: transform, background-color;
				}
				ul li:hover {background: var(--bg-light-hover); transform: translateX(5px);}

				/* 备案信息 */
				.beian-info {text-align: center; font-size: 13px; margin-top: 20px;}
				.beian-info a {
					color: var(--primary);
					text-decoration: none;
					border-bottom: 1px dashed var(--primary);
					padding-bottom: 2px;
				}
				.beian-info a:hover {border-bottom-style: solid;}
				
				/* GitHub角标 */
				.github-corner {position: fixed; top: 0; right: 0; z-index: 1000;}
				.github-corner svg {
					position: absolute;
					top: 0;
					right: 0;
					border: 0;
					fill: var(--primary);
					color: #fff;
					width: 80px;
					height: 80px;
					transition: fill 0.3s ease;
					will-change: fill;
				}
				.github-corner:hover svg {fill: var(--primary-dark);}
				.github-corner .octo-arm {transform-origin: var(--octo-arm-origin-x) var(--octo-arm-origin-y);}
				.github-corner:hover .octo-arm {animation: octocat-wave 560ms ease-in-out;}
				
				/* 测速相关样式 */
				.testing {
					color: var(--text-secondary);
					animation: blink 1.2s infinite;
					will-change: opacity;
				}
				.fastest-result, .best-quality {
					background: rgba(107, 223, 143, 0.3) !important;
					border: 2px solid rgba(107, 223, 143, 0.5) !important;
					transform: translateX(5px) !important;
				}
				.best-quality {
					position: relative;
					box-shadow: 0 0 8px rgba(107, 223, 143, 0.4) !important;
				}
				.best-quality::after {
					content: '';
					position: absolute;
					left: -10px;
					top: 50%;
					transform: translateY(-50%);
					width: 4px;
					height: 70%;
					background: var(--primary);
					border-radius: 2px;
				}
				.best-indicator {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					margin-left: 8px;
					font-size: 12px;
					color: #4ade80;
					font-weight: bold;
					background-color: rgba(74, 222, 128, 0.15);
					padding: 2px 6px;
					border-radius: 4px;
					animation: pulse-best 2s infinite;
					white-space: nowrap;
				}
				.comprehensive-best {
					background: linear-gradient(to right, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.15)) !important;
					box-shadow: 0 0 12px rgba(74, 222, 128, 0.5) !important;
					border-left: 3px solid #4ade80 !important;
				}
				.best-indicator.comprehensive {
					background: linear-gradient(90deg, #22c55e, #4ade80);
					color: white;
					background-size: 200% 100%;
					animation: highlight-pulse 2s ease infinite;
					border: none;
					font-weight: bold;
					padding: 3px 8px;
					margin-left: 10px;
					border-radius: 4px;
					box-shadow: 0 2px 5px rgba(34, 197, 94, 0.4);
					text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
				}
				.manual-selection-notice {
					text-align: center;
					color: var(--primary);
					background-color: rgba(107, 223, 143, 0.15);
					border-radius: 8px;
					padding: 8px;
					margin: 10px 0;
					font-weight: 600;
				}
				
				/* 响应式样式 */
				@media (max-width: 500px) {
					:root {--radius: 20px; --radius-sm: 10px;}
					.container {
						width: 100%;
						min-height: auto;
						padding: 20px;
						max-height: 90vh;
						overflow-y: auto;
						margin: 10px auto;
						-webkit-overflow-scrolling: touch;
					}
					.logo-container {width: 140px; height: 140px;}
					h1 {font-size: 24px; margin-bottom: 20px;}
					
					ul li {padding: 10px 12px;}
					.best-indicator {font-size: 11px; padding: 2px 4px;}
					.best-indicator.comprehensive {font-size: 10px; padding: 2px 5px; margin-left: 5px;}
					.github-corner svg {width: 60px; height: 60px;}
					.github-corner:hover .octo-arm {animation: none;}
					.github-corner .octo-arm {animation: octocat-wave 560ms ease-in-out;}
					.bg-loaded body {background-attachment: scroll;}
				}
				
				/* 小型移动设备适配 */
				@media (max-width: 375px) {
					body {padding: 10px;}
					.container {padding: 15px; border-radius: 20px;}
					.logo-container {width: 120px; height: 120px;}
					h1 {font-size: 22px; margin-bottom: 15px;}
					ul li {padding: 8px 10px; margin-bottom: 8px; font-size: 14px;}
					.description {margin-bottom: 10px;}
				}
				
				/* 刘海屏适配 */
				@supports (padding-top: env(safe-area-inset-top)) {
					body {
						padding-top: max(15px, env(safe-area-inset-top));
						padding-bottom: max(15px, env(safe-area-inset-bottom));
					}
				}
			</style>
		</head>
		<body>
			<a href="https://github.com/Coolapk-Code9527/EdgeBlogCDN" target="_blank" class="github-corner" aria-label="View source on Github">
				<svg viewBox="0 0 250 250" aria-hidden="true">
					<path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
					<path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" class="octo-arm"></path>
					<path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
				</svg>
			</a>
			
			<div class="container">
				<div class="logo-container">
					<img class="logo" src="${logoUrl}" alt="${name} Logo" loading="lazy">
				</div>
				<h1>${title}</h1>
				<ul class="description" id="urls"></ul>
				<div class="beian-info">${beian}</div>
			</div>
			
			<script>
			// 定义博客URL列表
			const urls = ${JSON.stringify(urls)};
			
			// 测速配置
			const CONFIG = {
				TIMEOUT: ${CONFIG.TIMEOUT},
				REDIRECT_DELAY: ${CONFIG.REDIRECT_DELAY},
				SPEED_TEST: {
					ROUNDS: ${CONFIG.ROUNDS},
					PRELIMINARY_TIMEOUT: ${CONFIG.PRELIM_TIMEOUT},
					FINAL_TIMEOUT: ${CONFIG.FINAL_TIMEOUT},
					TOP_PERCENTAGE: ${CONFIG.CANDIDATE_PERCENT},
					MIN_CANDIDATES: ${CONFIG.MIN_CANDIDATES},
					MAX_CANDIDATES: ${CONFIG.MAX_CANDIDATES},
					TESTS_PER_ROUND: ${CONFIG.TESTS_PER_ROUND},
					DELAY_BETWEEN_TESTS: ${CONFIG.DELAY_BETWEEN_TESTS}
				},
				COLORS: {
					excellent: '${CONFIG.COLORS.excellent}',
					good: '${CONFIG.COLORS.good}',
					average: '${CONFIG.COLORS.average}',
					slow: '${CONFIG.COLORS.slow}',
					verySlow: '${CONFIG.COLORS.verySlow}',
					error: '${CONFIG.COLORS.error}'
				},
				LOG_LEVEL: ${CONFIG.LOG_LEVEL}
			};
			
			// 简化日志模块
			const Logger = {
				debug: function(message) { 
					if (CONFIG.LOG_LEVEL <= 0 && console.debug) console.debug('[DEBUG]', message);
				},
				info: function(message) { 
					if (CONFIG.LOG_LEVEL <= 1 && console.info) console.info('[INFO]', message);
				},
				warn: function(message) { 
					if (CONFIG.LOG_LEVEL <= 2 && console.warn) console.warn('[WARN]', message);
				},
				error: function(message) { 
					if (CONFIG.LOG_LEVEL <= 3 && console.error) console.error('[ERROR]', message);
				}
			};
			
			// 背景图片处理 - 优化延迟加载，避免硬编码
			(function() {
				const bgImage = '${bgImg}';
				if (!bgImage || !bgImage.trim()) return;
				
				// 默认使用CSS渐变背景
				document.documentElement.style.setProperty('--bg-image', 'none');
				
				// 简化的背景图片加载
				const loadBackgroundImage = () => {
					// 创建图片对象进行预加载
					const img = new Image();
					
					// 设置低优先级
					if ('fetchPriority' in img) {
						img.fetchPriority = 'low';
					}
					
					// 设置加载超时
					let timeoutTimer = setTimeout(() => {
						img.src = ''; // 中止当前加载
						Logger.warn('背景图片加载超时: ' + bgImage);
					}, ${CONFIG.BG_IMG_TIMEOUT}); // 使用配置的超时时间
					
					// 图片加载完成后应用到背景
					img.onload = () => {
						clearTimeout(timeoutTimer);
						document.documentElement.style.setProperty('--bg-image', 'url("' + bgImage + '")');
						document.documentElement.classList.add('bg-loaded');
					};
					
					// 加载错误时不修改背景，保留默认渐变
					img.onerror = () => {
						clearTimeout(timeoutTimer);
						Logger.warn('背景图片加载失败: ' + bgImage);
					};
					
					// 开始加载图片
					img.src = bgImage;
				};
				
				// 使用requestIdleCallback延迟加载背景（如果支持）
				if ('requestIdleCallback' in window) {
					requestIdleCallback(() => {
						loadBackgroundImage();
					}, { timeout: ${CONFIG.IDLE_CALLBACK_TIMEOUT} });
				} else {
					// 兼容性处理，使用setTimeout
					setTimeout(loadBackgroundImage, ${CONFIG.BG_IMG_LOAD_DELAY});
				}
			})();
			
			// DOM操作优化模块
			const DOM = {
				// 简化缓存实现
				cache: {},
				
				// 获取元素并缓存
				get: function(id) {
					if (!this.cache[id]) {
						this.cache[id] = document.getElementById(id);
					}
					return this.cache[id];
				},
				
				// 获取延迟显示元素
				getLatencySpan: function(index) {
					return this.get('latency' + index);
				},
				
				// 获取结果列表项
				getResultLi: function(index) {
					return this.get('result' + index);
				},
				
				// 选择器查询
				query: function(selector) {
					const cacheKey = 'q:' + selector;
					if (!this.cache[cacheKey]) {
						this.cache[cacheKey] = document.querySelector(selector);
					}
					return this.cache[cacheKey];
				},
				
				// 更新DOM元素
				update: function(element, props) {
					if (!element) return;
					
					requestAnimationFrame(() => {
						for (const [key, value] of Object.entries(props)) {
							if (key === 'style' && typeof value === 'object') {
								Object.assign(element.style, value);
							} else if (key === 'classList' && Array.isArray(value)) {
								value.forEach(cls => {
									if (cls.startsWith('-')) {
										element.classList.remove(cls.substring(1));
									} else {
										element.classList.add(cls);
									}
								});
							} else {
								element[key] = value;
							}
						}
					});
				},
				
				// 清除缓存
				clearCache: function() {
					this.cache = {};
				},
				
				// 智能缓存管理 - 添加自动缓存清理，防止内存泄漏
				initCacheManager: function() {
					// 如果缓存项过多，自动清理
					if (Object.keys(this.cache).length > 50) {
						this.clearCache();
					}
				}
			};
			
			// 工具函数模块
			const Utils = {
				// 获取延迟颜色
				getLatencyColor: function(latency) {
					if (latency <= 100) return CONFIG.COLORS.excellent;
					if (latency <= 200) return CONFIG.COLORS.good;
					if (latency <= 500) return CONFIG.COLORS.average;
					if (latency <= 1000) return CONFIG.COLORS.slow;
					return CONFIG.COLORS.verySlow;
				},
				
				// 解析URL
				parseUrl: function(urlString) {
					const parts = urlString.split('#');
					return { 
						url: parts[0], 
						name: parts.length > 1 ? parts[1] : '未命名站点'
					};
				},
				
				// 等待指定时间
				sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
				
				// 更新延迟显示 - 使用批量更新
				updateLatencyDisplay: function(index, latency) {
					const latencySpan = DOM.getLatencySpan(index);
					if (!latencySpan) return;
					
					// 使用新的DOM更新方法
					DOM.update(latencySpan, {
						classList: ['-testing'],
						textContent: typeof latency === 'number' ? latency + 'ms' : latency,
						style: {
							color: typeof latency === 'number' 
								? this.getLatencyColor(latency) 
								: CONFIG.COLORS.error
						}
					});
				},
				
				// 计算中位数 - 提取为公共函数
				calculateMedian: function(values) {
					if (!values || values.length === 0) return null;
					
					// 复制数组并排序
					const sorted = [...values].sort((a, b) => a - b);
					const medianIndex = Math.floor(sorted.length / 2);
					
					// 计算中位数
					return sorted.length % 2 === 0
						? Math.round((sorted[medianIndex - 1] + sorted[medianIndex]) / 2)
						: sorted[medianIndex];
				},
				
				// 过滤异常值 - 提取为公共函数
				filterOutliers: function(values, allowedDeviationPercent = 50) {
					if (!values || values.length <= 2) return values;
					
					// 计算平均值
					const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
					
					// 过滤掉偏离平均值太远的值
					return values.filter(val => 
						Math.abs(val - avg) <= (avg * allowedDeviationPercent / 100)
					);
				},
				
				// UI相关函数
				ui: {
					// 显示手动选择提示
					showManualSelectionNotice: function(name) {
						if (document.getElementById('manual-selection-notice')) {
							// 更新现有提示
							const notice = document.getElementById('manual-selection-notice');
							notice.textContent = '手动选择: ' + name;
							return notice;
						}
						
						const notice = document.createElement('div');
						notice.id = 'manual-selection-notice';
						notice.className = 'manual-selection-notice';
						notice.textContent = '手动选择: ' + name;
						
						const container = DOM.query('.container');
						const beianInfo = DOM.query('.beian-info');
						if (container && beianInfo) {
							container.insertBefore(notice, beianInfo);
						}
						
						return notice;
					},
					
					// 高亮最佳的结果
					highlightFastest: function(name) {
						// 先清除所有高亮
						urls.forEach((_, index) => {
							const li = DOM.getResultLi(index);
							if (li) {
								li.classList.remove('fastest-result', 'best-quality', 'comprehensive-best');
								// 移除指示器
								const existing = li.querySelector('.best-indicator');
								if (existing) existing.remove();
							}
						});

						// 如果已经有手动选择，不执行自动高亮
						if (this.hasManualSelection()) return;
						
						urls.forEach((url, index) => {
							const parsedUrl = Utils.parseUrl(url);
							if (parsedUrl.name === name) {
								const li = DOM.getResultLi(index);
								if (li) {
									li.classList.add('fastest-result', 'best-quality', 'comprehensive-best');
									
									// 添加可视化指示
									const indicator = document.createElement('span');
									indicator.className = 'best-indicator comprehensive';
									indicator.innerHTML = '★ 推荐线路';
									
									// 避免重复添加
									if (!li.querySelector('.best-indicator')) {
										// 插入到节点名称之后
										const textContent = li.childNodes[0];
										if (textContent && textContent.nodeType === Node.TEXT_NODE) {
											const span = document.createElement('span');
											span.textContent = textContent.textContent;
											li.replaceChild(span, textContent);
											span.parentNode.insertBefore(indicator, span.nextSibling);
										} else {
											li.appendChild(indicator);
										}
									}
								}
							}
						});
					},
					
					// 检查是否已经有手动选择
					hasManualSelection: () => !!document.getElementById('manual-selection-notice')
				},
				
				// 并发池工具
				concurrentPool: function(tasks, limit) {
					// 计算最佳并发数
					const cpuConcurrency = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? 
						navigator.hardwareConcurrency : 4;
						
					const concurrency = Math.min(
						Math.min(6, Math.max(2, cpuConcurrency)), // 最大6，最小2
						tasks.length
					);
					
					return new Promise(resolve => {
						const results = Array(tasks.length);
						let completed = 0;
						let index = 0;
						
						function next() {
							if (index >= tasks.length) return;
							const currentIndex = index++;
							tasks[currentIndex]().then(result => {
								results[currentIndex] = result;
								completed++;
								if (completed === tasks.length) {
									resolve(results);
								} else {
									next();
								}
							});
						}
						
						// 启动初始任务
						for (let i = 0; i < concurrency; i++) {
							next();
						}
					});
				},
				
				// URL预加载优化
				preloadUrls: function(urlResults, fastestUrl) {
					// 防止无效参数或不支持的环境
					if (!window || !document) return;
					
					// 使用requestIdleCallback在浏览器空闲时处理
					const requestIdleCallback = window.requestIdleCallback || 
						function(callback) {
							return setTimeout(() => callback({
								didTimeout: false,
								timeRemaining: () => 50
							}), 1);
						};
					
					// 优先级预加载队列
					requestIdleCallback(function() {
						// 简化: 只处理最快和次快的URL
						if (!fastestUrl) return;
						
						const origins = new Set();
						const urlsToLoad = [];
						
						// 添加最快URL
						try {
							const urlObj = new URL(fastestUrl);
							origins.add(urlObj.origin);
							urlsToLoad.push({url: fastestUrl, priority: 'high'});
						} catch(e) {
							// 忽略无效URL
						}
						
						// 添加次快URL（如果存在）
						if (Array.isArray(urlResults)) {
							const secondFastest = urlResults.find(r => 
								typeof r.latency === 'number' && r.url !== fastestUrl
							)?.url;
							
							if (secondFastest) {
								try {
									const secondObj = new URL(secondFastest);
									origins.add(secondObj.origin);
									urlsToLoad.push({url: secondFastest, priority: 'low'});
								} catch(e) {
									// 忽略无效URL
								}
							}
						}
						
						// 构建DOM
						const fragment = document.createDocumentFragment();
						
						// 添加预连接
						origins.forEach(origin => {
							// DNS预取
							const dnsLink = document.createElement('link');
							dnsLink.rel = 'dns-prefetch';
							dnsLink.href = origin;
							fragment.appendChild(dnsLink);
							
							// 预连接
							const connLink = document.createElement('link');
							connLink.rel = 'preconnect';
							connLink.href = origin;
							connLink.crossOrigin = 'anonymous';
							fragment.appendChild(connLink);
						});
						
						// 添加预加载
						urlsToLoad.forEach(({url, priority}) => {
							const link = document.createElement('link');
							link.rel = 'prefetch';
							link.href = url;
							if (priority === 'high') {
								link.setAttribute('fetchpriority', 'high');
							}
							fragment.appendChild(link);
						});
						
						// 一次性添加到文档
						const head = document.head;
						if (head && fragment.childNodes.length > 0) {
							head.appendChild(fragment);
						}
					}, {timeout: CONFIG.IDLE_CALLBACK_TIMEOUT}); // 使用配置的超时时间，给慢速设备足够的处理时间
				}
			};
			
			// 测速模块
			const SpeedTest = {
				// 测试单个URL的延迟和加载速度 - 简化和优化方法
				testLatency: function(url, timeout) {
					if (!url) return Promise.resolve({ url, latency: '无效URL' });
					
					timeout = timeout || CONFIG.TIMEOUT;
					
					// 性能计时函数
					const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') 
						? () => performance.now() 
						: () => Date.now();
					
					// 添加防缓存参数到URL
					const getNoCacheUrl = function(baseUrl) {
						const cacheBuster = '_t=' + Date.now() + '_' + Math.random();
						return baseUrl + (baseUrl.includes('?') ? '&' : '?') + cacheBuster;
					};
					
					// 使用Promise.race组合多种测速方法
					return new Promise(function(resolve) {
						let finished = false;
						let timers = {
							resourceCheck: null,
							fetchTimeout: null,
							finalTimeout: null
						};
						
						// 统一清理所有计时器
						const cleanup = function() {
							Object.keys(timers).forEach(key => {
								if (timers[key]) {
									if (key === 'resourceCheck') {
										clearInterval(timers[key]);
									} else {
										clearTimeout(timers[key]);
									}
									timers[key] = null;
								}
							});
						};
						
						const noCacheUrl = getNoCacheUrl(url);
						const start = now();
							
						// 通用结果处理函数
						const handleResult = function(status, latency, loadTime = null) {
							if (finished) return;
							finished = true;
							cleanup(); // 确保清理所有计时器
							
							resolve({
								url, 
								latency: typeof latency === 'number' ? Math.round(latency) : '测速失败',
								loadTime: loadTime ? Math.round(loadTime) : null, // 添加内容加载时间
								status
							});
						};
						
						// 自适应超时设置
						let currentTimeout = timeout;
						if (typeof navigator !== 'undefined' && navigator.connection) {
							const conn = navigator.connection;
							if (conn.type === 'cellular' || conn.effectiveType === '2g' || conn.effectiveType === '3g') {
								currentTimeout = Math.min(timeout * 1.2, CONFIG.TIMEOUT);
							}
						}
						
						// 设置最终超时保障
						timers.finalTimeout = setTimeout(() => handleResult('timeout', currentTimeout), currentTimeout);
						
						// 1. Resource Timing API
						if (window.performance && performance.getEntriesByType) {
							// 尝试清除之前的条目
							if (typeof performance.clearResourceTimings === 'function') {
								try { performance.clearResourceTimings(); } catch (e) {}
							}
							
							// 定期检查资源加载情况
							timers.resourceCheck = setInterval(() => {
								if (finished) return cleanup();
								
								try {
									const baseUrl = url.split('#')[0];
									const entries = performance.getEntriesByType('resource')
										.filter(e => e.name && e.name.includes(baseUrl));
									
									if (entries.length > 0) {
										const entry = entries[entries.length - 1];
										
										// 优先使用更精确的指标
										let latency = null;
										let loadTime = null;
										
										if (entry.responseStart > 0) {
											latency = entry.responseStart - entry.fetchStart;
											loadTime = entry.responseEnd - entry.fetchStart;
										} else if (entry.responseEnd > 0) {
											latency = entry.responseEnd - entry.fetchStart;
											loadTime = entry.duration;
										} else {
											latency = entry.duration;
											loadTime = entry.duration;
										}
										
										handleResult('resource_timing', latency, loadTime);
									}
								} catch (e) {
									// 如果Resource Timing API出错，停止检查
									clearInterval(timers.resourceCheck);
									timers.resourceCheck = null;
								}
							}, CONFIG.RESOURCE_CHECK_INTERVAL);
						}
						
						// 2. Fetch API测速
						if (typeof fetch === 'function' && typeof AbortController === 'function') {
							const controller = new AbortController();
							
							timers.fetchTimeout = setTimeout(() => {
								controller.abort();
								timers.fetchTimeout = null;
							}, currentTimeout);
							
							// 简化的fetch请求
							fetch(noCacheUrl, { 
								method: 'GET', 
								signal: controller.signal, 
								cache: 'no-store',
								redirect: 'follow',
								credentials: 'omit'
							})
							.then(response => {
								const headerTime = now() - start;
								
								// 读取完整响应
								return response.text().then(text => {
									if (finished) return;
									
									const fullTime = now() - start;
									if (timers.fetchTimeout) {
										clearTimeout(timers.fetchTimeout);
										timers.fetchTimeout = null;
									}
									
									if (response.ok) {
										handleResult('fetch', headerTime, fullTime);
									}
								});
							})
							.catch(() => {/* 错误由其他方法或超时处理 */});
						}
						
						// 3. 图片加载测速 (最兼容的方法)
						const img = new Image();
						const imgStart = now();
						
						img.onload = () => handleResult('img', now() - imgStart, now() - imgStart);
						img.onerror = () => handleResult('img_error', now() - imgStart, now() - imgStart);
						img.src = noCacheUrl;
					});
				},
				
				// 多次测试取加权平均值或中位数
				multiTest: function(url, times, timeout, name) {
					// 默认参数处理
					
					times = times || CONFIG.TESTS_PER_ROUND;
					timeout = timeout || CONFIG.FINAL_TIMEOUT;
					const self = this;
					
					return new Promise(function(resolve) {
						// 存储所有有效测试结果的数组
						const results = [];
						const loadTimes = []; // 存储内容加载时间
						
						// 创建多个测试任务
						const tasks = Array(times).fill().map(() => {
							return function() {
								return self.testLatency(url, timeout)
									.then(function(result) {
										if (typeof result.latency === 'number') {
											results.push(result.latency);
											
											// 记录加载时间
											if (typeof result.loadTime === 'number') {
												loadTimes.push(result.loadTime);
											}
										}
										// 添加测试间隔
										return new Promise(r => setTimeout(r, CONFIG.DELAY_BETWEEN_TESTS));
									});
							};
						});
						
						// 并行执行多次测试，有限的并发
						Utils.concurrentPool(tasks, Math.min(3, times))
							.then(function() {
								// 测试完成后处理结果
								if (results.length === 0) {
									resolve({ 
										url, 
										name, 
										latency: '所有测试均失败', 
										status: 'failed' 
									});
									return;
								}
								
								// 使用公共函数过滤异常值
								const validResults = Utils.filterOutliers(results);
								const validLoadTimes = loadTimes.length > 0 ? Utils.filterOutliers(loadTimes) : [];
								
								// 使用公共函数计算中位数
								const medianLatency = Utils.calculateMedian(validResults);
								const medianLoadTime = validLoadTimes.length > 0 ? 
									Utils.calculateMedian(validLoadTimes) : null;
								
								resolve({ 
									url, 
									name, 
									latency: medianLatency,
									loadTime: medianLoadTime,
									status: 'success',
									stats: {
										median: medianLatency,
										samples: validResults.length,
										raw: validResults,
										loadTimeRaw: validLoadTimes,
										medianLoadTime: medianLoadTime
									}
								});
							});
					});
				},
				
				// 初筛阶段测试
				preliminaryTest: function() {
					const self = this;
					// 预处理：按域名分组测试
					const domainGroups = {};
					const domainResults = new Map();

					// 按域名对URL进行分组
					urls.forEach((urlString, idx) => {
						try {
							const parsedUrl = Utils.parseUrl(urlString);
							const domain = new URL(parsedUrl.url).hostname;
							if (!domainGroups[domain]) {
								domainGroups[domain] = [];
							}
							domainGroups[domain].push({
								url: parsedUrl.url, 
								name: parsedUrl.name, 
								originalUrl: urlString, 
								idx
							});
						} catch (e) {
							Logger.warn('URL解析错误: ' + urlString);
						}
					});
					
					// 每个域名只测一个URL（节省资源）
					const tasks = Object.entries(domainGroups).map(([domain, items]) => {
						return function() {
							// 选择该域名下的第一个URL测试
							const item = items[0];
							return self.testLatency(
								item.url, 
								CONFIG.SPEED_TEST.PRELIM_TIMEOUT
							).then(function(result) {
								// 更新所有同域名URL的延迟显示
								items.forEach(sameHostItem => {
									// 显示初步测试结果
									Utils.updateLatencyDisplay(sameHostItem.idx, result.latency);
									// 存储结果
									domainResults.set(sameHostItem.idx, {
									...result,
										name: sameHostItem.name,
										originalUrl: sameHostItem.originalUrl,
										idx: sameHostItem.idx
									});
								});
								return result;
							});
						};
					});
					
					// 并发测试，限制最大并发数为5
					return Utils.concurrentPool(tasks, Math.min(5, tasks.length))
						.then(function() { 
							return Array.from(domainResults.values()); 
						});
				},
				
				// 计算候选URL
				getCandidates: function(results) {
					// 过滤有效结果并按延迟排序
					const validResults = results
						.filter(result => typeof result.latency === 'number')
						.sort((a, b) => a.latency - b.latency);
					
					if (validResults.length === 0) {
						throw new Error('未找到可用节点');
					}
					
					// 计算最小延迟阈值
					const minLatency = validResults[0].latency;
					
					// 智能阈值：如果最快节点已经很快（<100ms），使用更严格的标准
					// 如果最快节点较慢（>300ms），放宽标准以确保有足够候选
					const threshold = minLatency < 100 
						? minLatency * 1.3  // 快速节点用更严格标准
						: minLatency < 300 
							? minLatency * 1.5  // 中等节点用标准倍数
							: minLatency * 2.0;  // 慢速节点放宽标准
					
					// 选择延迟在阈值内的节点
					const candidates = validResults.filter(r => r.latency <= threshold);
					
					// 保证最少MIN_CANDIDATES个候选
					if (candidates.length < CONFIG.SPEED_TEST.MIN_CANDIDATES) {
						return validResults.slice(0, CONFIG.SPEED_TEST.MIN_CANDIDATES);
					}
					
					// 限制最多MAX_CANDIDATES个候选
					return candidates.slice(0, CONFIG.SPEED_TEST.MAX_CANDIDATES);
				},
				
				// 精测阶段
				detailedTest: function(candidates) {
					const self = this;
					
					// 并行测试所有候选项
					const testPromises = candidates.map(function(candidate) {
						return self.multiTest(
							candidate.url, 
							CONFIG.SPEED_TEST.TESTS_PER_ROUND, 
							CONFIG.SPEED_TEST.FINAL_TIMEOUT,
							candidate.name
						).then(function(result) {
							// 更新UI显示
							if (typeof result.latency === 'number' && candidate.idx !== undefined) {
								Utils.updateLatencyDisplay(candidate.idx, result.latency);
							}
							
							return {
								...result,
								originalUrl: candidate.originalUrl,
								idx: candidate.idx
							};
						});
					});
					
					return Promise.all(testPromises);
				},
				
				// 结果统计和显示
				processDetailedResults: function(finalResults) {
					try {
						// 处理最终结果
						const validResults = finalResults.filter(r => typeof r.latency === 'number');
						
						if (validResults.length === 0) {
							throw new Error('精测未找到可用节点');
						}
						
						// 综合评分系统 - 同时考虑延迟、加载时间和稳定性
						validResults.forEach(result => {
							if (!result.stats) result.stats = {};
							
							// 计算简单稳定性得分（如果有原始数据）
							let latencyStabilityScore = 0;
							let loadTimeStabilityScore = 0;
							
							if (result.stats.raw && result.stats.raw.length > 1) {
								const latencyValues = result.stats.raw;
								const latencyAvg = latencyValues.reduce((sum, val) => sum + val, 0) / latencyValues.length;
								
								// 计算延迟方差
								let latencyVariance = 0;
								for (const val of latencyValues) {
									latencyVariance += Math.pow(val - latencyAvg, 2);
								}
								latencyVariance /= latencyValues.length;
								
								// 变异系数 = 方差/平均值，越大表示越不稳定
								latencyStabilityScore = (latencyVariance / (latencyAvg * latencyAvg)) * 100;
							}
							
							// 计算加载时间的稳定性（如果有原始数据）
							if (result.stats.loadTimeRaw && result.stats.loadTimeRaw.length > 1) {
								const loadTimeValues = result.stats.loadTimeRaw;
								const loadTimeAvg = loadTimeValues.reduce((sum, val) => sum + val, 0) / loadTimeValues.length;
								
								// 计算加载时间方差
								let loadTimeVariance = 0;
								for (const val of loadTimeValues) {
									loadTimeVariance += Math.pow(val - loadTimeAvg, 2);
								}
								loadTimeVariance /= loadTimeValues.length;
								
								// 加载时间变异系数
								if (loadTimeAvg > 0) {
									loadTimeStabilityScore = (loadTimeVariance / (loadTimeAvg * loadTimeAvg)) * 100;
								}
							}
							
							// 综合加权评分计算
							// 1. 延迟因素 - 延迟时间 * (1 + 稳定性修正)
							const latencyFactor = Math.min(0.5, latencyStabilityScore / 100);
							const latencyScore = result.latency * (1 + latencyFactor);
							
							// 2. 加载因素 - 考虑加载时间（如果有）
							let loadScore = 0;
							const hasLoadTime = typeof result.loadTime === 'number' && result.loadTime > 0;
							
							if (hasLoadTime) {
								const loadTimeFactor = Math.min(0.5, loadTimeStabilityScore / 100);
								loadScore = result.loadTime * (1 + loadTimeFactor);
							}
							
							// 3. 计算综合得分
							result.score = hasLoadTime ? 
								(latencyScore * 0.4) + (loadScore * 0.6) : // 有加载时间时的权重
								latencyScore; // 仅使用延迟时间
							
							// 存储稳定性指标
							result.stats.latencyStabilityScore = latencyStabilityScore;
							result.stats.loadTimeStabilityScore = loadTimeStabilityScore;
							result.stats.hasLoadTime = hasLoadTime;
						});
						
						// 按综合得分排序（得分越低越好）
						validResults.sort((a, b) => (a.score || 0) - (b.score || 0));
						
						// 找出最优的结果
						const bestResult = validResults[0];
						
						// 更新UI显示
						validResults.forEach(result => {
							if (result.idx !== undefined) {
								const latencySpan = DOM.getLatencySpan(result.idx);
								if (latencySpan && result === bestResult) {
									latencySpan.style.fontWeight = 'bold';
								}
							}
						});
						
						// 高亮最优结果
						Utils.ui.highlightFastest(bestResult.name);
						Utils.preloadUrls(validResults, bestResult.url);
						
						return bestResult;
					} catch (error) {
						throw new Error('结果处理错误: ' + error.message);
					}
				},
				
				// 完整测速流程
				run: function() {
					const self = this;
					
					return new Promise(function(resolve, reject) {
						// 1. 初筛测试
						self.preliminaryTest()
							.then(function(prelimResults) {
								try {
									// 2. 获取候选URL
									const candidates = self.getCandidates(prelimResults);
									
									// 3. 精测阶段
									return self.detailedTest(candidates);
								} catch (error) {
									throw new Error('候选节点计算错误: ' + error.message);
								}
							})
							.then(function(finalResults) {
								try {
									// 4. 处理最终结果
									const fastest = self.processDetailedResults(finalResults);
									
									// 测试结束
									// 如果没有手动选择，则自动跳转
									if (!Utils.ui.hasManualSelection()) {
										setTimeout(function() {
											if (!Utils.ui.hasManualSelection()) {
												window.location.href = fastest.url + encodeURI('${path}') + encodeURI('${params}');
											}
										}, CONFIG.REDIRECT_DELAY);
									}
									
									resolve(fastest);
								} catch (error) {
									throw new Error('结果处理错误: ' + error.message);
								}
							})
							.catch(function(error) {
								Logger.error('测速失败: ' + (error.message || error));
								
								// 显示错误信息
								urls.forEach(function(_, index) {
									Utils.updateLatencyDisplay(index, '测速失败');
								});
								
								// 提供手动选择选项
								try {
									if (urls && urls.length > 0) {
										const message = document.createElement('div');
										message.style.color = '#ef4444';
										message.style.marginBottom = '10px';
										message.style.fontWeight = '500';
										message.textContent = '自动测速失败，请手动选择节点';
										
										const container = document.querySelector('.container');
										const ul = document.getElementById('urls');
										if (container && ul) {
											container.insertBefore(message, ul);
										}
									}
								} catch (uiError) {
									Logger.error('UI错误处理失败: ' + uiError);
								}
								
								reject(error);
							});
					});
				}
			};
			
			// UI模块
			const UI = {
				// 生成URL列表
				createUrlList: function() {
					const ul = document.getElementById("urls");
					
					if (!urls || urls.length === 0) {
						ul.innerHTML = '<li>未配置有效的URL列表</li>';
						return;
					}
					
					// 使用文档片段优化DOM操作
					const fragment = document.createDocumentFragment();
					
					urls.forEach((urlString, index) => {
						const parsedUrl = Utils.parseUrl(urlString);
						
						const li = document.createElement("li");
						li.id = 'result' + index;
						li.innerHTML = parsedUrl.name + ' <span id="latency' + index + '" class="testing">测速中...</span>';
						
						// 添加点击事件 - 使用事件委托而非直接绑定
						li.addEventListener('click', function() {
							this.classList.add('clicked');
							Utils.ui.showManualSelectionNotice(parsedUrl.name);
							setTimeout(() => {
								window.location.href = parsedUrl.url + encodeURI('${path}') + encodeURI('${params}');
							}, 300);
						});
						
						fragment.appendChild(li);
					});
					
					ul.appendChild(fragment);
				},
				
				// 初始化UI
				init: function() {
					this.createUrlList();
				}
			};
			
			// 初始化应用
			document.addEventListener('DOMContentLoaded', function() {
				DOM.initCacheManager();
				UI.init();
				SpeedTest.run().catch(error => Logger.error('应用启动失败: ' + error))
					.finally(() => {
						// 测试完成后清理不需要的缓存
						setTimeout(() => DOM.clearCache(), 5000);
					});
			});
			</script>
		</body>
		</html>
		`;
	},
	
	/**
	 * 生成精简的错误页面HTML
	 * @param {Error} error - 错误对象
	 * @return {string} 错误页面HTML
	 */
	generateErrorPage: (error) => {
		return `
		<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<title>服务器错误</title>
			<style>
				body{font-family:system-ui,-apple-system,sans-serif;padding:20px;text-align:center;background-color:#f8f9fb;color:#333;line-height:1.5}
				.container{max-width:500px;margin:50px auto;padding:30px;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.08)}
				.error{color:#e53e3e;margin:20px 0;font-weight:500}
				.details{color:#718096;font-size:0.9em;margin-top:20px}
				h1{margin-bottom:30px;font-weight:600;color:#2d3748}
			</style>
		</head>
		<body>
			<div class="container">
				<h1>服务器错误</h1>
				<div class="error">${error.message}</div>
				<div class="details">请联系管理员或稍后再试</div>
			</div>
		</body>
		</html>
		`;
	}
};

/**
 * 错误处理工具函数 - 统一错误处理
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文描述
 * @return {Object} 标准化错误对象
 */
function handleError(error, context = '') {
	const errorId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
	const message = error.message || '未知错误';
	Logger.error(`${context} [${errorId}]: ${message}`);
	if (error.stack && CONFIG.LOG_LEVEL <= 0) {
		Logger.debug(`错误详情 [${errorId}]: ${error.stack}`);
	}
	return { errorId, message };
}

/**
 * 处理资源请求的错误函数 - 重构以简化嵌套逻辑
 * @param {string} url - 请求的资源URL
 * @param {Error} error - 错误对象
 * @param {string} resourceType - 资源类型描述
 * @param {function} fallbackFn - 可选的降级处理函数
 * @return {Promise<Response>} 资源响应或降级响应
 */
async function handleResourceError(url, error, resourceType, fallbackFn) {
	// 统一错误记录逻辑
	const { errorId, message } = handleError(error, `${resourceType}获取失败: ${url}`);
	
	// 如果没有提供降级函数，返回默认错误响应
	if (typeof fallbackFn !== 'function') {
		return new Response(`请求${resourceType}失败 [${errorId}]`, {
			status: 500,
			headers: {
				'content-type': 'text/plain;charset=UTF-8',
				'Cache-Control': 'no-store'
			}
		});
	}
	
	// 尝试使用降级函数
	try {
		return await fallbackFn(errorId, message);
	} catch (fallbackError) {
		// 降级失败，记录并返回默认错误响应
		Logger.warn(`降级处理失败 [${errorId}]: ${fallbackError.message}`);
		
		return new Response(`请求${resourceType}失败，降级处理也失败 [${errorId}]`, {
			status: 500,
			headers: {
				'content-type': 'text/plain;charset=UTF-8',
				'Cache-Control': 'no-store'
			}
		});
	}
}

// Buffer base64 解码工具（兼容 Cloudflare Worker）
function base64ToUint8Array(base64) {
	// 输入验证
	if (!base64 || typeof base64 !== 'string') {
		Logger.warn('无效的base64输入');
		return new Uint8Array();
	}
	
	try {
		// 在Cloudflare Worker环境中，使用atob
		const binary = atob(base64);
		const len = binary.length;
		// 预分配数组大小提高性能
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	} catch (error) {
		Logger.error(`Base64解码失败: ${error.message}`);
		return new Uint8Array();
	}
}

/**
 * 主应用模块 - 处理请求和响应
 * Cloudflare Worker 入口，负责路由分发、配置初始化、异常处理
 */
async function handleFetch(request, env = {}) {
	// 捕获所有可能的异常
	try {
		// 请求开始计时
		const requestStart = Date.now();
		Logger.debug(`处理请求: ${request.url}`);
		
		// 输入验证
		if (!request || !request.url) {
			throw new Error('无效请求对象');
		}
		
		const url = new URL(request.url);
		const path = url.pathname;
		const params = url.search;
		
		// 静态资源缓存增强
		const staticExtensions = /\.(js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$/i;
		if (staticExtensions.test(path)) {
			// 设置更长的缓存时间
			const response = await fetch(request);
			const headers = new Headers(response.headers);
			
			// 为静态资源设置长缓存
			headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
			headers.set('X-Content-Type-Options', 'nosniff');
			// 添加HTTP/3支持
			headers.set('alt-svc', 'h3=":443"; ma=86400, h3-29=":443"; ma=86400');
			
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers
			});
		}
		
		// 处理特殊路径请求
		if (path.toLowerCase() === '/ads.txt') {
			Logger.debug('返回 ads.txt');
			return new Response(env.ads || '', {
				headers: { 
					'content-type': 'text/plain;charset=UTF-8',
					'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
					'Access-Control-Allow-Origin': '*',
					'alt-svc': 'h3=":443"; ma=86400, h3-29=":443"; ma=86400'
				}
			});
		} 
		
		if (path.toLowerCase() === '/favicon.ico') {
			Logger.debug('返回网站图标');
			const icoUrl = env.icoUrl || CONFIG.SITE.icoUrl;
			const fallbackIco = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
			
			// 准备标准的响应头
			const getIconHeaders = (contentType = 'image/x-icon') => ({
				'content-type': contentType,
				'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
				'Access-Control-Allow-Origin': '*',
				'alt-svc': 'h3=":443"; ma=86400, h3-29=":443"; ma=86400'
			});
			
			// 返回降级图标的函数
			const getFallbackIconResponse = () => {
				const base64 = fallbackIco.split(',')[1] || '';
				return new Response(base64ToUint8Array(base64), {
					headers: getIconHeaders()
				});
			};
			
			// 如果是data:URL直接处理
			if (icoUrl.startsWith('data:')) {
				const base64 = icoUrl.split(',')[1] || '';
				return new Response(base64ToUint8Array(base64), {
					headers: getIconHeaders()
				});
			}
			
			// 尝试获取远程图标，使用通用错误处理模式
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 3000);
				
				const res = await fetch(icoUrl, { 
					signal: controller.signal,
					headers: { 'Accept': 'image/*' }
				});
				clearTimeout(timeoutId);
				
				if (res.ok && res.headers.get('content-type')?.includes('image')) {
					return new Response(res.body, { 
						headers: getIconHeaders(res.headers.get('content-type') || 'image/x-icon')
					});
				}
				
				// 获取成功但不是图片格式，降级处理
				return getFallbackIconResponse();
			} catch (e) {
				// 远程获取失败，也使用降级处理
				return await handleResourceError(icoUrl, e, 'favicon.ico', getFallbackIconResponse);
			}
		}
		
		// 配置初始化
		const config = ConfigModule.initSiteConfig(env);
		const urls = ConfigModule.getUrlList(env);
		
		// 如果没有有效URL，返回错误
		if (!urls || urls.length === 0) {
			throw new Error('未配置任何有效的CDN链接');
		}
		
		// 生成HTML响应
		const html = UIModule.generateHTML({ config, urls, path, params });
		
		// 记录请求处理时间
		const processingTime = Date.now() - requestStart;
		Logger.info(`请求处理完成，耗时: ${processingTime}ms`);
		
		// 返回HTML响应
		return new Response(html, {
			headers: { 
				'content-type': 'text/html;charset=UTF-8',
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
				'Vary': 'Accept-Encoding',
				// 添加HTTP/3(QUIC)支持
				'alt-svc': 'h3=":443"; ma=86400, h3-29=":443"; ma=86400',
				// 移除不必要的X-Response-Time和X-Generator头部
				'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
				'X-XSS-Protection': '1; mode=block',
				'X-Frame-Options': 'SAMEORIGIN'
			}
		});
	} catch (error) {
		// 使用通用错误处理
		const { errorId, message } = handleError(error, '请求处理错误');
		
		// 返回友好错误页面
		const errorPageHTML = UIModule.generateErrorPage({
			message: `服务器处理请求时出错 [${errorId}]`,
			id: errorId
		});
		
		// 设置标准安全响应头
		const headers = {
			'content-type': 'text/html;charset=UTF-8',
			'Cache-Control': 'no-store',
			// 添加HTTP/3(QUIC)支持
			'alt-svc': 'h3=":443"; ma=86400, h3-29=":443"; ma=86400',
			// 精简X-Error-ID和X-Error头，保留id用于故障排查
			'X-Error-ID': errorId,
			'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
			'X-XSS-Protection': '1; mode=block',
			'X-Frame-Options': 'SAMEORIGIN',
			'X-Content-Type-Options': 'nosniff'
		};
		
		return new Response(errorPageHTML, { 
			status: 500,
			headers
		});
	}
}

export default {
	fetch: handleFetch
};
