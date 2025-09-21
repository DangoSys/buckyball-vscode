# 🚀 快速测试指南

## 最简单的测试方法（推荐）

1. **在bbdev目录中打开VSCode**
   ```bash
   cd bbdev
   code .
   ```

2. **按F5启动调试**
   - 按 `F5` 键
   - 或者点击 Run > Start Debugging
   - 会自动打开一个新的VSCode窗口

3. **在新窗口中测试**
   - 打开任意工作区（或创建一个包含.c文件的文件夹）
   - 查看左侧边栏的 "BBDev Commands" 面板
   - 展开任意命令（如verilator）
   - 右键点击操作（如build）→ "Execute Operation"

## 如果一定要打包测试

1. **修复vsce安装**
   ```bash
   npm install -g vsce  # 注意是vsce不是vcse
   ```

2. **打包扩展**
   ```bash
   vsce package
   # 遇到repository警告时输入 y 继续
   ```

3. **安装测试**
   ```bash
   code --install-extension bbdev-vscode-extension-0.1.0.vsix
   ```

## 预期测试结果

✅ **应该看到：**
- 左侧边栏出现"BBDev Commands"面板
- 展开显示所有bbdev命令（verilator, vcs, sardine等）
- 右键操作弹出"Execute Operation"选项
- 点击后显示参数输入对话框
- 执行后在输出面板显示结果

❌ **如果bbdev未安装：**
- 会显示"bbdev command not found"错误
- 这是正常的，说明扩展工作正常，只是缺少bbdev工具

## 故障排除

**问题：扩展没有加载**
- 检查VSCode版本 >= 1.74.0
- 查看开发者控制台错误信息

**问题：树视图不显示**
- 确保打开了工作区文件夹
- 检查是否有编译错误

**问题：命令执行失败**
- 正常现象（如果没有安装bbdev）
- 检查输出面板的错误信息