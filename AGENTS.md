# 本项目的版本留档规则

用户要求不同版本分别留档，不能用新版覆盖旧版。

- 每个发布版本使用独立的 `deliveries/YYYYMMDD-desktop-X.Y.Z/`、Git tag、GitHub Release、校验清单和交付记录。
- 现有 tag、发布 EXE、安装包和校验清单不可覆盖；发现不同内容时增加版本号。禁止 force-push、移动旧 tag、`release upload --clobber` 或删除旧 Release。
- tag 指向该版本真实源码；历史源码从保存的检查点恢复时记录来源。缺失源码的版本只能标为二进制存档，不得拿新版源码替代。
- 源码、Live2D运行资源和可编辑源版本分别记录，不把运行时修整当成新CMO3导出。保留当前可用版和至少上一可用版的完整恢复资料。
- 更新 `VERSION-ARCHIVES.md` 和 `archives/versions.json`。历史版本未经重新运行时，只验证留档完整性，不新增或夸大验收结论。
- 本地较大的模型/恢复包可由索引引用已有副本，避免重复占用C盘；任何清理必须确认目标在指定目录内且有已验证的替代存档。
- GitHub保持用户已授权的私有仓库 `HABAI182/changli-companion`；不上传个人数据库、凭据、缓存或日志。
