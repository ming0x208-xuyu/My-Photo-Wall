标题字体（本地引用）
====================
本站标题用两款免费开源字体（SIL OFL 1.1 许可，可免费商用、可自行托管），下载后放进本文件夹即可，样式表已经写好引用，无需再改代码。

1) 中文标题：站酷小薇 LOGO 体（ZCOOL XiaoWei）
   Google Fonts：  https://fonts.google.com/specimen/ZCOOL+XiaoWei   （点 “Get font → Download all”）
   Fontsource：    https://fontsource.org/fonts/zcool-xiaowei
   项目源码：      https://github.com/googlefonts/zcool-xiaowei
   需要的文件：    ZCOOLXiaoWei-Regular.ttf

2) 英文标题：Italiana
   Google Fonts：  https://fonts.google.com/specimen/Italiana         （点 “Get font → Download all”）
   Fontsource：    https://fontsource.org/fonts/italiana
   需要的文件：    Italiana-Regular.ttf

使用步骤
--------
A. 把下载的压缩包解压，取出上面两个 .ttf 文件，放进本文件夹（fonts/）。
   —— 只做这一步就能用了（直接引用 .ttf）。但中文字体完整版有几 MB，手机加载会偏慢，建议再做 B。
B. 裁剪成只含标题文字的小文件（几十 KB 以内）：
      pip install fonttools brotli
      python subset_fonts.py
   生成 title-zh.woff2 和 title-en.woff2，网页会优先使用它们。裁剪后可以把原始 .ttf 留在本机、不上传。
C. 提交并同步到 GitHub。没放字体文件时，标题会自动使用系统字体，网站不会出错。

想换标题文字：改 index.html 顶部 SITE 里的 title / titleEn，然后重新运行 python subset_fonts.py。
