/**
 * BlogCDN智能访问网关 
 * 版本: 1.1.0
 * 描述: 轻量级边缘计算和内容分发系统，支持多CDN线路智能测速和自动跳转
 * 优化: Claude AI
 */

// 统一配置模块 - 集中管理所有常量
const CONFIG = {
	// 系统核心配置
	SYSTEM: {
		VERSION: '1.1.0',  // 当前版本号
		LOG_LEVELS: {      // 日志级别定义
			DEBUG: 0,
			INFO: 1, 
			WARN: 2,
			ERROR: 3,
			NONE: 4
		},
		ACTIVE_LOG_LEVEL: 1,  // 当前激活的日志级别 (INFO)
		DEFAULT_TIMEOUT: 3000, // 默认测速超时时间(ms)
		REDIRECT_DELAY: 1000   // 重定向前展示延迟(ms)
	},
	
	// 主题和UI配置
	THEME: {
		AUTO_DARK_MODE: true,      // 自动跟随系统主题
		PREFER_COLOR_SCHEME: true, // 使用 prefers-color-scheme
		DEFAULT_THEME: 'light',    // 默认主题: light 或 dark
		
		// 主题颜色配置
		COLORS: {
			light: {
				primary: '#4fc93c',        // 主色调
				primaryHover: '#3db32a',   // 悬停色
				textPrimary: '#1a1f36',    // 主文本色
				textSecondary: '#4a5568',  // 次要文本色
				bgBody: '#f8f9fa',         // 背景色
				bgCard: 'rgba(255, 255, 255, 0.35)', // 卡片背景
				bgCardHover: 'rgba(255, 255, 255, 0.65)', // 卡片悬停背景
				borderColor: 'rgba(255, 255, 255, 0.5)', // 边框颜色
				shadowColor: 'rgba(0, 0, 0, 0.08)'      // 阴影颜色
			},
			dark: {
				primary: '#3db32a',        // 主色调
				primaryHover: '#32a01f',   // 悬停色
				textPrimary: '#f0f2f5',    // 主文本色
				textSecondary: '#cbd5e0',  // 次要文本色
				bgBody: '#121212',         // 背景色
				bgCard: 'rgba(30, 30, 30, 0.3)', // 卡片背景
				bgCardHover: 'rgba(50, 50, 50, 0.5)', // 卡片悬停背景
				borderColor: 'rgba(255, 255, 255, 0.15)', // 边框颜色
				shadowColor: 'rgba(0, 0, 0, 0.25)'      // 阴影颜色
			}
		},
		
		// 延迟显示颜色配置
		LATENCY_COLORS: {
			excellent: '#22c55e', // ≤100ms
			good: '#84cc16',      // ≤200ms
			average: '#eab308',   // ≤500ms
			slow: '#f97316',      // ≤1000ms
			verySlow: '#ef4444',  // >1000ms
			error: '#dc2626'      // 错误状态
		}
	},
	
	// 响应式设计配置
	RESPONSIVE: {
		BREAKPOINTS: {
			xs: '480px',
			sm: '640px',
			md: '768px',
			lg: '1024px',
			xl: '1280px'
		},
		BASE_FONT_SIZE: '16px',
		FLUID_TYPOGRAPHY: true,    // 是否使用流体排版
		MIN_VIEWPORT: '320px',     // 最小视口宽度
		MAX_VIEWPORT: '1920px',    // 最大视口宽度
		TOUCH_TARGET_SIZE: '44px', // 触摸目标最小尺寸
		TITLE_SIZE_FACTOR: 1.15    // 标题放大因子
	},
	
	// 测速策略配置
	SPEED_TEST: {
		ROUNDS: 2,                 // 测速轮数
		PRELIMINARY_TIMEOUT: 2000, // 初筛阶段超时时间
		FINAL_TIMEOUT: 3000,       // 精测阶段超时时间
		TOP_PERCENTAGE: 0.4,       // 初筛后保留的比例 (40%)
		MIN_CANDIDATES: 2,         // 至少保留的候选数量
		MAX_CANDIDATES: 3,         // 最多保留的候选数量
		TESTS_PER_ROUND: 3,        // 每轮每个URL测试次数
		DELAY_BETWEEN_TESTS: 100   // 测试间隔时间(ms)
	},
	
	// 默认博客 CDN 链接列表
	DEFAULT_URLS: [
		'https://blog.115694.xyz#Cloudflare CDN',
		'https://fastly.blog.115694.xyz#Fastly CDN',
		'https://gcore.blog.115694.xyz#Gcore CDN',
		'https://vercel.blog.115694.xyz#Vercel CDN',
		'https://rin-blog-f0y.pages.dev#备用地址1',
		'https://rin-blog-weld.vercel.app#备用地址2'
	],

	// 默认站点配置
	SITE: {
		ADS: '',
		ICO: 'https://image.115694.xyz/img_erha.png',
		PNG: 'https://img.115694.xyz/img_tx1.jpg',
		BEIAN: `<a href='https://icp.gov.moe/'>萌ICP备-20070707号</a>`,
		TITLE: 'BlogCDN 智能访问网关',
		NAME: 'Code9527 Blog',
		IMG: [
			'https://image.115694.xyz/img0.jpg',
			'https://image.115694.xyz/img1.jpg',
			'https://image.115694.xyz/img3.jpg'
		]
	}
};

/**
 * 日志模块 - 处理所有日志相关功能
 */
const LoggerModule = {
	// 日志级别定义
	LEVELS: CONFIG.SYSTEM.LOG_LEVELS,
	
	/**
	 * 记录日志消息
	 * @param {string} message - 日志消息
	 * @param {number} level - 日志级别
	 */
	log: (message, level = LoggerModule.LEVELS.INFO) => {
		if (level >= CONFIG.SYSTEM.ACTIVE_LOG_LEVEL) {
			const prefix = ['[DEBUG]', '[INFO]', '[WARN]', '[ERROR]'][level];
			console.log(`${prefix} ${message}`);
		}
	},
	
	/**
	 * 记录debug级别日志
	 * @param {string} message - 日志消息 
	 */
	debug: (message) => LoggerModule.log(message, LoggerModule.LEVELS.DEBUG),
	
	/**
	 * 记录info级别日志
	 * @param {string} message - 日志消息
	 */
	info: (message) => LoggerModule.log(message, LoggerModule.LEVELS.INFO),
	
	/**
	 * 记录warn级别日志
	 * @param {string} message - 日志消息
	 */
	warn: (message) => LoggerModule.log(message, LoggerModule.LEVELS.WARN),
	
	/**
	 * 记录error级别日志
	 * @param {string} message - 日志消息
	 */
	error: (message) => LoggerModule.log(message, LoggerModule.LEVELS.ERROR)
};

/**
 * 配置处理模块 - 处理配置解析和验证
 */
const ConfigModule = {
	/**
	 * 处理环境变量字符串为数组
	 * @param {string} envString - 环境变量字符串
	 * @return {string[]} 处理后的数组
	 */
	parseEnvString: (envString) => {
		if (!envString) {
			LoggerModule.debug('环境变量为空');
			return [];
		}
		
		try {
			// 将制表符、引号和换行符替换为逗号，然后将连续的逗号替换为单个逗号
			const normalizedStr = envString
				.replace(/[	|"'\r\n]+/g, ',')
				.replace(/,+/g, ',')
				.replace(/^,|,$/g, ''); // 删除开头和结尾的逗号
			
			const result = normalizedStr ? normalizedStr.split(',') : [];
			LoggerModule.debug(`解析环境变量: ${result.length} 项`);
			return result;
		} catch (error) {
			LoggerModule.error(`解析环境变量错误: ${error.message}`);
			return [];
		}
	},

	/**
	 * 验证配置有效性
	 * @param {Object} config - 配置对象
	 * @return {boolean} 配置是否有效
	 */
	validateConfig: (config) => {
		const requiredFields = ['NAME', 'TITLE', 'PNG', 'ICO'];
		const missingFields = requiredFields.filter(field => !config[field]);
		
		if (missingFields.length > 0) {
			LoggerModule.warn(`配置缺少必要字段: ${missingFields.join(', ')}`);
			return false;
		}
		
		return true;
	},
	
	/**
	 * 初始化站点配置
	 * @param {Object} env - 环境变量对象
	 * @return {Object} 处理后的配置
	 */
	initSiteConfig: (env) => {
		// 从默认配置复制
		const config = { ...CONFIG.SITE };
		
		// 环境变量覆盖
		Object.keys(CONFIG.SITE).forEach(key => {
			if (env[key]) config[key] = env[key];
		});
		
		// 验证配置
		ConfigModule.validateConfig(config);
		
		return config;
	},
	
	/**
	 * 获取URL列表
	 * @param {Object} env - 环境变量对象
	 * @return {string[]} URL列表
	 */
	getUrlList: (env) => {
		// 默认使用预设的URL列表
		let urls = [...CONFIG.DEFAULT_URLS];
		
		// 如果环境变量中有URL配置，优先使用
		if (env.URL) {
			urls = ConfigModule.parseEnvString(env.URL);
			LoggerModule.info(`从环境变量加载了 ${urls.length} 个URL`);
		}
		
		// 至少需要一个URL才能工作
		if (urls.length === 0) {
			LoggerModule.warn('没有配置URL，使用默认列表');
			urls = [...CONFIG.DEFAULT_URLS];
		}
		
		return urls;
	},
	
	/**
	 * 处理背景图片配置
	 * @param {Object} config - 配置对象
	 * @param {Object} env - 环境变量对象
	 * @return {Object} 处理后的配置对象
	 */
	processBackgroundImage: (config, env) => {
		// 检查环境变量中是否有IMG配置
		if (env.IMG) {
			const images = ConfigModule.parseEnvString(env.IMG);
			if (images.length > 0) {
				// 从环境变量中随机选择一张图片
				config.IMG = images[Math.floor(Math.random() * images.length)];
				LoggerModule.debug(`从环境变量随机选择背景图片: ${config.IMG}`);
			}
		} else if (Array.isArray(config.IMG) && config.IMG.length > 0) {
			// 从默认配置数组中随机选择一张图片
			const originalImages = [...config.IMG]; // 保存原始数组
			config.IMG = originalImages[Math.floor(Math.random() * originalImages.length)];
			LoggerModule.debug(`从默认配置随机选择背景图片: ${config.IMG}`);
		}
		
		// 确保IMG是字符串而非数组
		if (Array.isArray(config.IMG)) {
			// 如果配置错误导致IMG仍然是数组，默认使用第一张
			config.IMG = config.IMG[0];
			LoggerModule.warn('背景图片配置异常，使用第一张图片');
		}
		
		return config;
	}
};

/**
 * UI模块 - 负责HTML生成和UI相关处理
 */
const UIModule = {
	/**
	 * 生成HTML页面
	 * @param {Object} config - 配置对象
	 * @param {string[]} urls - URL列表
	 * @param {string} path - 当前路径
	 * @param {string} params - URL参数
	 * @return {string} HTML字符串
	 */
	generateHTML: ({ config, urls, path, params }) => {
		const { NAME, TITLE, PNG, BEIAN, IMG } = config;
		
		// 将图片URL转换为可用于preload的格式
		const preloadUrls = urls.map(url => url.split('#')[0]);
		
		// 主题色获取
		const lightThemeColor = CONFIG.THEME.COLORS.light.primary;
		const darkThemeColor = CONFIG.THEME.COLORS.dark.primary;
		
		// 生成HTML内容
		return `
		<!DOCTYPE html>
		<html lang="zh-CN">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
			<meta name="description" content="${TITLE} - 自动选择最快的博客镜像站点">
			<meta name="theme-color" content="${lightThemeColor}" media="(prefers-color-scheme: light)">
			<meta name="theme-color" content="${darkThemeColor}" media="(prefers-color-scheme: dark)">
			<meta name="version" content="${CONFIG.SYSTEM.VERSION}">
			<meta name="robots" content="index, follow">
			<meta name="color-scheme" content="light dark">
			<title>${NAME} - ${TITLE}</title>
			
			<!-- 性能优化: 资源预加载 -->
			<link rel="preload" as="image" href="${PNG}" fetchpriority="high">
			<link rel="preload" as="image" href="${IMG}" fetchpriority="high">
			<link rel="icon" href="${config.ICO}">
			
			<!-- DNS预解析和预连接 -->
			${preloadUrls.map(url => {
				const domain = new URL(url).hostname;
				return `<link rel="dns-prefetch" href="${url}">
			<link rel="preconnect" href="${url}" crossorigin>`;
			}).join('\n			')}
			
			<style>
				/* 全局变量定义 - 亮色主题 */
				:root {
					/* 基础字体和尺寸 */
					--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
					--max-width: 480px;
					--container-padding: 2rem;
					--radius-lg: 28px;
					--radius-md: 16px;
					--radius-sm: 8px;
					--radius-full: 9999px;
					--shadow-sm: 0 10px 40px rgba(0, 0, 0, 0.08);
					--shadow-md: 0 15px 45px rgba(0, 0, 0, 0.18);
					--transition: all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
					--safe-area-inset-top: env(safe-area-inset-top, 0px);
					--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
					--safe-area-inset-left: env(safe-area-inset-left, 0px);
					--safe-area-inset-right: env(safe-area-inset-right, 0px);
					--touch-target: ${CONFIG.RESPONSIVE.TOUCH_TARGET_SIZE};
					--title-factor: ${CONFIG.RESPONSIVE.TITLE_SIZE_FACTOR};
					--logo-glow: rgba(var(--primary-color-rgb, 107, 223, 143), 0.25);
					--card-bevel: 0 1px 0 rgba(255, 255, 255, 0.25) inset, 0 -1px 0 rgba(0, 0, 0, 0.05) inset;
					--card-inner-border: linear-gradient(135deg, 
						rgba(255, 255, 255, 0.35) 0%, 
						rgba(255, 255, 255, 0.1) 50%,
						rgba(255, 255, 255, 0.05) 100%);
					
					/* 亮色主题颜色 */
					--primary-color: ${lightThemeColor};
					--primary-hover: #3daf2e;
					--text-primary: #1a1f36;
					--text-secondary: #4a5568;
					--bg-body: #f8f9fa;
					--bg-card: rgba(255, 255, 255, 0.35);
					--bg-card-list: rgba(255, 255, 255, 0.45);
					--bg-card-hover: rgba(255, 255, 255, 0.65);
					--border-color: rgba(255, 255, 255, 0.5);
					--shadow-color: rgba(0, 0, 0, 0.08);
					--blur-strength: 12px;
					--latency-excellent: #22c55e;
					--latency-good: #84cc16;
					--latency-average: #eab308;
					--latency-slow: #f97316;
					--latency-very-slow: #ef4444;
					
					/* 响应式设计 */
					--font-size-base: ${CONFIG.RESPONSIVE.BASE_FONT_SIZE};
					--container-width: min(var(--max-width), 92vw);
					--logo-size: 180px; /* 减小默认logo尺寸 */
					--logo-size-sm: 140px;
					--logo-size-xs: 120px;
					--header-size: calc(32px * var(--title-factor));
					--header-size-sm: calc(28px * var(--title-factor));
					--header-size-xs: calc(24px * var(--title-factor));
					
					/* 计算流体排版大小 */
					--fluid-min-width: ${CONFIG.RESPONSIVE.MIN_VIEWPORT};
					--fluid-max-width: ${CONFIG.RESPONSIVE.MAX_VIEWPORT};
					--fluid-multiplier: 1;
					--fluid-screen: 100vw;
					--fluid-bp: calc(
						(var(--fluid-screen) - var(--fluid-min-width)) / 
						(var(--fluid-max-width) - var(--fluid-min-width))
					);

					/* List item dynamic sizing variables */
					--li-padding-v: 14px; /* 减小默认内边距 */
					--li-padding-h: 20px;
					--li-margin-bottom: 12px; /* 减小默认间距 */
					--li-font-size: 16px;
					--li-line-height: 1.7;
					--li-latency-font-size: 16px;
				}
				
				/* 暗色主题 */
				@media (prefers-color-scheme: dark) {
					:root {
						--primary-color: ${darkThemeColor};
						--primary-hover: #32a01f;
						--text-primary: #f0f2f5;
						--text-secondary: #cbd5e0;
						--bg-body: #121212;
						--bg-card: rgba(30, 30, 30, 0.3);
						--bg-card-hover: rgba(50, 50, 50, 0.5);
						--bg-card-list: rgba(30, 30, 30, 0.4);
						--border-color: rgba(255, 255, 255, 0.15);
						--shadow-color: rgba(0, 0, 0, 0.25);
						--blur-strength: 16px;
					}
				}
				
				/* 流体排版函数 */
				@supports (font-size: clamp(1rem, 1vw, 1rem)) {
					:root {
						--fluid-font-multiplier: var(--fluid-multiplier) * 1rem;
						--font-size-base: clamp(
							calc(0.9 * var(--fluid-font-multiplier)),
							calc(var(--fluid-bp) * var(--fluid-multiplier) * 0.7rem + 0.8rem),
							calc(1.1 * var(--fluid-font-multiplier))
						);
					}
				}
				
				/* 重置样式 */
				*, *::before, *::after {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}
				
				html, body {
					height: 100%;
					overflow: hidden; /* 禁止页面滚动 */
				}
				
				body {
					font-family: var(--font-sans);
					font-size: var(--font-size-base);
					line-height: 1.6;
					color: var(--text-primary);
					background-color: var(--bg-body);
					background-image: url('${IMG}');
					background-size: cover;
					background-position: center;
					background-attachment: fixed;
					min-height: 100vh;
					display: flex;
					justify-content: center;
					align-items: center;
					padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) 
							env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
					
					/* 针对移动设备优化 */
					-webkit-tap-highlight-color: transparent;
					-webkit-touch-callout: none;
					text-size-adjust: 100%;
					overflow-x: hidden;
				}
				
				/* 针对移动设备优化背景图片 */
				@media (max-width: ${CONFIG.RESPONSIVE.BREAKPOINTS.md}) {
					body {
						background-size: cover;
						/* 移动设备上的背景位置优化，避免重要部分被裁剪 */
						background-position: center center;
						/* iOS上修复背景图fixed问题 */
						background-attachment: scroll;
					}
				}
				
				/* iOS刘海屏适配 */
				@supports (padding-top: env(safe-area-inset-top)) {
					body {
						padding-top: max(10px, var(--safe-area-inset-top));
						padding-bottom: max(10px, var(--safe-area-inset-bottom));
						padding-left: var(--safe-area-inset-left);
						padding-right: var(--safe-area-inset-right);
					}
					
					.container {
						padding-bottom: calc(var(--container-padding) + var(--safe-area-inset-bottom));
					}
				}

				/* 容器 */
				.container {
					background: var(--bg-card);
					backdrop-filter: blur(var(--blur-strength));
					-webkit-backdrop-filter: blur(var(--blur-strength));
					border-radius: var(--radius-lg);
					padding: var(--container-padding);
					width: var(--container-width);
					box-shadow: var(--shadow-sm), var(--card-bevel), 0 0 30px rgba(var(--primary-color-rgb, 107, 223, 143), 0.08);
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: space-between;
					transition: var(--transition);
					border: 1px solid var(--border-color);
					position: relative;
					z-index: 1;
					margin: 20px 0;
					height: auto;
					max-height: 90vh;
					overflow: hidden;
				}
				
				/* 容器加载状态 */
				.container.loading {
					opacity: 0.95;
				}
				
				.container.loading .list-area {
					min-height: 100px;
					display: flex;
					justify-content: center;
					align-items: center;
				}
				
				/* 容器边缘光效 */
				.container::before {
					content: '';
					position: absolute;
					top: -1px;
					left: -1px;
					right: -1px;
					bottom: -1px;
					background: var(--card-inner-border);
					border-radius: var(--radius-lg);
					z-index: -1;
					opacity: 0.6;
					pointer-events: none;
				}
				
				/* 顶部区域 - 固定高度 */
				.header-area {
					width: 100%;
					display: flex;
					flex-direction: column;
					align-items: center;
					padding-bottom: 5px;
					flex-shrink: 0; /* 不允许收缩 */
				}
				
				/* 列表区域 - 自适应无滚动 */
				.list-area {
					width: 100%;
					overflow-y: visible; /* 改为可见，不滚动 */
					flex-grow: 0; /* 不再自动扩展填充 */
					flex-shrink: 0; /* 不允许收缩 */
					margin: 5px 0;
				}
				
				/* 移除滚动条相关样式 */
				/* .list-area::-webkit-scrollbar {
					width: 4px;
				} */
				
				/* .list-area::-webkit-scrollbar-track {
					background: rgba(0, 0, 0, 0.05);
					border-radius: 10px;
				} */
				
				/* .list-area::-webkit-scrollbar-thumb {
					background: var(--primary-color);
					border-radius: 10px;
					opacity: 0.7;
				} */
				
				/* 超紧凑模式 - 更小的尺寸以适应更多列表项 */
				.list-super-compact {
					--li-padding-v: 5px;
					--li-padding-h: 8px;
					--li-margin-bottom: 4px;
					--li-font-size: 12px;
					--li-line-height: 1.4;
					--li-latency-font-size: 12px;
				}
				
				/* 底部区域 - 固定高度 */
				.footer-area {
					width: 100%;
					padding-top: 5px;
					flex-shrink: 0; /* 不允许收缩 */
					margin-top: auto; /* 推到底部 */
				}
				
				/* 触摸设备优化 */
				@media (hover: none) and (pointer: coarse) {
				.container:hover {
						transform: none;
						box-shadow: var(--shadow-sm);
					}
					
					ul li:hover {
						transform: none;
						box-shadow: none;
					}
					
					.logo:hover {
						transform: none;
					}
					
					/* 增大触摸目标 */
					ul li {
						min-height: var(--touch-target);
						padding: 15px 20px;
						position: relative;
						padding-right: 40px; /* 为选择指示器留出空间 */
					}
					
					/* 减少触摸设备上的过渡效果 */
					.container, ul li, .logo {
						transition: none;
					}
					
					/* 移动设备上的选择指示器调整 */
					.select-indicator {
						right: 15px;
						opacity: 0.9;
					}
					
					.select-indicator svg {
						width: 16px;
						height: 16px;
					}
					
					/* 触摸反馈 */
					ul li:active {
						background-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.15);
						border-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.4);
					}
					
					ul li:active .select-indicator {
						opacity: 1;
						transform: translateY(-50%) translateX(-3px);
					}
					
					/* 调整选择提示 */
					.selection-hint {
						font-size: 13px;
						padding: 10px;
						margin-bottom: 8px;
					}
					
					/* 移动设备上手动选择通知的样式调整 */
					.manual-selection-notice {
						font-size: 14px;
						padding: 8px;
						margin: 8px 0;
					}
				}
				
				/* 媒体查询：小屏幕设备 */
				@media (max-width: ${CONFIG.RESPONSIVE.BREAKPOINTS.sm}) {
					:root {
						--container-padding: 1.5rem;
						--logo-size: var(--logo-size-sm);
						--header-size: var(--header-size-sm);
					}
					
					.container {
						min-height: 520px;
						margin: 10px 0;
					}
					
					h1 {
						margin-bottom: 25px;
					}
					
					ul li {
						padding: 12px 15px;
						margin-bottom: 10px;
						font-size: 15px;
					}
					
					.beian-info {
						margin-top: 1.2rem;
						font-size: 12px;
					}
					
					.github-corner svg {
						width: 60px;
						height: 60px;
					}
				}
				
				/* 媒体查询：超窄屏幕设备 */
				@media (max-width: ${CONFIG.RESPONSIVE.BREAKPOINTS.xs}) {
					:root {
						--container-padding: 1rem;
						--logo-size: var(--logo-size-xs);
						--header-size: var(--header-size-xs);
					}
					
					.container {
						min-height: auto;
						border-radius: 20px;
						margin: 8px 0;
					}
					
					.logo-container { margin-bottom: 0.8rem; }
					.logo { border-width: 6px; }
					h1 { margin-bottom: 15px; }
					.description { padding: 0 10px; }
					
					ul li {
						padding: 8px 12px;
						margin-bottom: 6px;
						font-size: 14px;
					}
					
					.progress-container {
						padding: 0 10px;
						margin-bottom: 12px;
					}
					
					.github-corner svg {
						width: 50px;
						height: 50px;
					}
					
					.testing, 
					ul li span:not(.testing):not(.fastest-badge) {
						padding: 2px 8px;
						font-size: 13px;
					}
					
					.fastest-badge {
						font-size: 11px;
						padding: 2px 8px 2px 6px;
					}
				}
				
				/* 低高度屏幕适配 */
				@media (max-height: 768px) {
					:root {
						--logo-size: 150px;
						--li-padding-v: 12px;
						--li-margin-bottom: 10px;
					}
					
					.logo-container {
						margin-bottom: 0.6rem;
						margin-top: 0.3rem;
					}
					
					h1 {
						font-size: calc(var(--header-size) * 0.9);
						margin-bottom: 15px;
					}
					
					.selection-hint {
						margin-bottom: 8px;
						padding: 6px;
					}
					
					.manual-selection-notice {
						padding: 8px;
						margin: 8px 0;
					}
				}
				
				/* 超低高度屏幕适配 */
				@media (max-height: 640px) {
					:root {
						--logo-size: 120px;
						--container-padding: 1.2rem 1.5rem;
						--li-padding-v: 8px;
						--li-margin-bottom: 6px;
					}
					
					.container {
						margin: 8px 0;
					}
					
					.logo-container {
						margin-bottom: 0.4rem;
						margin-top: 0.2rem;
					}
					
					.logo {
						border-width: 6px;
					}
					
					h1 {
						font-size: calc(var(--header-size) * 0.8);
						margin-bottom: 10px;
					}
					
					.selection-hint {
						padding: 4px;
						margin-bottom: 6px;
						font-size: 13px;
					}
					
					.progress-container {
						margin-bottom: 8px;
					}
					
					.beian-info {
						padding: 3px 0;
						font-size: 12px;
					}
					
					.progress {
						height: 6px;
						margin-bottom: 6px;
					}
					
					.progress-info {
						font-size: 11px;
					}
				}
				
				/* 极低高度屏幕适配 */
				@media (max-height: 500px) {
					:root {
						--logo-size: 90px;
						--container-padding: 0.8rem 1.2rem;
						--li-padding-v: 5px;
						--li-margin-bottom: 4px;
					}
					
					.container {
						margin: 5px 0;
					}
					
					.logo-container {
						margin-bottom: 0.3rem;
						margin-top: 0.2rem;
					}
					
					.logo {
						border-width: 5px;
					}
					
					h1 {
						font-size: calc(var(--header-size) * 0.7);
						margin-bottom: 8px;
					}
					
					.selection-hint {
						padding: 3px;
						margin-bottom: 4px;
						font-size: 12px;
					}
					
					.manual-selection-notice {
						padding: 4px;
						margin: 4px 0;
						font-size: 12px;
					}
					
					ul li {
						padding: 4px 10px;
						margin-bottom: 4px;
						font-size: 13px;
					}
					
					.loading-indicator {
						margin: 0.5rem 0;
						height: 30px;
					}
					
					.progress {
						height: 5px;
						margin-bottom: 4px;
					}
				}
				
				/* Logo部分 */
				.logo-container {
					position: relative;
					width: var(--logo-size);
					height: var(--logo-size);
					margin-bottom: 0.8rem;
					display: flex;
					justify-content: center;
					align-items: center;
					z-index: 1;
					margin-top: 0.5rem;
				}
				
				.logo-container::before {
					content: '';
					position: absolute;
					width: 120%;
					height: 120%;
					border-radius: 50%;
					background: radial-gradient(circle, var(--logo-glow) 0%, rgba(255,255,255,0) 70%);
					opacity: 0.8;
					z-index: -1;
					animation: pulse-glow 3.5s infinite ease-in-out;
					filter: blur(10px);
				}

				.logo {
					width: 100%;
					height: 100%;
					border-radius: var(--radius-full);
					border: 10px solid rgba(255, 255, 255, 0.2);
					box-shadow: 0 12px 30px var(--shadow-color), 0 0 20px rgba(var(--primary-color-rgb, 107, 223, 143), 0.2);
					animation: pulse 2.5s infinite;
					object-fit: cover;
					will-change: transform, box-shadow;
					transition: transform 0.3s ease;
				}
				
				/* 动画定义 - 集中所有动画关键帧 */
				@keyframes pulse-glow {
					0% { transform: scale(1); opacity: 0.8; }
					50% { transform: scale(1.08); opacity: 0.65; }
					100% { transform: scale(1); opacity: 0.8; }
				}
				
				@keyframes pulse {
					0% { box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 107, 223, 143), 0.5); }
					70% { box-shadow: 0 0 0 25px rgba(var(--primary-color-rgb, 107, 223, 143), 0); }
					100% { box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 107, 223, 143), 0); }
				}

				@keyframes blink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}

				@keyframes float {
					0%, 100% { transform: translateY(0); }
					50% { transform: translateY(-5px); }
				}

				@keyframes subtleShift {
					0%, 100% { background-position: 0% 0%; }
					25% { background-position: 10% 5%; }
					50% { background-position: 5% 10%; }
					75% { background-position: -5% 5%; }
				}
				
				@keyframes octocat-wave {
					0%, 100% { transform: rotate(0); }
					20%, 60% { transform: rotate(-25deg); }
					40%, 80% { transform: rotate(10deg); }
				}
				
				@keyframes loading {
					0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
					40% { transform: scale(1); opacity: 1; box-shadow: 0 0 10px rgba(var(--primary-color-rgb, 107, 223, 143), 0.6); }
				}
				
				@keyframes progress-animation {
					0% { background-position: 0 0; }
					100% { background-position: 60px 0; }
				}
				
				@keyframes badge-pulse {
					0%, 100% { box-shadow: 0 2px 10px rgba(var(--primary-color-rgb, 107, 223, 143), 0.5); }
					50% { box-shadow: 0 4px 14px rgba(var(--primary-color-rgb, 107, 223, 143), 0.8); }
				}

				/* 闪烁动画 */
				@keyframes blink {
					0% { opacity: 1; }
					50% { opacity: 0.6; }
					100% { opacity: 1; }
				}

				/* 轻微浮动效果 */
				@keyframes float {
					0% { transform: translateY(0); }
					50% { transform: translateY(-5px); }
					100% { transform: translateY(0); }
				}

				/* 背景微妙移动效果 */
				@keyframes subtleShift {
					0% { background-position: 0% 0%; }
					25% { background-position: 10% 5%; }
					50% { background-position: 5% 10%; }
					75% { background-position: -5% 5%; }
					100% { background-position: 0% 0%; }
				}

				/* 标题样式 */
				h1 {
					color: var(--text-primary);
					font-size: var(--header-size);
					font-weight: 700;
					text-align: center;
					margin: 0 0 20px 0;
					letter-spacing: -0.01em;
					text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				}

				h1::after {
					content: '';
					display: none;
				}

				/* 列表容器 */
				.description {
					width: 100%;
					padding: 0 15px;
					margin-bottom: 1rem;
					font-weight: 600;
				}

				ul {
					list-style: none;
					width: 100%;
				}

				/* 列表项样式 */
				ul li {
					color: var(--text-primary);
					font-size: var(--li-font-size);
					line-height: var(--li-line-height);
					padding: var(--li-padding-v) var(--li-padding-h);
					margin-bottom: var(--li-margin-bottom);
					background: var(--bg-card-list);
					border-radius: var(--radius-md);
					display: flex;
					justify-content: space-between;
					align-items: center;
					transition: var(--transition);
					border: 1px solid var(--border-color);
					position: relative;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04), var(--card-bevel);
					overflow: hidden;
					cursor: pointer;
					-webkit-tap-highlight-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.2);
					font-family: var(--font-sans);
					backdrop-filter: blur(4px);
					-webkit-backdrop-filter: blur(4px);
				}

				ul li:hover {
					background: var(--bg-card-hover);
					transform: translateX(10px);
					box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05), var(--card-bevel), 0 0 20px rgba(var(--primary-color-rgb, 107, 223, 143), 0.15);
					border-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.3);
				}
				
				ul li:active {
					transform: translateX(6px) scale(0.98);
					transition: transform 0.12s ease;
				}

				/* 为列表项添加微妙的渐变边框效果 */
				ul li::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					border-radius: var(--radius-md);
					padding: 1px;
					background: linear-gradient(135deg, 
						rgba(255, 255, 255, 0.6) 0%, 
						rgba(255, 255, 255, 0.2) 50%,
						rgba(var(--primary-color-rgb, 107, 223, 143), 0.1) 100%);
					-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
					-webkit-mask-composite: xor;
					mask-composite: exclude;
					pointer-events: none;
				}

				/* 夜间模式下的边框调整 */
				@media (prefers-color-scheme: dark) {
					ul li::before {
						background: linear-gradient(135deg, 
							rgba(255, 255, 255, 0.4) 0%,
							rgba(255, 255, 255, 0.1) 50%, 
							rgba(var(--primary-color-rgb, 107, 223, 143), 0.15) 100%);
					}
				}

				/* 加载中的测速显示效果 */
				.testing {
					display: inline-block;
					position: relative;
					animation: blink 1.2s infinite;
					font-weight: 500;
					padding: 3px 10px;
					background-color: transparent;
					border-radius: 20px;
					color: var(--text-secondary);
					font-size: var(--li-latency-font-size);
					line-height: var(--li-line-height);
					font-family: var(--font-sans);
				}

				/* 列表项内延迟显示的样式 */
				ul li span:not(.testing):not(.fastest-badge) {
					font-weight: 600;
					padding: 3px 10px;
					border-radius: 20px;
					transition: none;
					background: rgba(var(--primary-color-rgb, 107, 223, 143), 0.05);
					font-family: var(--font-sans);
					letter-spacing: -0.02em;
					box-shadow: none;
					font-size: var(--li-latency-font-size);
					line-height: var(--li-line-height);
					text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
				}
				
				@media (prefers-color-scheme: dark) {
					ul li span:not(.testing):not(.fastest-badge) {
						background-color: rgba(255,255,255,0.08);
						text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
					}
				}

				/* 网站信息 */
				.beian-info {
					margin-top: 0; /* 移除上边距，因为父容器已有padding */
					text-align: center;
					font-size: 13px;
					color: var(--text-secondary);
					padding: 5px 0;
				}

				.beian-info a {
					color: var(--primary-color);
					text-decoration: none;
					font-weight: 500;
					transition: var(--transition);
					position: relative;
					padding: 0 2px;
				}

				.beian-info a::after {
					content: '';
					position: absolute;
					width: 100%;
					height: 1px;
					background: var(--primary-color);
					bottom: -1px;
					left: 0;
					transform: scaleX(0);
					transform-origin: right;
					transition: transform 0.3s ease;
					opacity: 0.7;
				}

				.beian-info a:hover {
					opacity: 0.9;
				}

				.beian-info a:hover::after {
					transform: scaleX(1);
					transform-origin: left;
				}
				
				/* 版本信息 */
				.version-info {
					position: absolute;
					bottom: 10px;
					right: 10px;
					font-size: 12px;
					color: var(--text-secondary);
					opacity: 0.7;
				}

				/* 计数器样式 */
				#visitCount, #liveuser {
					font-weight: 600;
					color: var(--text-secondary);
					margin: 0 4px;
				}

				/* GitHub角标 */
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
					fill: var(--primary-color);
					color: var(--bg-card);
					width: 80px;
					height: 80px;
					transition: var(--transition);
					will-change: fill;
				}
				
				.github-corner:hover svg {
					fill: var(--primary-hover);
				}
				
				.github-corner .octo-arm {
					transform-origin: 130px 106px;
				}
				
				@keyframes octocat-wave {
					0%, 100% { transform: rotate(0) }
					20%, 60% { transform: rotate(-25deg) }
					40%, 80% { transform: rotate(10deg) }
				}
				
				.github-corner:hover .octo-arm {
					animation: octocat-wave 560ms ease-in-out;
				}
				
				/* 小屏幕上Github角标的特殊样式 */
				@media (max-width: ${CONFIG.RESPONSIVE.BREAKPOINTS.sm}) {
					.github-corner svg {
						width: 60px;
						height: 60px;
					}
					.github-corner:hover .octo-arm {
						animation: none;
					}
					.github-corner .octo-arm {
						animation: octocat-wave 560ms ease-in-out;
					}
				}
				
				/* 加载状态指示器 */
				.loading-indicator {
					display: flex;
					justify-content: center;
					align-items: center;
					margin: 1.5rem 0;
					height: 45px;
				}
				
				.loading-indicator span {
					display: inline-block;
					width: 12px;
					height: 12px;
					margin: 0 6px;
					background-color: var(--primary-color);
					border-radius: 50%;
					opacity: 0.7;
					animation: loading 1.6s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08) both;
					transform-origin: center;
				}
				
				.loading-indicator span:nth-child(1) {
					animation-delay: -0.32s;
				}
				
				.loading-indicator span:nth-child(2) {
					animation-delay: -0.16s;
				}
				
				@keyframes loading {
					0%, 80%, 100% { 
						transform: scale(0); 
						opacity: 0.5;
					}
					40% { 
						transform: scale(1); 
						opacity: 1;
						box-shadow: 0 0 10px rgba(var(--primary-color-rgb, 107, 223, 143), 0.6);
					}
				}
				
				/* 进度条样式 */
				.progress-container {
					width: 100%;
					padding: 0 10px;
					margin-bottom: 5px;
					margin-top: 5px;
				}
				
				.progress {
					height: 8px;
					background-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.08);
					border-radius: var(--radius-full);
					overflow: hidden;
					margin-bottom: 10px;
					box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
					backdrop-filter: blur(2px);
					-webkit-backdrop-filter: blur(2px);
					padding: 1px;
				}
				
				.progress-bar {
					height: 100%;
					background-color: var(--primary-color);
					background-image: linear-gradient(
						90deg, 
						rgba(255, 255, 255, 0.3) 25%, 
						transparent 25%, 
						transparent 50%, 
						rgba(255, 255, 255, 0.3) 50%, 
						rgba(255, 255, 255, 0.3) 75%, 
						transparent 75%
					);
					background-size: 30px 30px;
					width: 0;
					transition: width 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
					animation: progress-animation 2s linear infinite;
					box-shadow: 0 0 12px rgba(var(--primary-color-rgb, 107, 223, 143), 0.5);
					border-radius: var(--radius-full);
				}
				
				@keyframes progress-animation {
					0% {
						background-position: 0 0;
					}
					100% {
						background-position: 60px 0;
					}
				}
				
				.progress-info {
					text-align: center;
					font-size: 12px;
					color: var(--text-secondary);
					margin: 2px 0 0;
					font-weight: 400;
					letter-spacing: 0.01em;
					background: none;
					padding: 0;
					border-radius: 0;
					display: block;
					text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
				}
				
				/* 最快标记 */
				.fastest-badge {
					display: inline-flex;
					align-items: center;
					background-color: var(--primary-color);
					color: white;
					font-size: 12px;
					font-weight: 600;
					padding: 4px 12px 4px 10px;
					border-radius: 14px;
					margin-left: 10px;
					box-shadow: 0 2px 10px rgba(var(--primary-color-rgb, 107, 223, 143), 0.5);
					animation: badge-pulse 1.8s infinite ease-in-out, float 3s infinite ease-in-out;
					backdrop-filter: blur(4px);
					-webkit-backdrop-filter: blur(4px);
				}
				
				.fastest-badge::before {
					content: "";
					display: inline-block;
					width: 8px;
					height: 8px;
					border-radius: 50%;
					background-color: white;
					margin-right: 5px;
					animation: blink 1.5s infinite;
				}
				
				@keyframes badge-pulse {
					0% {
						box-shadow: 0 2px 10px rgba(var(--primary-color-rgb, 107, 223, 143), 0.5);
					}
					50% {
						box-shadow: 0 4px 14px rgba(var(--primary-color-rgb, 107, 223, 143), 0.8);
					}
					100% {
						box-shadow: 0 2px 10px rgba(var(--primary-color-rgb, 107, 223, 143), 0.5);
					}
				}
				
				/* 高对比度模式适配 */
				@media (prefers-contrast: more) {
					:root {
						--primary-color: #007a3d;
						--primary-hover: #005c2e;
						--text-primary: #000000;
						--text-secondary: #333333;
						--bg-card: rgba(255, 255, 255, 0.95);
						--border-color: rgba(0, 0, 0, 0.3);
					}
					
					@media (prefers-color-scheme: dark) {
						:root {
							--primary-color: #3cda6a;
							--primary-hover: #4ceb7a;
							--text-primary: #ffffff;
							--text-secondary: #cccccc;
							--bg-card: rgba(0, 0, 0, 0.95);
							--border-color: rgba(255, 255, 255, 0.5);
						}
					}
				}
				
				/* 文本缩放适配 */
				.text-zoomed {
					--header-size: max(24px, calc(var(--header-size) * 0.85));
					--header-size-sm: max(20px, calc(var(--header-size-sm) * 0.85));
					--header-size-xs: max(18px, calc(var(--header-size-xs) * 0.85));
					font-size: calc(var(--font-size-base) * 0.95);
				}
				
				/* 触摸设备额外优化 */
				.touch-device {
					/* 增大所有可点击元素 */
					--min-touch-target: 44px;
				}
				
				/* 处理较高的设备像素比 */
				@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
					.container {
						border-width: 0.5px;
					}
					
					h1::after {
						height: 3.5px;
					}
				}
				
				/* 减少动画 (省电模式) */
				@media (prefers-reduced-motion: reduce) {
					* {
						animation-duration: 0.01ms !important;
						animation-iteration-count: 1 !important;
						transition-duration: 0.01ms !important;
						scroll-behavior: auto !important;
					}
					
					.progress-bar {
						animation: none !important;
					}
					
					.logo {
						animation: none !important;
					}
				}

				/* 列表项动态样式变量 */
				.list-compact {
					--li-padding-v: 8px;
					--li-padding-h: 12px;
					--li-margin-bottom: 6px;
					--li-font-size: 14px;
					--li-line-height: 1.5;
					--li-latency-font-size: 14px;
				}

				.list-super-compact {
					--li-padding-v: 4px;
					--li-padding-h: 8px;
					--li-margin-bottom: 3px;
					--li-font-size: 12px;
					--li-line-height: 1.3;
					--li-latency-font-size: 12px;
				}
				
				/* 隐藏元素的通用类 */
				.hidden {
					display: none !important;
				}
				
				/* 最快结果项的样式 */
				.fastest-result {
					background: rgba(var(--primary-color-rgb, 107, 223, 143), 0.15) !important;
					border-width: 2px !important;
					border-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.4) !important;
					transform: translateX(10px) !important;
					box-shadow: 0 6px 20px rgba(var(--primary-color-rgb, 107, 223, 143), 0.2), var(--card-bevel) !important;
				}
				
				/* 手动选择相关样式 */
				.selection-hint {
					text-align: center;
					font-size: 14px;
					color: var(--text-secondary);
					margin-bottom: 12px;
					font-weight: 500;
					padding: 8px;
					background-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.08);
					border-radius: var(--radius-md);
					border: 1px dashed rgba(var(--primary-color-rgb, 107, 223, 143), 0.3);
				}
				
				.manual-selection-notice {
					text-align: center;
					background-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.15);
					color: var(--primary-color);
					border-radius: var(--radius-md);
					padding: 10px;
					margin: 10px 0;
					font-weight: 600;
					font-size: 15px;
					border: 1px solid rgba(var(--primary-color-rgb, 107, 223, 143), 0.3);
					animation: pulse 2s infinite;
				}
				
				/* 点击反馈样式 */
				ul li.clicked {
					transform: scale(0.98) translateX(6px) !important;
					transition: transform 0.2s ease !important;
					background-color: rgba(var(--primary-color-rgb, 107, 223, 143), 0.2) !important;
					border-color: var(--primary-color) !important;
				}
				
				/* 选中状态 */
				ul li.clicked .select-indicator {
					opacity: 1;
				}
				
				ul li.clicked .select-indicator svg {
					transform: rotate(0deg) scale(1.2);
					fill: var(--primary-color);
				}
				
				/* 列表项指示器 */
				ul li::after {
					content: '';
					position: absolute;
					right: 12px;
					top: 50%;
					transform: translateY(-50%);
					width: 12px;
					height: 12px;
					background-color: var(--primary-color);
					border-radius: 50%;
					opacity: 0.5;
					transition: all 0.3s ease;
				}
				
				/* 选择指示器样式 */
				.select-indicator {
					position: absolute;
					right: 10px;
					top: 50%;
					transform: translateY(-50%);
					color: var(--primary-color);
					opacity: 0.7;
					transition: all 0.3s ease;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				
				.select-indicator svg {
					transform: rotate(-90deg);
					transition: transform 0.3s ease;
				}
				
				ul li:hover .select-indicator {
					opacity: 1;
					transform: translateY(-50%) translateX(-3px);
				}
				
				ul li:hover .select-indicator svg {
					transform: rotate(-90deg) scale(1.2);
				}
				
				ul li:active .select-indicator {
					transform: translateY(-50%) translateX(-5px);
				}
				
				/* 移除旧的指示点，使用箭头代替 */
				ul li::after {
					display: none;
				}
				
				ul li:hover::after {
					opacity: 0.8;
					transform: translateY(-50%) scale(1.2);
				}
				
				@media (hover: hover) {
					ul li {
						position: relative;
						padding-right: 35px;
					}
					
					ul li:hover {
						cursor: pointer;
					}
					
					ul li:hover::before {
						opacity: 0.7;
					}
				}
				
				/* 延迟等级样式类 - 合并共同属性 */
				.latency-excellent,
				.latency-good,
				.latency-average, 
				.latency-slow,
				.latency-very-slow,
				.latency-error {
					font-weight: 600;
					padding: 3px 10px;
					border-radius: 20px;
					background: rgba(var(--primary-color-rgb, 107, 223, 143), 0.05);
				}
				
				/* 各延迟等级的颜色 */
				.latency-excellent { color: var(--latency-excellent); }
				.latency-good { color: var(--latency-good); }
				.latency-average { color: var(--latency-average); }
				.latency-slow { color: var(--latency-slow); }
				.latency-very-slow { color: var(--latency-very-slow); }
				.latency-error { color: var(--latency-very-slow); }
				
				/* 媒体查询优化：合并相似查询并使用变量 */
				@media (max-width: ${CONFIG.RESPONSIVE.BREAKPOINTS.sm}) {
					:root {
						--container-padding: 1.5rem;
						--logo-size: var(--logo-size-sm);
						--header-size: var(--header-size-sm);
					}
					
					.container {
						min-height: 520px;
						margin: 10px 0;
					}
					
					h1 { margin-bottom: 25px; }
					
					ul li {
						padding: 12px 15px;
						margin-bottom: 10px;
						font-size: 15px;
					}
					
					.beian-info {
						margin-top: 1.2rem;
						font-size: 12px;
					}
					
					.github-corner svg {
						width: 60px;
						height: 60px;
					}
					
					/* 触摸设备上的额外调整 */
					.github-corner:hover .octo-arm { animation: none; }
					.github-corner .octo-arm { animation: octocat-wave 560ms ease-in-out; }
				}
				
				/* 超窄屏幕设备专用样式 */
				@media (max-width: ${CONFIG.RESPONSIVE.BREAKPOINTS.xs}) {
					:root {
						--container-padding: 1rem;
						--logo-size: var(--logo-size-xs);
						--header-size: var(--header-size-xs);
					}
					
					.container {
						min-height: 480px;
						border-radius: 20px;
					}
					
					.logo-container { margin-bottom: 1.2rem; }
					.logo { border-width: 6px; }
					h1 { margin-bottom: 20px; }
					.description { padding: 0 10px; }
					
					ul li {
						padding: 10px 12px;
						margin-bottom: 8px;
						font-size: 14px;
					}
					
					.progress-container {
						padding: 0 10px;
						margin-bottom: 16px;
					}
					
					.github-corner svg {
						width: 50px;
						height: 50px;
					}
					
					.testing, 
					ul li span:not(.testing):not(.fastest-badge) {
						padding: 2px 8px;
						font-size: 13px;
					}
					
					.fastest-badge {
						font-size: 11px;
						padding: 2px 8px 2px 6px;
					}
				}
				
				/* 低高度屏幕适配 */
				@media (max-height: 800px) {
					:root {
						--logo-size: 150px;
						--container-padding: 1.5rem;
					}
					
					.logo-container {
						margin-bottom: 0.8rem;
						margin-top: 0.3rem;
					}
					
					h1 {
						margin-bottom: 20px;
						font-size: calc(var(--header-size) * 0.9);
					}
					
					ul li {
						padding: 10px 16px;
						margin-bottom: 10px;
					}
				}
				
				/* 超低高度屏幕适配 */
				@media (max-height: 700px) {
					:root {
						--logo-size: 120px;
						--container-padding: 1.2rem;
						--li-padding-v: 8px;
						--li-margin-bottom: 8px;
					}
					
					.logo-container {
						margin-bottom: 0.5rem;
						margin-top: 0.2rem;
					}
					
					h1 {
						margin-bottom: 15px;
						font-size: calc(var(--header-size) * 0.85);
					}
					
					.selection-hint {
						padding: 5px;
						margin-bottom: 6px;
						font-size: 13px;
					}
					
					.progress-container {
						margin-bottom: 8px;
					}
					
					.beian-info {
						padding: 3px 0;
						font-size: 12px;
					}
				}
				
				/* 错误消息样式 */
				.error-message {
					color: var(--latency-very-slow);
					padding: 10px;
					margin: 10px 0;
					text-align: center;
					background-color: rgba(220, 38, 38, 0.1);
					border-radius: var(--radius-md);
					font-weight: 500;
				}
				
				/* 进度条完成状态 */
				.progress-bar.complete {
					animation: progress-animation 1.5s linear infinite, pulse 2s infinite !important;
				}
			</style>
			
			<script>
				/**
				 * 使用更现代的字体加载和优化方式
				 * @param {Function} fn - 加载字体后的回调
				 */
				const optimizeFonts = (fn = () => {}) => {
					if ("fonts" in document) {
						// 使用 Font Loading API
						Promise.all([
							document.fonts.load("1em system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif")
						]).then(() => {
							document.documentElement.classList.add("fonts-loaded");
							fn();
						}).catch(err => {
							console.error("字体加载失败:", err);
							fn();
						});
					} else {
						// 降级处理
						fn();
					}
				};
				
				// 文本缩放检测
				const detectTextZoom = () => {
					try {
						// 创建测试元素
						const testElement = document.createElement("div");
						testElement.style.cssText = "position:absolute;font-size:100px;width:0;height:0;left:-999px;visibility:hidden;";
						testElement.textContent = "ABCDEFG";
						document.body.appendChild(testElement);
						
						// 判断是否缩放
						const hasTextZoom = Math.abs(testElement.clientWidth / 100 - 1) > 0.1;
						if (hasTextZoom) {
							document.documentElement.classList.add("text-zoomed");
						}
						
						document.body.removeChild(testElement);
					} catch (error) {
						console.error("文本缩放检测失败", error);
					}
				};
				
				// 设备类型检测
				const detectTouchDevice = () => {
					if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
						document.documentElement.classList.add("touch-device");
					} else {
						document.documentElement.classList.add("no-touch");
					}
				};
				
				// 屏幕方向变化处理
				const handleOrientationChange = () => {
					try {
						const isMobile = window.innerWidth <= 768;
						const isLandscape = window.innerWidth > window.innerHeight;
						
						if (isMobile) {
							// 根据屏幕方向设置背景样式
							if (isLandscape) {
								// 横屏模式
								document.body.style.backgroundSize = 'cover';
								document.body.style.backgroundPosition = 'center center';
							} else {
								// 竖屏模式
								document.body.style.backgroundSize = 'cover';
								document.body.style.backgroundPosition = 'center center';
							}
						} else {
							// 桌面设备使用默认设置
							document.body.style.backgroundSize = '105% 105%';
							document.body.style.backgroundPosition = 'center';
						}
					} catch (error) {
						console.error('屏幕方向变化处理失败', error);
					}
				};
				
				// 计算主题色RGB值用于动画
				document.addEventListener('DOMContentLoaded', () => {
					try {
						const style = getComputedStyle(document.documentElement);
						const primaryColor = style.getPropertyValue('--primary-color').trim();
						
						// 转换十六进制颜色为RGB
						let rgb = [0, 0, 0];
						if (primaryColor.startsWith('#')) {
							const hex = primaryColor.substring(1);
							rgb = [
								parseInt(hex.substring(0, 2), 16),
								parseInt(hex.substring(2, 4), 16),
								parseInt(hex.substring(4, 6), 16)
							];
						}
						
						document.documentElement.style.setProperty(
							'--primary-color-rgb', 
							rgb[0] + ", " + rgb[1] + ", " + rgb[2]
						);
						
						// 优化移动体验
						detectTouchDevice();
						detectTextZoom();
						optimizeFonts();
						
						// 初始化处理屏幕方向
						handleOrientationChange();
						
						// 监听屏幕方向变化和窗口大小变化
						window.addEventListener('orientationchange', handleOrientationChange);
						window.addEventListener('resize', handleOrientationChange);
					} catch (error) {
						console.error('主题初始化失败', error);
					}
				});
			</script>
		</head>
		<body>
			<a href="https://github.com/Coolapk-Code9527/EdgeBlogCDN" target="_blank" class="github-corner" aria-label="View source on Github">
				<svg viewBox="0 0 250 250" aria-hidden="true">
					<path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
					<path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" class="octo-arm"></path>
					<path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
				</svg>
			</a>
			
			<!-- 主容器：使用更扁平的HTML结构 -->
			<div class="container">
				<!-- Logo和标题区 -->
				<div class="logo-container">
					<img class="logo" src="${PNG}" alt="${NAME} Logo">
				</div>
				<h1>${TITLE}</h1>
				
				<!-- 加载指示器 -->
				<div class="loading-indicator" id="loadingIndicator">
					<span></span><span></span><span></span>
				</div>
				
				<!-- 进度条容器 - 动态插入 -->
				<div id="progress-container-slot"></div>
				
				<!-- URL列表区 -->
				<ul class="description" id="urls"></ul>
				
				<!-- 页脚信息 -->
				<div class="beian-info">${BEIAN}</div>
				<div class="version-info">v${CONFIG.SYSTEM.VERSION}</div>
			</div>
			
			<!-- 主脚本 - 轻量级初始化 -->
			<script>
			// 立即执行初始UI设置
			document.addEventListener('DOMContentLoaded', () => {
				// 设置加载状态
				document.querySelector('.container')?.classList.add('loading');
				
				// 计算主题色RGB值
				const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
				if (primaryColor.startsWith('#')) {
					const hex = primaryColor.substring(1);
					const r = parseInt(hex.substring(0, 2), 16);
					const g = parseInt(hex.substring(2, 4), 16);
					const b = parseInt(hex.substring(4, 6), 16);
					document.documentElement.style.setProperty('--primary-color-rgb', r + ', ' + g + ', ' + b);
				}
				
				// 设备类型检测 - 简化为一行
				document.documentElement.classList.add('ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'touch-device' : 'no-touch');
			});
			</script>
			
			<!-- 测速脚本 - 使用defer延迟加载 -->
			<script defer>
			// 定义博客URL列表
			const urls = ${JSON.stringify(urls)};
			
			// 测速配置
			const CONFIG = {
				timeout: ${CONFIG.SYSTEM.DEFAULT_TIMEOUT},
				redirectDelay: ${CONFIG.SYSTEM.REDIRECT_DELAY},
				speedTest: ${JSON.stringify(CONFIG.SPEED_TEST)},
				latencyColors: {
					excellent: '#22c55e', // ≤100ms
					good: '#84cc16',      // ≤200ms
					average: '#eab308',   // ≤500ms
					slow: '#f97316',      // ≤1000ms
					verySlow: '#ef4444',  // >1000ms
					error: '#dc2626'      // 错误状态
				}
			};
			
			/**
			 * UI更新工具函数集合 - 合并相关UI操作
			 */
			const UI = {
				// 错误处理与日志
				showError: (message, error) => {
					console.error(\`[Error] \${message}\`, error);
					
					requestAnimationFrame(() => {
						const errorElement = document.createElement('div');
						errorElement.className = 'error-message';
						errorElement.textContent = message;
						
						const container = document.querySelector('.container');
						const urlList = document.getElementById('urls');
						if (container && urlList) {
							container.insertBefore(errorElement, urlList);
						}
					});
				},
				
				// 更新进度显示
				updateProgress: (message, progress = -1) => {
					try {
						let progressContainer = document.getElementById('progress-container');
						
						// 首次调用时创建进度条元素
						if (!progressContainer) {
							progressContainer = document.createElement('div');
							progressContainer.id = 'progress-container';
							progressContainer.className = 'progress-container';
							
							// 创建进度条HTML结构
							progressContainer.innerHTML = \`
								<div class="progress">
									<div id="progressBar" class="progress-bar" role="progressbar" 
										aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
								</div>
								<p id="progressInfo" class="progress-info">准备开始测速...</p>
							\`;
							
							// 插入到指定位置
							const slot = document.getElementById('progress-container-slot');
							if (slot) {
								slot.appendChild(progressContainer);
							}
						}
						
						// 更新进度文本和进度条
						const progressInfo = document.getElementById('progressInfo');
						const progressBar = document.getElementById('progressBar');
						
						if (progressInfo) {
							progressInfo.textContent = message;
						}
						
						if (progressBar && progress >= 0) {
							progressBar.style.width = \`\${progress}%\`;
							progressBar.setAttribute('aria-valuenow', progress);
							
							// 100%时添加完成动画
							if (progress === 100) {
								progressBar.classList.add('complete');
							}
						}
					} catch (error) {
						console.error('更新进度显示失败', error);
					}
				},
				
				// 添加样式类
				addClass: (selector, className) => {
					const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
					if (element) element.classList.add(className);
					return element;
				},
				
				// 移除样式类
				removeClass: (selector, className) => {
					const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
					if (element) element.classList.remove(className);
					return element;
				}
			};
			
			/**
			 * 错误处理与日志
			 */
			const logError = (message, error) => {
				console.error(\`[Error] \${message}\`, error);
				
				// 使用requestAnimationFrame批量更新DOM
				requestAnimationFrame(() => {
					// 向用户显示错误（可选，仅在测速失败时）
					const errorElement = document.createElement('div');
					errorElement.style.color = CONFIG.latencyColors.error;
					errorElement.style.padding = '10px';
					errorElement.style.margin = '10px 0';
					errorElement.style.textAlign = 'center';
					errorElement.textContent = message;
					
					const container = document.querySelector('.container');
					const urlList = document.getElementById('urls');
					if (container && urlList) {
						container.insertBefore(errorElement, urlList);
					}
				});
			};
			
			/**
			 * 跳转到指定的URL
			 * @param {string} url - 要跳转的URL
			 * @param {string} path - 当前路径
			 * @param {string} params - URL参数
			 */
			const navigateToUrl = (url, path, params) => {
				try {
					const redirectUrl = url + path + params;
					window.location.href = redirectUrl;
				} catch (error) {
					logError('跳转至URL失败', error);
				}
			};
			
			/**
			 * 动态生成URL列表
			 * 使用DocumentFragment减少重排和DOM更新
			 */
			const createUrlList = () => {
				try {
					const ul = document.getElementById("urls");
					ul.innerHTML = ''; // 清空列表
					
					if (!urls || urls.length === 0) {
						throw new Error('未配置有效的 URL 列表');
					}
					
					// 根据URL数量调整列表样式
					const numUrls = urls.length;
					if (numUrls >= 8) { // 超紧凑阈值
						ul.classList.add('list-super-compact');
					} else if (numUrls >= 6) { // 紧凑阈值
						ul.classList.add('list-compact');
					}
					
					// 使用DocumentFragment批量处理DOM操作，减少重排
					const fragment = document.createDocumentFragment();
					
					// 当前路径和参数
					const currentPath = '${path}';
					const currentParams = '${params}';
					
					// 预先创建所有列表项，一次性添加到DOM
					urls.forEach((url, index) => {
						const [testUrl, name] = url.split('#');
						const li = document.createElement("li");
						li.id = \`result\${index}\`;
						
						// 设置数据属性而非直接修改innerHTML，减少重排
						li.dataset.name = name || '未命名站点';
						li.dataset.url = testUrl;
						li.setAttribute('aria-label', \`测试站点 \${name || '未命名站点'}\`);
						
						// 创建文本节点
						const textNode = document.createTextNode(name || '未命名站点');
						li.appendChild(textNode);
						
						// 添加选择指示器
						const indicator = document.createElement('div');
						indicator.className = 'select-indicator';
						indicator.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M7 7l3 3 3-3"></path></svg>';
						li.appendChild(indicator);
						
						// 创建延迟显示的span
						const span = document.createElement('span');
						span.id = \`latency\${index}\`;
						span.className = 'testing';
						span.textContent = '等待测速...';
						
						// 添加点击事件
						li.addEventListener('click', function() {
							// 添加点击反馈
							this.classList.add('clicked');
							
							// 更改SVG为对勾图标
							const indicator = this.querySelector('.select-indicator');
							if (indicator) {
								indicator.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg>';
							}
							
							// 如果手动选择提示不存在，添加一个
							if (!document.getElementById('manual-selection-notice')) {
								const notice = document.createElement('div');
								notice.id = 'manual-selection-notice';
								notice.className = 'manual-selection-notice';
								notice.textContent = '手动选择: ' + name;
								
								const progressContainer = document.getElementById('progress-container');
								if (progressContainer) {
									progressContainer.parentNode.insertBefore(notice, progressContainer);
								}
							}
							
							// 延迟300ms以显示点击反馈
							setTimeout(() => {
								navigateToUrl(testUrl, currentPath, currentParams);
							}, 300);
						});
						
						// 添加鼠标悬停提示
						li.title = '点击直接访问此站点';
						
						// 添加到列表项
						li.appendChild(span);
						fragment.appendChild(li);
					});
					
					// 一次性将所有元素添加到DOM，减少重排
					ul.appendChild(fragment);
					
					// 添加顶部提示
					const description = document.createElement('div');
					description.className = 'selection-hint';
					description.textContent = '自动测速中，您也可以直接点击选择站点';
					ul.insertBefore(description, ul.firstChild);
					
					// 隐藏加载指示器
					UI.addClass('#loadingIndicator', 'hidden');
				} catch (error) {
					UI.showError('创建 URL 列表失败', error);
				}
			};
			
			/**
			 * 测试单个URL的延迟
			 * @param {string} url - 要测试的URL
			 * @param {number} timeout - 超时时间
			 * @returns {Promise} 包含测试结果的Promise
			 */
			const testLatency = (url, timeout = CONFIG.timeout) => {
				if (!url) return Promise.resolve({ url, latency: '无效URL' });
				
				return new Promise((resolve) => {
					const start = performance.now(); // 使用高精度时间
					const xhr = new XMLHttpRequest();
					
					try {
						xhr.open('HEAD', url, true);
						xhr.timeout = timeout;
						
						xhr.onload = function() {
							const latency = Math.round(performance.now() - start);
							if (xhr.status >= 200 && xhr.status < 400) {
								resolve({ url, latency, status: xhr.status });
							} else {
								resolve({ url, latency: \`状态码: \${xhr.status}\`, status: xhr.status });
							}
						};
						
						xhr.ontimeout = () => resolve({ 
							url, 
							latency: \`响应超时 \${timeout}ms\`, 
							status: 'timeout' 
						});
						
						xhr.onerror = () => resolve({ 
							url, 
							latency: '请求失败', 
							status: 'error' 
						});
						
						xhr.send();
					} catch (error) {
						resolve({ url, latency: '请求异常', status: 'exception' });
					}
				});
			};
			
			/**
			 * 等待指定时间
			 * @param {number} ms - 等待毫秒数
			 * @returns {Promise} 延迟Promise
			 */
			const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
			
			/**
			 * 进行多次测试并计算平均延迟
			 * @param {string} url - 要测试的URL
			 * @param {number} times - 测试次数
			 * @param {number} timeout - 超时时间
			 * @param {string} name - URL名称
			 * @returns {Promise<Object>} 测试结果对象
			 */
			const multiTest = async (url, times = 3, timeout = CONFIG.timeout, name = '') => {
				const results = [];
				
				for (let i = 0; i < times; i++) {
					// 每次测试之间添加小延迟，避免请求堆积
					if (i > 0) await sleep(CONFIG.speedTest.DELAY_BETWEEN_TESTS);
					
					const result = await testLatency(url, timeout);
					if (typeof result.latency === 'number') {
						results.push(result.latency);
					}
				}
				
				// 如果所有测试都失败，返回错误
				if (results.length === 0) {
					return { url, name, latency: '所有测试均失败', status: 'failed' };
				}
				
				// 计算平均延迟（去除最高值）
				if (results.length > 2) {
					results.sort((a, b) => a - b);
					results.pop(); // 移除最高值，减少异常值影响
				}
				
				const avgLatency = Math.round(
					results.reduce((sum, latency) => sum + latency, 0) / results.length
				);
				
				return { 
					url, 
					name, 
					latency: avgLatency, 
					status: 'success',
					samples: results.length,
					min: Math.min(...results),
					max: Math.max(...results)
				};
			};
			
			/**
			 * 根据延迟获取对应的颜色
			 * @param {number} latency - 延迟时间(ms)
			 * @returns {string} 颜色代码
			 */
			const getLatencyColor = (latency) => {
				if (latency <= 100) return CONFIG.latencyColors.excellent;
				if (latency <= 200) return CONFIG.latencyColors.good;
				if (latency <= 500) return CONFIG.latencyColors.average;
				if (latency <= 1000) return CONFIG.latencyColors.slow;
				return CONFIG.latencyColors.verySlow;
			};
			
			/**
			 * 更新UI显示测试结果
			 * 优化版本：使用CSS类替代直接样式修改，减少重排和重绘
			 * @param {Array<Object>} results - 测试结果数组
			 * @param {Object|null} fastest - 最快的结果对象
			 */
			const updateResultsUI = (results, fastest = null) => {
				// 创建DocumentFragment批量处理DOM更新
				const updates = document.createDocumentFragment();
				const updatedElements = [];
				
				results.forEach((result, index) => {
					const li = document.getElementById(\`result\${index}\`);
					if (!li) return; // 防止DOM元素不存在
					
					const latencySpan = document.getElementById(\`latency\${index}\`);
					if (!latencySpan) return;
					
					// 储存需要更新的元素
					updatedElements.push({li, latencySpan, result});
				});
				
				// 批量处理DOM更新，避免多次重排
				requestAnimationFrame(() => {
					updatedElements.forEach(({li, latencySpan, result}) => {
						// 移除加载状态
						latencySpan.classList.remove('testing');
						
						if (typeof result.latency === 'number') {
							// 更新延迟文本
							latencySpan.textContent = \`\${result.latency}ms\`;
							
							// 使用数据属性存储延迟值，便于后续计算
							latencySpan.dataset.latency = result.latency;
							
							// 添加延迟等级CSS类而非直接设置颜色
							const latencyClass = getLatencyClass(result.latency);
							latencySpan.className = latencyClass;
							
							// 标记是否为最快结果
							if (fastest && result.name === fastest.name) {
								// 使用CSS类替代直接样式修改
								li.classList.add('fastest-result');
								
								// 只有在尚未添加的情况下才添加最快标记
								if (!li.querySelector('.fastest-badge')) {
									const fastestBadge = document.createElement('span');
									fastestBadge.textContent = '最快';
									fastestBadge.className = 'fastest-badge';
									li.appendChild(fastestBadge);
								}
							}
						} else {
							latencySpan.textContent = result.latency;
							latencySpan.className = 'latency-error';
						}
					});
				});
			};
			
			/**
			 * 根据延迟获取对应的CSS类名
			 * @param {number} latency - 延迟时间(ms)
			 * @returns {string} CSS类名
			 */
			const getLatencyClass = (latency) => {
				if (latency <= 100) return 'latency-excellent';
				if (latency <= 200) return 'latency-good';
				if (latency <= 500) return 'latency-average';
				if (latency <= 1000) return 'latency-slow';
				return 'latency-very-slow';
			};
			
			/**
			 * 实施多轮测速
			 */
			const runMultiRoundTests = async () => {
				try {
					if (!urls || urls.length === 0) {
						throw new Error('未配置有效的 URL 列表');
					}
					
					UI.updateProgress('第一轮：初步筛选中...', 10);
					
					// 第一轮：初筛 - 快速测试所有URLs
					const preliminaryResults = await Promise.all(urls.map(url => {
						const [testUrl, name] = url.split('#');
						return testLatency(testUrl, CONFIG.speedTest.PRELIMINARY_TIMEOUT)
							.then(result => ({
								...result,
								name,
								originalUrl: url
							}));
					}));
					
					// 显示初步结果
					updateResultsUI(preliminaryResults);
					UI.updateProgress('初步筛选完成，分析结果...', 30);
					
					// 筛选出有效的初步结果
					const validPrelimResults = preliminaryResults.filter(
						result => typeof result.latency === 'number'
					);
					
					// 如果没有有效结果，提前退出
					if (validPrelimResults.length === 0) {
						throw new Error('初步测速未找到可用节点');
					}
					
					// 选择最快的几个URL进行进一步测试
					validPrelimResults.sort((a, b) => a.latency - b.latency);
					
					// 确定候选数量：至少MIN_CANDIDATES，最多MAX_CANDIDATES，但不超过有效结果数量
					const candidateCount = Math.min(
						Math.max(
							Math.ceil(validPrelimResults.length * CONFIG.speedTest.TOP_PERCENTAGE),
							CONFIG.speedTest.MIN_CANDIDATES
						),
						Math.min(CONFIG.speedTest.MAX_CANDIDATES, validPrelimResults.length)
					);
					
					const candidates = validPrelimResults.slice(0, candidateCount);
					
					UI.updateProgress(\`第二轮：精确测速 (\${candidates.length} 个候选节点)...\`, 50);
					
					// 第二轮：精测 - 对候选URLs进行多次测试
					const finalResults = [];
					for (let i = 0; i < candidates.length; i++) {
						const candidate = candidates[i];
						UI.updateProgress(
							\`精确测速: \${candidate.name} (\${i+1}/\${candidates.length})\`,
							50 + Math.floor((i / candidates.length) * 40)
						);
						
						const detailedResult = await multiTest(
							candidate.url,
							CONFIG.speedTest.TESTS_PER_ROUND,
							CONFIG.speedTest.FINAL_TIMEOUT,
							candidate.name
						);
						
						finalResults.push({
							...detailedResult,
							originalUrl: candidate.originalUrl
						});
						
						// 更新UI显示详细结果
						const index = preliminaryResults.findIndex(r => r.name === candidate.name);
						if (index !== -1) {
							preliminaryResults[index] = detailedResult;
							updateResultsUI([detailedResult], null);
						}
					}
					
					UI.updateProgress('测速完成，确定最佳节点...', 95);
					
					// 确定最终最快的URL
					const validFinalResults = finalResults.filter(
						result => typeof result.latency === 'number'
					);
					
					if (validFinalResults.length === 0) {
						throw new Error('精确测速未找到可用节点');
					}
					
					const fastest = validFinalResults.reduce(
						(prev, current) => (prev.latency < current.latency ? prev : current),
						validFinalResults[0]
					);
					
					// 更新UI，标记最快节点
					updateResultsUI(preliminaryResults, fastest);
					UI.updateProgress(\`已选择最快节点: \${fastest.name} (\${fastest.latency}ms)\`, 100);
					
					// 构建重定向URL并跳转
					const currentPath = '${path}';
					const currentParams = '${params}';
					const redirectUrl = fastest.url + currentPath + currentParams;
					
					// 检查是否存在手动选择提示，如果存在则不自动跳转
					if (document.getElementById('manual-selection-notice')) {
						UI.updateProgress('已手动选择站点，自动跳转已取消', 100);
						return;
					}
					
					// 添加短暂延迟以便用户看到最终结果
					setTimeout(() => {
						try {
							// 再次检查是否存在手动选择提示
							if (!document.getElementById('manual-selection-notice')) {
								window.location.href = redirectUrl;
							}
						} catch (error) {
							logError('跳转至最快URL失败', error);
						}
					}, CONFIG.redirectDelay);
				} catch (error) {
					UI.updateProgress(\`测速失败: \${error.message}\`, 100);
					logError('测速过程中发生错误', error);
				}
			};
			
			/**
			 * 延迟执行非关键任务
			 * @param {Function} fn - 要执行的函数
			 * @param {number} delay - 延迟毫秒数
			 */
			const deferTask = (fn, delay = 100) => {
				if (window.requestIdleCallback) {
					// 使用requestIdleCallback在浏览器空闲时执行
					window.requestIdleCallback(() => setTimeout(fn, 0), { timeout: delay });
				} else {
					// 降级方案
					setTimeout(fn, delay);
				}
			};
			
			// 使用更现代的初始化方式，渐进式加载
			const initApp = () => {
				try {
					// 在首屏渲染后创建URL列表
					createUrlList();
					
					// 背景微妙动画效果延迟加载
					deferTask(() => {
						document.body.style.animation = 'subtleShift 30s ease-in-out infinite';
						
						// 初始化处理屏幕方向并应用背景动画
						handleOrientationChange();
						
						// 为容器添加轻微的悬浮效果
						const container = document.querySelector('.container');
						if (container) {
							container.style.animation = 'float 6s ease-in-out infinite';
						}
					}, 1000);
					
					// 等待DOM完全准备好后启动测速
					deferTask(() => {
						runMultiRoundTests();
					}, 300);
				} catch (error) {
					logError('初始化失败', error);
				}
			};
			
			// 当DOM内容加载完成后执行初始化
			document.addEventListener('DOMContentLoaded', initApp);
			</script>
		</body>
		</html>
		`;
	},
	
	/**
	 * 生成错误页面HTML
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
				body { 
					font-family: system-ui, -apple-system, sans-serif; 
					padding: 20px; 
					text-align: center;
					background-color: #f8f9fb;
					color: #333;
					line-height: 1.5;
				}
				.container {
					max-width: 500px;
					margin: 50px auto;
					padding: 30px;
					background: white;
					border-radius: 12px;
					box-shadow: 0 8px 30px rgba(0,0,0,0.08);
				}
				.error { 
					color: #e53e3e; 
					margin: 20px 0;
					font-weight: 500; 
				}
				.details { 
					color: #718096; 
					font-size: 0.9em;
					margin-top: 20px;
				}
				h1 {
					margin-bottom: 30px;
					font-weight: 600;
					color: #2d3748;
				}
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
 */
export default {
	/**
	 * 处理请求的主函数
	 * @param {Request} request - HTTP请求对象
	 * @param {Object} env - 环境变量对象
	 * @returns {Response} HTTP响应对象
	 */
	async fetch(request, env) {
		try {
			// 请求开始计时
			const requestStart = Date.now();
			LoggerModule.debug(`处理请求: ${request.url}`);
			
			const url = new URL(request.url);
			const path = url.pathname;
			const params = url.search;
			
			// 配置初始化
			const config = ConfigModule.initSiteConfig(env);
			
			// 处理特殊路径请求
			if (path.toLowerCase() === '/ads.txt') {
				LoggerModule.debug('返回 ads.txt');
				return new Response(config.ADS, {
					headers: { 
						'content-type': 'text/plain;charset=UTF-8',
						'Cache-Control': 'public, max-age=86400' // 24小时缓存
					}
				});
			} 
			
			if (path.toLowerCase() === '/favicon.ico') {
				LoggerModule.debug('返回网站图标');
				return fetch(config.ICO);
			}
			
			// 获取URL列表
			const urls = ConfigModule.getUrlList(env);
			
			// 处理背景图片
			ConfigModule.processBackgroundImage(config, env);
			
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
			// 处理所有未捕获的异常
			LoggerModule.error(`服务器错误: ${error.message}`);
			
			// 返回友好的错误页面
			return new Response(UIModule.generateErrorPage(error), { 
				status: 500,
				headers: { 
					'content-type': 'text/html;charset=UTF-8',
					'Cache-Control': 'no-store'
				}
			});
		}
	}
};
