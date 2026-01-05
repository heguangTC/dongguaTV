/**
 * apply-geckoview.js
 * 
 * 这个脚本在 npm install 后运行，将 @web-media/capacitor-geckoview 的内容
 * 复制到 @capacitor/android 目录，使 Capacitor 使用 GeckoView 而不是系统 WebView。
 */

const fs = require('fs');
const path = require('path');

const GECKOVIEW_PATH = path.join(__dirname, '..', 'node_modules', '@web-media', 'capacitor-geckoview');
const CAPACITOR_ANDROID_PATH = path.join(__dirname, '..', 'node_modules', '@capacitor', 'android');

console.log('🦎 Applying GeckoView to Capacitor Android...');

// 检查 GeckoView 插件是否存在
if (!fs.existsSync(GECKOVIEW_PATH)) {
    console.log('⚠️ @web-media/capacitor-geckoview not found, skipping...');
    process.exit(0);
}

// 检查 Capacitor Android 是否存在
if (!fs.existsSync(CAPACITOR_ANDROID_PATH)) {
    console.log('⚠️ @capacitor/android not found, skipping...');
    process.exit(0);
}

// 递归复制目录
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 添加 namespace 到 build.gradle (AGP 8 兼容性)
function addNamespace(buildGradlePath, namespace) {
    if (!fs.existsSync(buildGradlePath)) {
        console.log('  ⚠️ build.gradle not found at:', buildGradlePath);
        return false;
    }

    let content = fs.readFileSync(buildGradlePath, 'utf8');

    // 检查是否已经有 namespace
    if (content.includes('namespace')) {
        console.log('  ℹ️ namespace already exists in:', buildGradlePath);
        return true;
    }

    // 在 android { 后添加 namespace
    const androidBlockRegex = /android\s*\{/;
    if (androidBlockRegex.test(content)) {
        content = content.replace(androidBlockRegex, `android {\n    namespace "${namespace}"`);
        fs.writeFileSync(buildGradlePath, content, 'utf8');
        console.log('  ✅ Added namespace to:', buildGradlePath);
        return true;
    } else {
        console.log('  ⚠️ Could not find android { block in:', buildGradlePath);
        return false;
    }
}

try {
    // 复制 capacitor 目录 (核心 Android 代码)
    const geckoCapacitorDir = path.join(GECKOVIEW_PATH, 'capacitor');
    const targetCapacitorDir = path.join(CAPACITOR_ANDROID_PATH, 'capacitor');

    if (fs.existsSync(geckoCapacitorDir)) {
        console.log('  Copying GeckoView capacitor module...');
        copyDir(geckoCapacitorDir, targetCapacitorDir);

        // 添加 namespace (AGP 8 兼容性)
        const buildGradlePath = path.join(targetCapacitorDir, 'build.gradle');
        addNamespace(buildGradlePath, 'com.getcapacitor.android');

        console.log('✅ GeckoView applied successfully!');
    } else {
        console.log('⚠️ GeckoView capacitor directory not found at:', geckoCapacitorDir);
        console.log('   Available contents:', fs.readdirSync(GECKOVIEW_PATH).join(', '));
    }
} catch (error) {
    console.error('❌ Error applying GeckoView:', error.message);
    // 不要失败，让构建继续
    process.exit(0);
}
