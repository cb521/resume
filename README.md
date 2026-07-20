# 柴斌的公开简历

在线地址：https://cb521.github.io/resume/

这是一个中英文静态简历网站。简历内容和页面代码已经分开，平时更新只需要编辑 [`data/resume.json`](data/resume.json)。提交后，GitHub 会自动检查、生成并发布网页。

## 最简单的修改方法

1. 在 GitHub 仓库中打开 `data/resume.json`。
2. 点击右上角的铅笔图标。
3. 修改引号里的文字。
4. 点击 **Commit changes**。
5. 等待约一分钟，网页会自动更新。

不要直接修改生成后的网页，也不要删除 JSON 中的引号、逗号和大括号。数据格式写错时，自动检查会失败，旧网页仍会正常保留。

## 去哪里修改

| 想修改的内容 | 数据位置 |
| --- | --- |
| 姓名、邮箱、地点、职位 | `site` |
| 首页介绍和数字亮点 | `hero` |
| 技术方向 | `focus` |
| 代表项目 | `work` |
| 工作和实习经历 | `experience` |
| 演讲和文章 | `speaking` |
| 教育、奖项、论文、技能 | `background` |
| 联系区文案 | `contact` |

中英文内容通常长这样：

```json
"title": {
  "en": "English title",
  "zh": "中文标题"
}
```

要添加项目，可以复制同一数组中已有的一整项，再修改公司、时间、标题、描述、结果和标签。

## 图片和 Logo

- 图片放在 `assets/`。
- 公司 Logo 放在 `assets/logos/`。
- 数据文件中的路径写成 `assets/文件名`。
- 公司 Logo 是各公司商标，只用于说明工作经历。

## 本地预览

电脑安装 Node.js 后，在仓库目录运行：

```bash
node scripts/build.mjs
python3 -m http.server 8080 -d dist
```

然后打开 `http://localhost:8080`。

生成脚本不依赖第三方软件包。它会先检查 JSON 和图片路径，确认无误后再生成 `dist/`。`dist/` 是临时结果，不需要上传，也不要手动编辑。

## 文件分工

- `data/resume.json`：唯一的简历内容来源，日常只改这里。
- `styles.css`：颜色和排版。
- `script.js`：中英文切换、手机菜单、打印和动画。
- `src/index.template.html`：网页基础模板。
- `scripts/build.mjs`：读取数据并生成网页。
- `.github/workflows/pages.yml`：自动发布到 GitHub Pages。

公开网页已隐藏原简历中的手机号、出生日期和性别，目前会公开邮箱 `1095135384@qq.com`。
