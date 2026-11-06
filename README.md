# 星屑ノート

acsRef 的个人博客：Hexo + [hexo-theme-sakura](https://github.com/honjun/hexo-theme-sakura)（改过配色与背景，主题已纳入本仓库），托管在 GitHub Pages，由 GitHub Actions 自动构建。

- 线上地址：<https://acsref.github.io>
- 源码仓库：<https://github.com/acsRef/acsRef.github.io>

## 换一台电脑怎么改

**不需要装 Node、Hexo 或任何环境。** 仓库里放的就是完整的博客源文件，构建交给 GitHub Actions。

### 方式一：在 GitHub 网页上直接改（最快，手机也行）

1. 打开 <https://github.com/acsRef/acsRef.github.io>
2. 想发新文章：进入 `source/_posts/` → 右上角 **Add file → Create new file**
3. 文件名用英文，例如 `my-new-post.md`
4. 第一段写 front-matter：

```markdown
---
title: 文章标题
date: 2026-11-05 20:00:00
tags:
  - 标签
categories:
  - 分类
description: 首页卡片上显示的一句话
---
```

5. 往下写正文，然后 **Commit changes**
6. 等 1~2 分钟，Actions 跑完，网站自动更新

### 方式二：在另一台电脑上用 git

```powershell
git clone git@github.com:acsRef/acsRef.github.io.git
cd acsRef.github.io
```

改完 `source/_posts/` 里的 Markdown 后：

```powershell
git add .
git commit -m "新文章：xxx"
git push
```

> 那台电脑要有你的 GitHub 账号权限（SSH key 或登录过的凭据）。仓库只存源文件，`node_modules/`、`public/` 都已忽略，不会把依赖提交进去。

### 想在本机预览效果

需要 Node.js 20+，然后：

```powershell
npm install
npx hexo server
```

打开 <http://localhost:4000> 看效果，改文件会自动刷新。预览完 `Ctrl+C` 退出。

只想生成静态文件、不上传：

```powershell
npx hexo clean
npx hexo generate
```

生成结果在 `public/` 里，双击 `public/index.html` 也能看（部分资源用绝对路径，最好还是用 `hexo server`）。

## 发一篇新文章

```powershell
npx hexo new "文章标题"
```

会在 `source/_posts/` 下生成 `年-月-日-文章标题.md`，填好 front-matter 就能写。

首页只显示 `<!-- more -->` 之前的内容；不想截断就不写这一行。

## 加密某篇文章

在文章 front-matter 里加一行 `password:`，构建时正文会被 AES 加密，访客要输密码才能看：

```markdown
---
title: 随记
date: 2026-11-05 09:00:00
description: 一些不想公开的东西
password: 734869
---
```

没写 `password` 的文章照常公开。提示语在根目录 `_config.yml` 的 `encrypt` 里（v4 的配置项就叫 `encrypt`，不是 `blog_encrypt`）。

**密码要输几次？** 只在这台设备上输一次。配置里开了：

- `autoSave: true` —— 解密密钥缓存在浏览器 localStorage（键名 `hbe.v4.<页面路径>`），刷新、再次打开都不用重输
- `stableSalt: true` —— 让 salt 由 permalink 派生；GitHub Actions 每次部署都是全新构建，不开这个的话每次发布后缓存都会失效

所以：**同一浏览器 + 同一篇文章 = 输一次就够**。换设备、换浏览器、清缓存才需要重输。每篇文章各自独立缓存。

**连标题也不想露？** 标题和摘要写在 front-matter 里，是公开的（首页列表能看到）。做法是标题本身写含糊，真实标题放进正文第一行（正文是加密的）：

```markdown
---
title: 某日
description: （加密）
password: 734869
---

## 真实的标题写在这里，只有输对密码才看得见
```

⚠️ 注意：页面本身是公开的，内容以密文形式下发，**不是真安全**——密码太弱会被离线爆破。别把真正敏感的东西放上来。
另外 localStorage 里的密钥，同源的其它脚本（统计、评论等）理论上能读到，只在信任站点里所有脚本时才开 `autoSave`。

## 不想公开的草稿

```powershell
npx hexo new draft "还没写完的东西"
```

文件在 `source/_drafts/`，已加入 `.gitignore`：不会提交、不会发布。想发的时候把 `.md` 移到 `source/_posts/` 再 push。

> 草稿只存在本地，换电脑就没了。要跨设备同步又不想公开，得用私有仓库或网盘。

## 目录结构

```
.
├── .github/workflows/deploy.yml   # 自动构建 + 发布
├── _config.yml                    # 站点配置（标题、网址、归档、搜索数据）
├── themes/Sakura/                 # 主题（honjun/hexo-theme-sakura，已纳入仓库）
│   └── _config.yml                # 主题配置：站点名、菜单、背景图、社交
├── package.json                   # 依赖清单
├── source/
│   ├── _posts/                    # 文章（Markdown）
│   ├── about/                     # 关于页
│   ├── tags/  categories/         # 标签页、分类页
│   └── img/                       # 头像、背景插画、印章、社交图标
└── public/                        # 构建产物（不提交）
```

## 常见改动

| 想改什么 | 改哪里 |
|---|---|
| 博客名字 / 站点描述 | `themes/Sakura/_config.yml` 的 `prefixName` / `siteName` / `description` |
| 顶部菜单 | `themes/Sakura/_config.yml` 的 `menus` |
| 首屏背景图 | `themes/Sakura/_config.yml` 的 `bg`（放 `source/img/` 里，写 `/img/xxx.svg`） |
| 头像 / favicon | 同上 `avatar` / `favicon` |
| 社交图标 | 同上 `social`、`msocial`（图标文件在 `source/img/social/`） |
| 首页文章条数 / 排序 | 同上 `homeArticleShown` / `homePageSortType` |
| 主题样式细节 | `themes/Sakura/source/css/`（`style.css` 是主样式） |
| 站点网址 / 分页 / 搜索数据 | 根目录 `_config.yml` |
| 部署工作流 | `.github/workflows/deploy.yml` |

> 主题是**放进仓库**的（不是 npm 包），所以升级上游要手动拉新代码再合并；好处是改主题模板、样式都能跟着站点一起版本管理。

## 图片放哪

放在 `source/img/` 下，文章里用绝对路径引用：

```markdown
![说明](/img/xxx.png)
```

## 升级主题 / 依赖

```powershell
npm update
npx hexo clean
npx hexo generate
```

自定义样式都写在 `source/css/anime.css` 里（通过注入加载），没有动主题源码，所以升级不会覆盖你的改动。升级后如果某个选择器失效，对照新版页面结构调一下即可。

## 故障排查

| 现象 | 原因与处理 |
|---|---|
| Actions 里 deploy 报 "Pages site not found" | 仓库 Settings → Pages → Source 选 **GitHub Actions**，再重跑 |
| 页面 404 | 仓库名必须是 `acsRef.github.io`，且 Pages 的分支/来源设置正确 |
| 样式没生效 | 浏览器缓存，`Ctrl+F5` 强刷；或本地 `npx hexo clean` 重新生成 |
| 中文标签链接变成 `%E5%85%AC...` | 正常，URL 编码而已 |
| 构建失败 | 看 Actions 日志里的报错行，通常是 Markdown 的 front-matter 写错（比如 `date:` 格式） |

## License

文章内容版权归作者所有；主题 Butterfly 遵循其自身开源协议。
