# 0.7.9 图标来源

使用用户上传的 `1000048777.jpg` 原图，完整保留画面，不生成替代人物，不裁掉键盘或凤凰。

项目文件：`public/assets/changli-icon-v079.jpg`，1280×1280；文件 SHA256：`7E886C070DDE1E6B61BD41391B4EB5A746A981C5C0C250AC5036D74BC25B429C`。

JPG 复制与上传源字节一致。通过 Pillow 仅转换为 `src-tauri/icons/icon-source.png`，核对解码后的 RGB 像素一致，再由 Tauri icon CLI 生成多尺寸 Windows ICO。应用、托盘、设置头像及预览入口共用原图。未使用 AI 重绘。0.7.8 图标保留在旧版本记录中。
