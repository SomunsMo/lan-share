# Release 改动总结规则

## 用途

- 仅在用户要求「总结某版本改动」时使用，产出物**只以 markdown 代码块回复**，不写入任何文件
- 范围：相邻两个 tag 之间（如 `v1.1.0..v1.1.1`）；tag 来源见 `versioning.md`
- 上游版本尚未打 tag 时，用 `v1.1.0..HEAD` 表示待发布区间，并注明

## 取值命令

- 唯一数据来源：`git log <from>..<to> --no-merges --pretty=format:"%h %s"`
- `..`：界定发布区间，不含起点 tag
- `--no-merges`：剔除 merge commit，避免被合并分支的改动重复出现
- `%h %s`：短哈希 + 单行描述；需查上下文时用 `git show <hash>`
- 禁止改用 `git log` 全量、手工翻 GitHub PR 列表或凭记忆编写

## 归类

- 按 subject 的 `type:` 前缀切分（冒号前），大小写不敏感
- 分组顺序与展示顺序一致：`feat` → `fix` → `perf` → 其他
- 无冒号的旧提交（如 `Feat/v1.1.0 mui upgrade (#9)`）按语义就近归类，不单列
- 丢弃项：merge commit、成对抵消的 `revert`、纯 `test` 重构
- `ci` / `build` / `chore` 合并为「内部变更」一组；有用户可感知影响时补一句说明，无则整组省略
- 同一件事的多个 commit 合并成一条，不按 commit 条数堆条目
- 每组内按对用户的影响排序，不按提交时间

## 文案

- 英文行 = commit subject 原意直译，不改写、不加营销词
- 中文行 = 面向国内用户的自然表达，按中文语序重写，不逐词硬译
- 中文行描述用户感知（做了什么、有什么变化），不复述代码结构
- 英文行在上、中文行在下，中间必须硬换行：行末两个空格或 `<br>`
- 术语与 `i18n.md` 保持一致

## 输出格式

- 开头一行标题：`## v1.1.0 → v1.1.1`
- 空行后按分组顺序输出二级标题 `### Features` / `### Fixes` / `### Performance` / `### Internal`
- 条目用 `-` 列表，组内无条目的小标题不输出
- 结尾附统计：`- N commits, M items`（N 取命令实际条数，M 为输出条目数）
- 全程包在一个 ```markdown 代码块内

## 示例

```markdown
## v1.1.0 → v1.1.1

### Features

- Split web pages with hash routing and a collapsible side nav  
  网页按 hash 路由拆分为多个页面，并支持折叠式侧边导航

### Fixes

- Let the file name column fill the table on narrow screens  
  窄屏下文件名列自动撑满表格宽度

### Internal

- Fill release draft binaries instead of generating a release on tag push  
  改为在打 tag 时填充已存在的草稿 release，不再新建

- 5 commits, 3 items
```
