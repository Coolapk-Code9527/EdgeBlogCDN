/**
 * BlogCDN智能访问网关 
 * 版本: 1.1.1
 * 描述: 轻量级边缘计算和内容分发系统，支持多CDN线路智能测速和自动跳转
 * 优化: AI
 */

// 统一配置模块 - 集中管理所有常量
const CONFIG = {
	// 系统核心配置
	SYSTEM: {
		VERSION: '1.1.1',  // 当前版本号，标识当前部署的系统版本
		LOG_LEVEL: 1,      // 日志级别（0=DEBUG，1=INFO，2=WARN，3=ERROR），控制日志输出详细程度
		TIMEOUT: 3000,     // 默认测速超时时间（毫秒），单次测速最大等待时间
		REDIRECT_DELAY: 1000   // 自动跳转前的延迟（毫秒），用于展示测速结果
	},
	
	// 测速策略配置（影响测速流程和候选节点筛选）
	SPEED_TEST: {
		ROUNDS: 2,                 // 测速轮数，分为初筛和精测两轮
		TIMEOUT: {                 // 各阶段测速超时时间
			PRELIM: 2000,          // 初筛阶段超时时间（毫秒）
			FINAL: 3000            // 精测阶段超时时间（毫秒）
		},
		CANDIDATES: {              // 候选节点筛选规则
			PERCENT: 0.4,          // 初筛后保留的比例（如0.4表示保留40%最快节点）
			MIN: 2,                // 最少保留的候选数量，防止节点过少
			MAX: 3                 // 最多保留的候选数量，防止节点过多
		},
		TESTS_PER_ROUND: 3,        // 每轮每个URL测试次数，取平均值
		DELAY_BETWEEN_TESTS: 100   // 每次测速之间的间隔（毫秒），防止并发过高
	},
	
	// 延迟显示颜色配置（前端测速结果的颜色分级）
	LATENCY_COLORS: {
		excellent: '#22c55e', // ≤100ms，极快
		good: '#84cc16',      // ≤200ms，较快
		average: '#eab308',   // ≤500ms，中等
		slow: '#f97316',      // ≤1000ms，较慢
		verySlow: '#ef4444',  // >1000ms，非常慢
		error: '#dc2626'      // 错误状态，测速失败
	},
	
	// 默认博客CDN链接列表（支持#后缀注释显示名称）
	DEFAULT_URLS: [
		'https://blog.115694.xyz#Cloudflare CDN',   // Cloudflare主线路
		'https://fastly.blog.115694.xyz#Fastly CDN',// Fastly备用线路
		'https://gblog.115694.xyz#Gcore CDN',  // Gcore备用线路
		'https://vercel.blog.115694.xyz#Vercel CDN',// Vercel备用线路
		'https://rin-blog-f0y.pages.dev#备用地址1' // 其他备用1
	],

	// 默认站点基础配置（可被环境变量覆盖）
	SITE: {
		ADS: '', // 广告内容，可为空
		ICO: 'https://image.115694.xyz/img_erha.png', // 网站favicon图标URL
		PNG: 'https://img.115694.xyz/img_tx1.jpg',    // LOGO主图URL
		BEIAN: `<a href='https://icp.gov.moe/'>萌ICP备-20070707号</a>`, // 备案信息HTML
		TITLE: 'BlogCDN 智能访问网关', // 页面主标题
		NAME: 'Code9527 Blog',        // 博客名称
		IMG: [                        // 背景图片URL数组，随机选取
			'https://rpic.origz.com/api.php?category=pixiv',
			'https://api.mtyqx.cn/api/random.php',
			'https://bing.img.run/rand_1366x768.php'
		]
	}
};

/**
 * 日志模块 - 处理所有日志相关功能
 * 用于统一管理日志输出，便于调试和生产环境切换
 */
const LoggerModule = {
	/**
	 * 记录日志消息
	 * @param {string} message - 日志消息
	 * @param {number} level - 日志级别 (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
	 */
	log: (message, level = 1) => {
		if (level >= CONFIG.SYSTEM.LOG_LEVEL) {
			const prefix = ['[DEBUG]', '[INFO]', '[WARN]', '[ERROR]'][level];
			console.log(`${prefix} ${message}`);
		}
	},
	
	// 快捷方法
	debug: (message) => LoggerModule.log(message, 0),
	info: (message) => LoggerModule.log(message, 1),
	warn: (message) => LoggerModule.log(message, 2),
	error: (message) => LoggerModule.log(message, 3)
};

/**
 * 配置处理模块 - 处理配置解析和验证
 * 负责从环境变量和默认配置中生成最终的站点和URL配置
 */
const ConfigModule = {
	/**
	 * 解析环境变量和获取URL列表
	 * @param {Object} env - 环境变量对象
	 * @return {string[]} URL列表
	 * 优先使用环境变量中的URL，否则使用默认配置
	 */
	getUrlList: (env) => {
		// 默认使用预设的URL列表
		let urls = [...CONFIG.DEFAULT_URLS];
		
		// 如果环境变量中有URL配置，优先使用
		if (env.URL) {
			try {
				// 规范化环境变量字符串
				const normalizedStr = env.URL
					.replace(/[	|"'\r\n]+/g, ',')
					.replace(/,+/g, ',')
					.replace(/^,|,$/g, '');
				
				const parsedUrls = normalizedStr ? normalizedStr.split(',') : [];
				
				if (parsedUrls.length > 0) {
					urls = parsedUrls;
					LoggerModule.info(`从环境变量加载了 ${urls.length} 个URL`);
				}
			} catch (error) {
				LoggerModule.error(`解析URL环境变量错误: ${error.message}`);
			}
		}
		
		// 至少需要一个URL才能工作
		if (urls.length === 0) {
			LoggerModule.warn('没有配置URL，使用默认列表');
			urls = [...CONFIG.DEFAULT_URLS];
		}
		
		return urls;
	},
	
	/**
	 * 初始化站点配置
	 * @param {Object} env - 环境变量对象
	 * @return {Object} 处理后的配置
	 * 支持环境变量覆盖默认配置，随机选择背景图片
	 */
	initSiteConfig: (env) => {
		// 从默认配置复制
		const config = { ...CONFIG.SITE };
		
		// 环境变量覆盖
		Object.keys(CONFIG.SITE).forEach(key => {
			if (env[key]) config[key] = env[key];
		});
		
		// 处理背景图片
		if (env.IMG) {
			try {
				const normalizedStr = env.IMG
					.replace(/[	|"'\r\n]+/g, ',')
					.replace(/,+/g, ',')
					.replace(/^,|,$/g, '');
				
				const images = normalizedStr ? normalizedStr.split(',') : [];
				
				if (images.length > 0) {
					// 从环境变量中随机选择一张图片
					config.IMG = images[Math.floor(Math.random() * images.length)];
					LoggerModule.debug(`从环境变量随机选择背景图片: ${config.IMG}`);
				}
			} catch (error) {
				LoggerModule.error(`解析IMG环境变量错误: ${error.message}`);
			}
		} else if (Array.isArray(config.IMG) && config.IMG.length > 0) {
			// 从默认配置数组中随机选择一张图片
			config.IMG = config.IMG[Math.floor(Math.random() * config.IMG.length)];
		}
		
		// 确保IMG是字符串而非数组
		if (Array.isArray(config.IMG)) {
			config.IMG = config.IMG[0];
		}
		
		// 验证配置
		const requiredFields = ['NAME', 'TITLE', 'PNG', 'ICO'];
		const missingFields = requiredFields.filter(field => !config[field]);
		
		if (missingFields.length > 0) {
			LoggerModule.warn(`配置缺少必要字段: ${missingFields.join(', ')}`);
			// 为缺失的PNG或ICO提供默认占位符，避免页面元素链接到undefined
			if (missingFields.includes('PNG') && !config.PNG) {
				config.PNG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
			}
			if (missingFields.includes('ICO') && !config.ICO) {
				config.ICO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
			}
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
		const { NAME, TITLE, PNG, BEIAN, IMG } = config;
		
		// 提取需要预加载的域名
		const extractDomains = (urlsList) => {
			const domains = new Set();
			// 处理配置中的URL
			[PNG, config.ICO, IMG].filter(Boolean).forEach(url => {
				try {
					const domain = new URL(url).hostname;
					if (domain) domains.add(domain);
				} catch(e) {}
			});
			
			// 处理CDN URL
			urlsList.forEach(urlString => {
				try {
					const parts = urlString.split('#');
					const url = parts[0];
					const domain = new URL(url).hostname;
					if (domain) domains.add(domain);
				} catch(e) {}
			});
			
			return Array.from(domains);
		};
		
		// 生成预加载链接
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
			<title>${NAME} - ${TITLE}</title>
			
			<!-- 资源优化策略 -->
			<meta http-equiv="x-dns-prefetch-control" content="on">
			${preloadLinks}
			<link rel="preload" href="${PNG}" as="image" fetchpriority="high">
			
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
				}
				
				* {margin: 0; padding: 0; box-sizing: border-box;}
				
				body {
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
					background-size: cover;
					background-position: center;
					background-attachment: fixed;
					min-height: 100vh;
					display: flex;
					justify-content: center;
					align-items: center;
					transition: background 0.8s ease;
				}
				
				/* 深色主题支持 */
				@media (prefers-color-scheme: dark) {
					body {background: linear-gradient(120deg, #2a5298 0%, #1a2980 100%);}
					.container {
						background: var(--bg-dark);
						box-shadow: var(--shadow);
						border: var(--border-dark);
					}
					h1, .description {color: rgba(255, 255, 255, 0.9);}
					ul li {
						background: var(--bg-dark-hover);
						color: rgba(255, 255, 255, 0.9);
					}
					ul li:hover {background: rgba(30, 41, 59, 0.8);}
					.testing {color: #cbd5e1;}
				}
				
				.bg-loaded body {background-image: var(--bg-image);}
				
				.container {
					background: var(--bg-light);
					backdrop-filter: blur(10px);
					-webkit-backdrop-filter: blur(10px);
					border-radius: var(--radius);
					padding: 30px;
					width: 480px;
					min-height: 620px;
					box-shadow: var(--shadow);
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					transition: var(--transition);
					border: var(--border-light);
					will-change: transform, box-shadow;
				}
		
				.container:hover {
					transform: translateY(-5px);
					box-shadow: var(--shadow-hover);
				}
		
				.logo-container {
					position: relative;
					width: 180px;
					height: 180px;
					margin-bottom: 20px;
				}

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
				
				@keyframes pulse {
					0% {box-shadow: 0 0 0 0 rgba(107, 223, 143, 0.4);}
					70% {box-shadow: 0 0 0 20px rgba(107, 223, 143, 0);}
					100% {box-shadow: 0 0 0 0 rgba(107, 223, 143, 0);}
				}

				@keyframes blink {
					0% {opacity: 1;}
					50% {opacity: 0.6;}
					100% {opacity: 1;}
				}

				@keyframes octocat-wave {
					0%, 100% {transform: rotate(0)}
					20%, 60% {transform: rotate(-25deg)}
					40%, 80% {transform: rotate(10deg)}
				}

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
		
				.description {
					width: 100%;
					padding: 0 15px;
					margin-bottom: 15px;
					font-weight: 600;
				}

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

				ul li:hover {
					background: var(--bg-light-hover);
					transform: translateX(5px);
				}

				.beian-info {
					text-align: center;
					font-size: 13px;
					margin-top: 20px;
				}

				.beian-info a {
					color: var(--primary);
					text-decoration: none;
					border-bottom: 1px dashed var(--primary);
					padding-bottom: 2px;
				}

				.beian-info a:hover {border-bottom-style: solid;}
		
				.github-corner {
					position: fixed;
					top: 0;
					right: 0;
					z-index: 1000;
				}

				.github-corner svg {
					position: absolute;
					top: 0;
					right: 0;
					border: 0;
					fill: var(--primary);
					color: #ffffff;
					width: 80px;
					height: 80px;
					transition: fill 0.3s ease;
					will-change: fill;
				}
				
				.github-corner:hover svg {fill: var(--primary-dark);}
				
				.github-corner .octo-arm {
					transform-origin: 130px 106px;
					will-change: transform;
				}
				
				.github-corner:hover .octo-arm {animation: octocat-wave 560ms ease-in-out;}
				
				.testing {
					color: var(--text-secondary);
					animation: blink 1.2s infinite;
					will-change: opacity;
				}
				
				.fastest-result {
					background: rgba(107, 223, 143, 0.3) !important;
					border: 2px solid rgba(107, 223, 143, 0.5) !important;
					transform: translateX(5px) !important;
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
				
				@media (max-width: 500px) {
					.container {
						width: 90%;
						min-height: auto;
						padding: 20px;
					}
					.logo-container {width: 140px; height: 140px;}
					h1 {font-size: 24px; margin-bottom: 20px;}
					ul li {padding: 10px 12px;}
					.github-corner svg {width: 60px; height: 60px;}
					.github-corner:hover .octo-arm {animation: none;}
					.github-corner .octo-arm {animation: octocat-wave 560ms ease-in-out;}
				}
			</style>
		</head>
		<body>
			<a href="https://github.com/Coolapk-Code9527/EdgeBlogCDN" target="_blank" class="github-corner" aria-label="View source on Github">
				<svg viewBox="0 0 250 250" aria-hidden="true">
					<path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
					<path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" class="octo-arm" style="transform-origin: 130px 106px;"></path>
					<path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
				</svg>
			</a>
			
			<div class="container">
				<div class="logo-container">
					<img class="logo" src="${PNG}" alt="${NAME} Logo" loading="lazy">
				</div>
				<h1>${TITLE}</h1>
				<ul class="description" id="urls"></ul>
				<div class="beian-info">${BEIAN}</div>
			</div>
			
			<script>
			// 定义博客URL列表
			const urls = ${JSON.stringify(urls)};
			
			// 测速配置
			const CONFIG = {
				TIMEOUT: ${CONFIG.SYSTEM.TIMEOUT},
				REDIRECT_DELAY: ${CONFIG.SYSTEM.REDIRECT_DELAY},
				SPEED_TEST: {
					ROUNDS: ${CONFIG.SPEED_TEST.ROUNDS},
					PRELIMINARY_TIMEOUT: ${CONFIG.SPEED_TEST.TIMEOUT.PRELIM},
					FINAL_TIMEOUT: ${CONFIG.SPEED_TEST.TIMEOUT.FINAL},
					TOP_PERCENTAGE: ${CONFIG.SPEED_TEST.CANDIDATES.PERCENT},
					MIN_CANDIDATES: ${CONFIG.SPEED_TEST.CANDIDATES.MIN},
					MAX_CANDIDATES: ${CONFIG.SPEED_TEST.CANDIDATES.MAX},
					TESTS_PER_ROUND: ${CONFIG.SPEED_TEST.TESTS_PER_ROUND},
					DELAY_BETWEEN_TESTS: ${CONFIG.SPEED_TEST.DELAY_BETWEEN_TESTS}
				},
				LATENCY_COLORS: {
					excellent: '${CONFIG.LATENCY_COLORS.excellent}',
					good: '${CONFIG.LATENCY_COLORS.good}',
					average: '${CONFIG.LATENCY_COLORS.average}',
					slow: '${CONFIG.LATENCY_COLORS.slow}',
					verySlow: '${CONFIG.LATENCY_COLORS.verySlow}',
					error: '${CONFIG.LATENCY_COLORS.error}'
				}
			};
			
			// 背景图片处理 - 优化延迟加载，避免硬编码
			(function() {
				const bgImage = '${IMG}';
				if (!bgImage || !bgImage.trim()) return;
				
				// 默认使用CSS渐变背景
				document.documentElement.style.setProperty('--bg-image', 'none');
				
				// 背景图片加载函数
				function loadBackgroundImage() {
					// 使用requestIdleCallback在浏览器空闲时加载
					const loadFn = function() {
						const img = new Image();
						img.onload = function() {
							document.documentElement.style.setProperty('--bg-image', "url('" + bgImage + "')");
							document.documentElement.classList.add('bg-loaded');
						};
						if ('fetchPriority' in img) img.fetchPriority = 'low';
						img.src = bgImage;
					};
					
					// 使用更智能的加载方式
					if ('requestIdleCallback' in window) {
						window.requestIdleCallback(loadFn, {timeout: 3000});
					} else {
						loadFn();
					}
				}
				
				// 使用Intersection Observer延迟加载背景图片
				if ('IntersectionObserver' in window) {
					// 创建一个观察者检测容器可见性
					const observer = new IntersectionObserver(function(entries) {
						// 当容器可见时加载背景
						if (entries[0].isIntersecting) {
							loadBackgroundImage();
							observer.disconnect();
						}
					}, {threshold: 0.1});
					
					// 开始观察容器元素
					document.addEventListener('DOMContentLoaded', function() {
						const container = document.querySelector('.container');
						if (container) observer.observe(container);
					});
				} else {
					// 降级方案：使用setTimeout
					if (document.readyState === 'loading') {
						document.addEventListener('DOMContentLoaded', function() {
							setTimeout(loadBackgroundImage, 500);
						});
					} else {
						setTimeout(loadBackgroundImage, 500);
					}
				}
			})();
			
			// DOM元素缓存
			const DOM = {
				cache: {},
				get: id => DOM.cache[id] || (DOM.cache[id] = document.getElementById(id)),
				getLatencySpan: index => DOM.get('latency' + index),
				getResultLi: index => DOM.get('result' + index),
				query: selector => document.querySelector(selector)
			};
			
			// 工具函数模块
			const Utils = {
				// 获取延迟颜色
				getLatencyColor: function(latency) {
					if (latency <= 100) return CONFIG.LATENCY_COLORS.excellent;
					if (latency <= 200) return CONFIG.LATENCY_COLORS.good;
					if (latency <= 500) return CONFIG.LATENCY_COLORS.average;
					if (latency <= 1000) return CONFIG.LATENCY_COLORS.slow;
					return CONFIG.LATENCY_COLORS.verySlow;
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
				
				// 更新延迟显示
				updateLatencyDisplay: function(index, latency) {
					const latencySpan = DOM.getLatencySpan(index);
					if (!latencySpan) return;
					
					latencySpan.classList.remove('testing');
					
					if (typeof latency === 'number') {
						latencySpan.textContent = latency + 'ms';
						latencySpan.style.color = this.getLatencyColor(latency);
					} else {
						latencySpan.textContent = latency;
						latencySpan.style.color = CONFIG.LATENCY_COLORS.error;
					}
				},
				
				// UI相关函数
				ui: {
					// 显示手动选择提示
					showManualSelectionNotice: function(name) {
						if (document.getElementById('manual-selection-notice')) return;
						
						const notice = document.createElement('div');
						notice.id = 'manual-selection-notice';
						notice.className = 'manual-selection-notice';
						notice.textContent = '手动选择: ' + name;
						
						const container = document.querySelector('.container');
						const beianInfo = document.querySelector('.beian-info');
						if (container && beianInfo) {
							container.insertBefore(notice, beianInfo);
						}
						
						return notice;
					},
					
					// 高亮最快的结果
					highlightFastest: function(name) {
						urls.forEach((url, index) => {
							const parsedUrl = Utils.parseUrl(url);
							if (parsedUrl.name === name) {
								const li = DOM.getResultLi(index);
								if (li) li.classList.add('fastest-result');
							}
						});
					},
					
					// 检查是否已经有手动选择
					hasManualSelection: () => !!document.getElementById('manual-selection-notice')
				},
				
				// 向其他方法提供UI函数引用
				showManualSelectionNotice: function(name) {
					return this.ui.showManualSelectionNotice(name);
				},
				highlightFastest: function(name) {
					return this.ui.highlightFastest(name);
				},
				hasManualSelection: function() {
					return this.ui.hasManualSelection();
				},
				
				// 并发池工具
				concurrentPool: function(tasks, limit) {
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
						
						const concurrency = Math.min(limit, tasks.length);
						for (let i = 0; i < concurrency; i++) {
							next();
						}
					});
				},
				
				// URL预加载优化
				preloadUrls: function(urlResults, fastestUrl) {
					// 防止无效参数或不支持的环境
					if (!window.requestIdleCallback) return;
					
					// 使用requestIdleCallback在浏览器空闲时预加载资源
					window.requestIdleCallback(function() {
						// 基本环境检查
						if (!('head' in document) || !('createElement' in document)) return;
						
						// 预加载状态管理
						const preloadState = {
							origins: new Set(),             // 已预加载的域名集合
							preloaded: new Map(),           // URL到优先级的映射，避免重复处理
							queue: {                        // 优先级队列
								high: [],                   // 高优先级URL列表
								medium: [],                 // 中优先级URL列表
								low: []                     // 低优先级URL列表
							},
							
							// 动态提取域名和路径
							extractUrlInfo: function(url) {
								try {
									const urlObj = new URL(url);
									return {
										origin: urlObj.origin,
										path: urlObj.pathname + urlObj.search,
										fullUrl: url
									};
								} catch(e) {
									return null;
								}
							},
							
							// 添加URL到预加载队列，避免重复
							addToQueue: function(url, priority = 'low') {
								if (!url || this.preloaded.has(url)) return false;
								
								const urlInfo = this.extractUrlInfo(url);
								if (!urlInfo) return false;
								
								// 如果域名已经加入预加载，但优先级更高，则更新
								if (this.origins.has(urlInfo.origin)) {
									const currentPriority = this.preloaded.get(url);
									if (currentPriority && this.priorityValue(priority) <= this.priorityValue(currentPriority)) {
										return false; // 当前优先级已经足够高
									}
									// 否则从队列中移除旧URL，下面会添加新的
									this.queue[currentPriority] = this.queue[currentPriority].filter(u => u !== url);
								}
								
								// 添加到队列
								this.queue[priority].push(url);
								this.preloaded.set(url, priority);
								this.origins.add(urlInfo.origin);
								return true;
							},
							
							// 获取优先级数值，用于比较
							priorityValue: function(priority) {
								return {high: 0, medium: 1, low: 2}[priority] || 2;
							},
							
							// 处理预加载队列
							processQueue: function() {
								const head = document.head;
								const createLink = (rel, href, options = {}) => {
									const link = document.createElement('link');
									link.rel = rel;
									link.href = href;
									Object.keys(options).forEach(key => {
										if (key in link) link[key] = options[key];
									});
									return link;
								};
								
								// 优先处理高优先级资源
								['high', 'medium', 'low'].forEach(priority => {
									this.queue[priority].forEach(url => {
										const urlInfo = this.extractUrlInfo(url);
										if (!urlInfo) return;
										
										// 预连接
										head.appendChild(createLink('preconnect', urlInfo.origin));
										
										// 根据优先级决定预加载策略
										if (priority === 'high') {
											head.appendChild(createLink('prefetch', url, {fetchPriority: 'high'}));
										} else if (priority === 'medium') {
											// 中优先级使用prefetch但不指定优先级
											head.appendChild(createLink('prefetch', url));
										} 
										// 低优先级只预连接域名，不预取内容
									});
								});
							}
						};
						
						// 添加最快的URL到高优先级队列
						if (fastestUrl) {
							preloadState.addToQueue(fastestUrl, 'high');
						}
						
						// 处理其他测试结果，以中优先级添加
						if (Array.isArray(urlResults)) {
							urlResults
								.filter(r => typeof r.latency === 'number' && r.url !== fastestUrl)
								.sort((a, b) => a.latency - b.latency)
								.slice(0, 2) // 只处理最快的2个备选URL
								.forEach(result => preloadState.addToQueue(result.url, 'medium'));
						}
						
						// 立即处理高优先级资源
						preloadState.processQueue();
						
						// 使用增量处理避免阻塞主线程
						if (preloadState.queue.medium.length > 0 || preloadState.queue.low.length > 0) {
							setTimeout(function() {
								// 二次检查用户是否已交互
								const userHasInteracted = document.querySelector('.clicked') !== null;
								if (!userHasInteracted) {
									preloadState.processQueue();
								}
							}, 1500);
						}
					}, {timeout: 2000});
				}
			};
			
			// 测速模块
			const SpeedTest = {
				// 测试单个URL的延迟
				testLatency: function(url, timeout) {
					if (!url) return Promise.resolve({ url, latency: '无效URL' });
					
					timeout = timeout || CONFIG.TIMEOUT;
					
					return new Promise(function(resolve) {
						const start = performance.now();
						const xhr = new XMLHttpRequest();
						const controller = new AbortController();
						let isResolved = false;
						
						// 创建超时计时器
						const timeoutId = setTimeout(() => {
							if (!isResolved) {
								controller.abort();
								xhr.abort(); // 取消XHR请求
								isResolved = true;
								resolve({ url, latency: '响应超时', status: 'timeout' });
							}
						}, timeout);
						
						xhr.open('HEAD', url, true);
						xhr.onload = function() {
							if (isResolved) return;
							
							clearTimeout(timeoutId);
							isResolved = true;
							const latency = Math.round(performance.now() - start);
							
							if (xhr.status >= 200 && xhr.status < 400) {
								resolve({ url, latency, status: xhr.status });
							} else {
								resolve({ url, latency: '状态码: ' + xhr.status, status: xhr.status });
							}
						};
						
						xhr.onerror = function() {
							if (isResolved) return;
							
							clearTimeout(timeoutId);
							isResolved = true;
							resolve({ url, latency: '请求失败', status: 'error' });
						};
						
						xhr.onabort = function() {
							if (isResolved) return;
							
							clearTimeout(timeoutId);
							isResolved = true;
							resolve({ url, latency: '请求中止', status: 'aborted' });
						};
						
						xhr.send();
					});
				},
				
				// 多次测试取平均值 - 优化实现
				multiTest: function(url, times, timeout, name) {
					times = times || CONFIG.SPEED_TEST.TESTS_PER_ROUND;
					timeout = timeout || CONFIG.SPEED_TEST.FINAL_TIMEOUT;
					
					const self = this;
					
					return new Promise(async function(resolve) {
						const results = [];
						
						for (let i = 0; i < times; i++) {
							// 运行单次测试
							const result = await self.testLatency(url, timeout);
							
							// 记录有效结果
							if (typeof result.latency === 'number') {
								results.push(result.latency);
							}
							
							// 最后一次测试除外，都需要等待一定时间
							if (i < times - 1) {
								await Utils.sleep(CONFIG.SPEED_TEST.DELAY_BETWEEN_TESTS);
							}
						}
						
						// 测试结果处理
						if (results.length === 0) {
							resolve({ url, name, latency: '所有测试均失败', status: 'failed' });
							return;
						}
						
						// 移除最高值以排除异常值的影响
						if (results.length > 2) {
							results.sort((a, b) => a - b);
							results.pop();
						}
						
						// 计算平均延迟
						const avgLatency = Math.round(
							results.reduce((sum, val) => sum + val, 0) / results.length
						);
						
						resolve({ url, name, latency: avgLatency, status: 'success' });
					});
				},
				
				// 初筛阶段测试
				preliminaryTest: function() {
					const self = this;
					const tasks = urls.map((urlString, idx) => {
						return function() {
							const parsedUrl = Utils.parseUrl(urlString);
							
							return self.testLatency(
								parsedUrl.url, 
								CONFIG.SPEED_TEST.PRELIMINARY_TIMEOUT
							).then(result => ({
								...result,
								name: parsedUrl.name,
								originalUrl: urlString,
								idx: idx
							}));
						};
					});
					
					// 使用并发池限制同时进行的请求数量
					return Utils.concurrentPool(tasks, 4);
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
					
					// 计算要保留的候选数量
					const topCount = Math.ceil(validResults.length * CONFIG.SPEED_TEST.TOP_PERCENTAGE);
					const candidateCount = Math.max(
						CONFIG.SPEED_TEST.MIN_CANDIDATES,
						Math.min(CONFIG.SPEED_TEST.MAX_CANDIDATES, topCount)
					);
					
					// 返回延迟最低的几个候选
					return validResults.slice(0, candidateCount);
				},
				
				// 精测阶段 - 简化版
				detailedTest: function(candidates) {
					const self = this;
					
					// 测试所有候选项
					const testPromises = candidates.map(candidate => {
						return self.multiTest(
							candidate.url, 
							CONFIG.SPEED_TEST.TESTS_PER_ROUND, 
							CONFIG.SPEED_TEST.FINAL_TIMEOUT,
							candidate.name
						).then(result => {
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
				
				// 完整测速流程
				run: function() {
					const self = this;
					
					return new Promise(function(resolve, reject) {
						// 1. 初筛测试
						self.preliminaryTest()
							.then(prelimResults => {
								// 更新初筛结果到UI
								prelimResults.forEach(result => {
									Utils.updateLatencyDisplay(result.idx, result.latency);
								});
								
								// 2. 获取候选URL
								const candidates = self.getCandidates(prelimResults);
								
								// 预加载初筛最快的URL
								if (candidates.length > 0) {
									Utils.preloadUrls([], candidates[0].url);
								}
								
								// 3. 精测阶段
								return self.detailedTest(candidates);
							})
							.then(finalResults => {
								// 找出最快的URL
								const validResults = finalResults.filter(r => typeof r.latency === 'number');
								
								if (validResults.length === 0) {
									throw new Error('精测未找到可用节点');
								}
								
								// 使用reduce找出最快的结果
								const fastest = validResults.reduce(
									(prev, curr) => prev.latency < curr.latency ? prev : curr, 
									validResults[0]
								);
								
								// 高亮显示最快的结果
								Utils.highlightFastest(fastest.name);
								
								// 预加载所有测试结果，优先使用最快的URL
								Utils.preloadUrls(validResults, fastest.url);
								
								// 如果没有手动选择，则自动跳转
								if (!Utils.hasManualSelection()) {
									setTimeout(() => {
										if (!Utils.hasManualSelection()) {
											window.location.href = fastest.url + '${path}' + '${params}';
										}
									}, CONFIG.REDIRECT_DELAY);
								}
								
								resolve(fastest);
							})
							.catch(error => {
								console.error('测速失败:', error);
								
								// 显示错误信息
								for (let index = 0; index < urls.length; index++) {
									Utils.updateLatencyDisplay(index, '测速失败', 'error');
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
							Utils.showManualSelectionNotice(parsedUrl.name);
							setTimeout(() => {
								window.location.href = parsedUrl.url + '${path}' + '${params}';
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
				UI.init();
				SpeedTest.run().catch(error => console.error('应用启动失败:', error));
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
 * 主应用模块 - 处理请求和响应
 * Cloudflare Worker 入口，负责路由分发、配置初始化、异常处理
 */
export default {
	/**
	 * 处理请求的主函数
	 * @param {Request} request - HTTP请求对象
	 * @param {Object} env - 环境变量对象
	 * @returns {Response} HTTP响应对象
	 * 主流程：特殊路径处理 -> 配置初始化 -> URL获取 -> 页面生成 -> 响应输出
	 */
	async fetch(request, env) {
		try {
			// 请求开始计时
			const requestStart = Date.now();
			LoggerModule.debug(`处理请求: ${request.url}`);
			
			const url = new URL(request.url);
			const path = url.pathname;
			const params = url.search;
			
			// 处理特殊路径请求，如ads.txt和favicon.ico
			if (path.toLowerCase() === '/ads.txt') {
				LoggerModule.debug('返回 ads.txt');
				return new Response(env.ADS || '', {
					headers: { 
						'content-type': 'text/plain;charset=UTF-8',
						'Cache-Control': 'public, max-age=86400', // 24小时缓存
						'Access-Control-Allow-Origin': '*'
					}
				});
			} 
			
			if (path.toLowerCase() === '/favicon.ico') {
				LoggerModule.debug('返回网站图标');
				const icoUrl = env.ICO || CONFIG.SITE.ICO;
				const fallbackIco = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
				// 判断是否为 data: 协议（本地base64）
				if (icoUrl.startsWith('data:')) {
					return new Response(Buffer.from(icoUrl.split(',')[1], 'base64'), {
						headers: {
							'content-type': 'image/x-icon',
							'Cache-Control': 'public, max-age=86400',
							'Access-Control-Allow-Origin': '*'
						}
					});
				}
				// 远程 fetch
				try {
					const res = await fetch(icoUrl);
					if (res.ok && res.headers.get('content-type')?.includes('image')) {
						return new Response(res.body, {
							headers: {
								'content-type': res.headers.get('content-type') || 'image/x-icon',
								'Cache-Control': 'public, max-age=86400',
								'Access-Control-Allow-Origin': '*'
							}
						});
					}
				} catch (e) {
					LoggerModule.warn('favicon.ico fetch 失败，降级为本地base64');
				}
				// 降级为本地base64
				return new Response(Buffer.from(fallbackIco.split(',')[1], 'base64'), {
					headers: {
						'content-type': 'image/x-icon',
						'Cache-Control': 'public, max-age=86400',
						'Access-Control-Allow-Origin': '*'
					}
				});
			}
			// 配置初始化，合并环境变量和默认配置
			const config = ConfigModule.initSiteConfig(env);
			// 获取CDN URL列表
			const urls = ConfigModule.getUrlList(env);
			// 如果没有有效URL，返回错误页面
			if (!urls || urls.length === 0) {
				throw new Error('未配置任何有效的CDN链接');
			}
			// 生成HTML响应
			const html = UIModule.generateHTML({ config, urls, path, params });
			// 记录请求处理时间
			const processingTime = Date.now() - requestStart;
			LoggerModule.info(`请求处理完成，耗时: ${processingTime}ms`);
			// 返回HTML响应
			return new Response(html, {
				headers: { 
					'content-type': 'text/html;charset=UTF-8',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
					'Expires': '0',
					'X-Response-Time': `${processingTime}ms`,
					'X-Generator': `BlogCDN-Gateway/${CONFIG.SYSTEM.VERSION}`
				}
			});
		} catch (error) {
			// 处理所有未捕获的异常，返回友好错误页面
			LoggerModule.error(`服务器错误: ${error.message}`);
			return new Response(UIModule.generateErrorPage(error), { 
				status: 500,
				headers: { 
					'content-type': 'text/html;charset=UTF-8',
					'Cache-Control': 'no-store',
					'X-Error': error.message.substring(0, 100) // 截断过长错误消息
				}
			});
		}
	}
};
