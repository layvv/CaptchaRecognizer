import requests
import os
from datetime import datetime
import time

# 配置参数
base_url = "http://sso-cuit-edu-cn-s.webvpn.cuit.edu.cn:8118/authserver/captcha"
save_dir = "C:\Dev\code\Projects\CaptchaRecognizer\model\char\data\\test"  # 保存目录（请确保已创建）
total_count = 2000         # 需要下载的图片数量
request_interval = 2    # 请求间隔（秒）

# 请求头（根据提供的请求头构造）
headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6",
    "Cache-Control": "max-age=0",
    "Cookie": "SESSION=a923d3db-ab5f-468c-92af-dd7873b72ed9; route=b855bffea4ad72faf70088d14e6004e3; TWFID=b385f6557ee9c633",
    "Host": "sso-cuit-edu-cn-s.webvpn.cuit.edu.cn:8118",
    "Proxy-Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0"
}

# 创建保存目录（如果不存在）
if not os.path.exists(save_dir):
    os.makedirs(save_dir)


# 批量下载
success_count = 0
for i in range(1,total_count+1):
    try:
        # 发送GET请求
        response = requests.get(base_url, headers=headers, timeout=10)

        # 检查响应状态
        if response.status_code == 200 and response.headers['Content-Type'].startswith('image'):
            # 生成文件名（格式：00001_时间戳.jpg）
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]  # 精确到毫秒
            filename = f"{i}_{timestamp}.jpg"
            save_path = os.path.join(save_dir, filename)

            # 保存图片
            with open(save_path, 'wb') as f:
                f.write(response.content)
            print(f"成功保存: {save_path}")
        else:
            print(f"请求失败，状态码: {response.status_code}")
    except Exception as e:
        print(f"请求异常: {str(e)}")
    time.sleep(request_interval)  # 防止请求过快

print(f"\n共成功下载 {success_count} 张验证码图片到 {save_dir}")