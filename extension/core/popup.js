document.addEventListener('DOMContentLoaded', () => {
    const autoScan = document.getElementById('autoScan');
    const manualScan = document.getElementById('manualScan');

    // 从存储中加载设置
    chrome.storage.local.get(['autoScanEnabled'], ({autoScanEnabled}) => {
        autoScan.checked = !!autoScanEnabled;
    });

    // 自动扫描开关
    autoScan.addEventListener('change', () => {
        chrome.storage.local.set({autoScanEnabled: autoScan.checked});
        chrome.runtime.sendMessage({
            type: 'TOGGLE_AUTO_SCAN',
            enabled: autoScan.checked
        });
    });

    // 手动扫描按钮
    manualScan.addEventListener('click', () => {
        chrome.runtime.sendMessage({type: 'TRIGGER_SCAN'});
    });
});
