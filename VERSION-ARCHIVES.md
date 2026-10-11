# 长离桌宠版本留档

每个版本独立保留，旧版本不覆盖。Release中的程序、安装包和SHA256清单对应各自版本。

既有15个独立Release已核对远端SHA256；0.7.5已独立保存，正在上传。

历史源码标签从当时保存的源码检查点恢复，恢复日期不是原开发提交日期，也没有重新构建或重新验收旧版本。0.6.3只有二进制存档；其archive标签只含归档说明，不提供伪造的旧源码。0.6.8使用本版源码检查点，运行模型从使用同一已验证v71原生源的0.6.9恢复包提取，来源单独记录。

| 版本 | 独立Release | 源码情况 | 本地程序目录 |
| --- | --- | --- | --- |
| 0.7.5 | [v0.7.5](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.5) | 原Git标签 | `deliveries/20261011-desktop-0.7.5` |
| 0.7.4 | [v0.7.4](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.4) | 原Git标签 | `deliveries/20261011-desktop-0.7.4` |
| 0.7.3 | [v0.7.3](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.3) | 原Git标签 | `deliveries/20261011-desktop-0.7.3` |
| 0.7.2 | [v0.7.2](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.2) | 已保存源码检查点 | `deliveries/20261011-desktop-0.7.2` |
| 0.7.1 | [v0.7.1](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.1) | 已保存源码检查点 | `deliveries/20261011-desktop-0.7.1` |
| 0.7.0 | [v0.7.0](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.0) | 已保存源码检查点 | `deliveries/20261011-desktop-0.7.0` |
| 0.6.9 | [v0.6.9](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.9) | 已保存源码检查点 | `deliveries/20261011-desktop-0.6.9` |
| 0.6.8 | [v0.6.8](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.8) | 已保存源码检查点 | `deliveries/20261011-desktop-0.6.8` |
| 0.6.7 | [v0.6.7](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.7) | 已保存源码检查点 | `deliveries/20261009-desktop-0.6.7` |
| 0.6.6 | [v0.6.6](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.6) | 已保存源码检查点 | `deliveries/20261009-desktop-0.6.6` |
| 0.6.5 | [v0.6.5](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.5) | 已保存源码检查点 | `deliveries/20261008-desktop-0.6.5` |
| 0.6.4 | [v0.6.4](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.4) | 已保存源码检查点 | `deliveries/20261008-desktop-0.6.4` |
| 0.6.3 | [archive-v0.6.3](https://github.com/HABAI182/changli-companion/releases/tag/archive-v0.6.3) | **仅二进制；源码缺失** | `deliveries/20261008-desktop-0.6.3` |
| 0.6.2 | [v0.6.2](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.2) | 已保存源码检查点 | `deliveries/20261008-desktop-0.6.2` |
| 0.6.1 | [v0.6.1](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.1) | 已保存源码检查点 | `deliveries/20261007-desktop-0.6.1` |
| 0.6.0 | [v0.6.0](https://github.com/HABAI182/changli-companion/releases/tag/v0.6.0) | 已保存源码检查点 | `deliveries/20261007-desktop-0.6.0` |

机器可读索引：[archives/versions.json](archives/versions.json)。大体积原生源与完整恢复包保留现有本地副本，不为索引重复复制。

以后发布必须使用新版本号和独立目录；旧tag不移动、Release附件不覆盖、不删除旧版本。源码与美术的未完成状态以各版交付记录为准。
