import os
import glob
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk  # 需要安装Pillow: pip install Pillow

# 配置参数
IMAGE_DIR = "C:\Dev\code\Projects\CaptchaRecognizer\model\char\data\\test"  # 图片目录（需提前创建）
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif")

class CaptchaLabeler:
    def __init__(self, root):
        self.root = root
        self.root.title("验证码标注工具")
        self.root.geometry("800x600+100+100")
        self.root.configure(bg="white")

        # 加载并排序图片（按i的数值排序）
        self.image_files = self.load_images()
        if not self.image_files:
            messagebox.showerror("错误", "未找到任何图片文件！")
            return

        # 初始化索引
        self.current_index = 0

        # 创建UI元素
        self.create_widgets()

    def load_images(self):
        """加载图片并按i的数值排序"""
        files = []
        for ext in IMAGE_EXTENSIONS:
            files.extend(glob.glob(os.path.join(IMAGE_DIR, f"*{ext}")))

        # 提取i值进行排序
        def get_i(filename):
            base = os.path.basename(filename)
            name = os.path.splitext(base)[0]
            i_part = name.split('_')[0]
            return int(i_part) if i_part.isdigit() else 0

        files.sort(key=lambda x: get_i(x))
        return files

    def create_widgets(self):
        # 图片显示区域
        self.image_label = tk.Label(self.root)
        self.image_label.pack(pady=20, expand=True, fill=tk.BOTH)

        # 文件名显示
        self.filename_var = tk.StringVar()
        self.filename_label = tk.Label(
            self.root,
            textvariable=self.filename_var,
            font=("Arial", 12),
            fg="gray"
        )
        self.filename_label.pack(pady=5)

        # 输入框
        self.entry_var = tk.StringVar()
        self.entry = tk.Entry(
            self.root,
            textvariable=self.entry_var,
            font=("Arial", 14),
            justify=tk.CENTER
        )
        self.entry.pack(pady=10, padx=20, fill=tk.X)
        self.entry.bind("<Return>", self.process_captcha)

        # 按钮区域
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=10)

        self.prev_btn = tk.Button(
            btn_frame,
            text="上一张",
            command=self.prev_image,
            font=("Arial", 12),
            width=10
        )
        self.prev_btn.pack(side=tk.LEFT, padx=5)

        self.next_btn = tk.Button(
            btn_frame,
            text="下一张",
            command=self.next_image,
            font=("Arial", 12),
            width=10
        )
        self.next_btn.pack(side=tk.RIGHT, padx=5)

        # 进度显示
        self.progress_var = tk.StringVar()
        self.progress_var.set(f"第 0/{len(self.image_files)} 张")
        self.progress_label = tk.Label(
            self.root,
            textvariable=self.progress_var,
            font=("Arial", 12)
        )
        self.progress_label.pack()

        # 初始显示
        self.show_image()

    def show_image(self):
        if self.current_index < len(self.image_files):
            filename = self.image_files[self.current_index]
            # 显示图片
            img = Image.open(filename)
            img = self.resize_image(img, 700, 500)
            self.photo = ImageTk.PhotoImage(img)
            self.image_label.config(image=self.photo)
            self.image_label.image = self.photo  # 避免被垃圾回收

            # 更新UI信息
            self.filename_var.set(os.path.basename(filename))
            self.progress_var.set(f"第 {self.current_index+1}/{len(self.image_files)} 张")
            self.root.title(f"验证码标注工具 - {os.path.basename(filename)}")

            # 更新输入框内容
            self.update_entry_value(filename)

            # 重置输入框焦点
            self.entry.focus_set()
        else:
            self.root.destroy()

    def update_entry_value(self, filename):
        """根据文件名更新输入框内容（仅4位字母时显示）"""
        base = os.path.basename(filename)
        name, ext = os.path.splitext(base)
        parts = name.split('_', 1)

        if len(parts) >= 2:
            captcha_part = parts[1].split('.')[0]
            if len(captcha_part) == 4 and captcha_part.isalpha():
                self.entry_var.set(captcha_part)
            else:
                self.entry_var.set("")
        else:
            self.entry_var.set("")

    def resize_image(self, img, max_width, max_height):
        """等比例缩放图片"""
        width, height = img.size
        ratio = min(max_width/width, max_height/height)
        new_size = (int(width*ratio), int(height*ratio))
        return img.resize(new_size)

    def process_captcha(self, event):
        user_input = self.entry_var.get().strip()
        if user_input:
            current_file = self.image_files[self.current_index]
            base = os.path.basename(current_file)
            name, ext = os.path.splitext(base)
            parts = name.split("_", 1)

            # 校验文件名格式
            if len(parts) != 2:
                messagebox.showerror("错误", f"文件名格式错误：{base}")
                return

            i_part, ts_part = parts
            new_name = f"{i_part}_{user_input}{ext}"
            new_path = os.path.join(IMAGE_DIR, new_name)

            try:
                os.rename(current_file, new_path)
                # 更新文件列表中的路径
                self.image_files[self.current_index] = new_path
                self.current_index += 1
                self.show_image()
                self.entry_var.set("")  # 清空输入框
            except FileExistsError:
                messagebox.showerror("错误", f"文件 {new_name} 已存在，请重新输入")
            except Exception as e:
                messagebox.showerror("错误", f"重命名失败：{str(e)}")
        else:
            messagebox.showwarning("提示", "验证码不能为空！")

    def next_image(self):
        if self.current_index < len(self.image_files)-1:
            self.current_index += 1
            self.show_image()

    def prev_image(self):
        if self.current_index > 0:
            self.current_index -= 1
            self.show_image()

if __name__ == "__main__":
    root = tk.Tk()
    app = CaptchaLabeler(root)
    root.mainloop()