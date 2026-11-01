// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（教程、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tagColor 是飞书推送卡片里跟在标题后面的这一类小标签的颜色（飞书 text_tag 的颜色名）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "fde", tagColor: "indigo", label: "FDE / 交付", feedLabel: "FDE 与交付", section: "FDE 与交付", guide: "Forward Deployed Engineer（前线部署工程师）及其相邻的客户现场交付角色：岗位设置、团队搭建、招聘要求、薪酬与职业路径，驻客户现场把 AI/软件落到业务场景的方法、案例与组织模式。Palantir、Sierra、Decagon 等 FDE 密集型公司的交付团队变化归这里；没有交付场景的泛 AI 新闻不归这里。" },
  { key: "hr-tech", tagColor: "turquoise", label: "HR 科技", feedLabel: "HR 科技", section: "HR 科技", guide: "可使用的 HR 产品、平台和工程组件：HRIS/HCM、ATS、招聘、薪酬、福利、绩效、学习、员工体验、劳动力分析、全球用工与 EOR/PEO 的功能发布、集成、采购、替换和厂商动态。AI 功能是产品更新的一部分；纯模型能力发布不归这里。" },
  { key: "hiring", tagColor: "orange", label: "招聘 / 裁员", feedLabel: "招聘与裁员", section: "招聘、组织与行业", guide: "已发生的招聘计划、裁员、招聘冻结、业务重组、岗位迁移、人才争夺、雇主品牌和招聘市场变化。要有具体主体、范围、数字或时间；单条职位广告归 FDE/交付或 HR 科技，泛泛的招聘趋势评论归观点。" },
  { key: "industry", tagColor: "amber", label: "行业 / 人事", feedLabel: "行业与人事", section: "招聘、组织与行业", guide: "已发生的公司经营、融资并购、高管/CHRO/CPO 变动、组织架构调整、办公模式、合作、诉讼，以及这些变化对编制、人才和组织的影响。有明确招聘/裁员动作的归招聘/裁员；FDE 团队与交付组织的具体变化归 FDE/交付；只有商业模式判断而无事实的归观点。" },
  { key: "policy", tagColor: "red", label: "政策 / 合规", feedLabel: "政策与合规", section: "政策与合规", guide: "劳动法、就业与招聘监管、薪酬透明、签证与全球用工、工会、员工隐私、AI 在 HR 场景中的合规要求，以及已经生效或进入明确程序的判例、处罚和官方指引。只讨论政策方向而没有具体条款或程序的归观点。" },
  { key: "research", tagColor: "violet", label: "研究 / 报告", feedLabel: "研究与报告", section: "研究与报告", guide: "以劳动力市场、招聘、薪酬、员工体验、组织效能、FDE/交付工程为核心的研究报告、调查、数据集、基准和系统性分析。要能看出方法、样本或数据来源；厂商白皮书只有营销结论的不归这里，纯产品发布归 HR 科技。" },
  { key: "practice", tagColor: "green", label: "实践 / 教程", section: "实践与观点", guide: "读者可以照着用的 HR 操作手册、招聘流程、HRIS 实施、薪酬与绩效设计、FDE 交付方法、面试准备、职业转型和团队搭建复盘。重点是可复用的做法；单纯发布工具归 HR 科技，只有态度和预测而无做法归观点。", commentary: true },
  { key: "opinion", tagColor: "purple", label: "观点", section: "实践与观点", guide: "重点是作者对 HR、FDE、招聘、组织与人才市场的解释、判断、预测、评论或访谈观点。讨论市场不自动归行业/人事，作者是名人不自动归观点；没有新事实、新数据或可复用框架的宏大叙事要压低。", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布：日报报头的“N 个新模型”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = null;

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = [
  "hr", "fde", "hris", "hcm", "ats", "ceo", "chro", "cpo", "cto", "ipo", "saas", "ai", "api", "erp", "okr", "dei", "esg",
  "forward", "deployed", "engineer", "recruiting", "talent", "workforce", "payroll", "benefits",
];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = [
  "fde_role", "hr_tech_launch", "job_change", "leadership_change", "business_event",
  "policy_compliance", "research_report", "practice_guide", "opinion_analysis",
] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = [
  "FDE/交付", "HR科技", "招聘/裁员", "组织/人事", "行业/商业", "融资/并购", "政策/合规",
  "研究/报告", "实践/教程", "观点/评论", "薪酬/福利", "员工体验", "其他",
] as const;

/** 可选的主题标签。 */
export const TOPIC_TAGS = [
  "FDE", "交付工程", "客户成功", "解决方案", "HRIS", "HCM", "ATS", "招聘", "人才获取", "薪酬", "福利",
  "绩效", "学习发展", "员工体验", "组织发展", "劳动力分析", "HRBP", "全球用工", "远程/混合办公", "合规",
  "裁员", "技能转型", "管理者", "雇主品牌", "内部流动", "AI招聘", "职业转型",
] as const;

/** 可选的实体标签（公司、机构、平台）。 */
export const ENTITY_TAGS = [
  "Workday", "SAP SuccessFactors", "Oracle HCM", "ADP", "Dayforce", "Cornerstone", "Phenom", "Paradox",
  "Eightfold", "iCIMS", "Greenhouse", "Lever", "Ashby", "SmartRecruiters", "Deel", "Remote", "Rippling", "HiBob",
  "Personio", "Lattice", "Culture Amp", "Visier", "Palantir", "Sierra", "Decagon", "OpenAI", "Anthropic",
  "Scale AI", "Salesforce", "ServiceNow", "北森", "Moka", "仟寻", "猎聘", "BOSS直聘", "智联招聘", "前程无忧",
  "飞书 People", "钉钉",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "forward deployed engineer": "FDE", "forward-deployed engineer": "FDE", "前线部署工程师": "FDE", "交付工程师": "FDE", "驻场工程师": "FDE",
  "人力资源科技": "HR科技", "人力资源技术": "HR科技", "hr tech": "HR科技", "hr technology": "HR科技", "hr saas": "HR科技",
  "人力资源": "组织/人事", "人事": "组织/人事", "高管变动": "组织/人事", "人事变动": "组织/人事", "组织调整": "组织/人事",
  "招聘": "招聘/裁员", "recruiting": "招聘", "talent acquisition": "人才获取", "layoff": "裁员", "layoffs": "裁员", "裁员潮": "裁员",
  "job cuts": "裁员", "hiring freeze": "招聘/裁员", "招聘冻结": "招聘/裁员", "重组": "组织/人事", "restructuring": "组织/人事",
  "融资": "融资/并购", "收购": "融资/并购", "并购": "融资/并购", "funding": "融资/并购", "acquisition": "融资/并购", "m&a": "融资/并购",
  "policy": "政策/合规", "regulation": "政策/合规", "compliance": "合规", "监管": "政策/合规", "法规": "政策/合规", "劳动法": "政策/合规",
  "paper": "研究/报告", "report": "研究/报告", "survey": "研究/报告", "研究": "研究/报告", "报告": "研究/报告", "调查": "研究/报告",
  "tutorial": "实践/教程", "guide": "实践/教程", "how-to": "实践/教程", "教程": "实践/教程", "指南": "实践/教程", "最佳实践": "实践/教程",
  "opinion": "观点/评论", "观点": "观点/评论", "评论": "观点/评论", "趋势": "观点/评论", "预测": "观点/评论",
  "薪酬": "薪酬/福利", "工资": "薪酬/福利", "福利": "薪酬/福利", "benefits": "薪酬/福利", "payroll": "薪酬/福利",
  "员工体验": "员工体验", "employee experience": "员工体验", "engagement": "员工体验",
  "hris": "HRIS", "hcm": "HCM", "ats": "ATS", "eor": "全球用工", "peo": "全球用工",
  "remote work": "远程/混合办公", "hybrid work": "远程/混合办公", "混合办公": "远程/混合办公", "远程办公": "远程/混合办公",
  "upskilling": "技能转型", "reskilling": "技能转型", "技能提升": "技能转型", "career change": "职业转型", "转行": "职业转型",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/**
 * 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；orgNames 是这家公司发消息时开头用的组织名（公司、实验室、团队），
 * 在它自己的主题页上读者知道说的是谁，可以省去；otherNames 是公司的其他称呼（官方账号名、子品牌）。
 * 所有这些名字都用来认出说的是哪家公司，比如把事实的主体对到发布方。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  workday: { name: "Workday", displayTag: "Workday", aliases: ["Workday", "Workday HCM", "Workday Financials"], orgNames: ["Workday"] },
  "sap": { name: "SAP SuccessFactors", displayTag: "SAP SuccessFactors", aliases: ["SAP SuccessFactors", "SuccessFactors", "SAP HCM", "SAP"], orgNames: ["SAP", "SAP SuccessFactors"] },
  "oracle": { name: "Oracle HCM", displayTag: "Oracle HCM", aliases: ["Oracle HCM", "Oracle Fusion HCM", "Oracle"], orgNames: ["Oracle"] },
  adp: { name: "ADP", displayTag: "ADP", aliases: ["ADP", "Automatic Data Processing"], orgNames: ["ADP"] },
  dayforce: { name: "Dayforce", displayTag: "Dayforce", aliases: ["Dayforce", "Ceridian"], orgNames: ["Dayforce", "Ceridian"] },
  cornerstone: { name: "Cornerstone", displayTag: "Cornerstone", aliases: ["Cornerstone", "Cornerstone OnDemand"], orgNames: ["Cornerstone"] },
  phenom: { name: "Phenom", displayTag: "Phenom", aliases: ["Phenom", "Phenom People"], orgNames: ["Phenom"] },
  paradox: { name: "Paradox", displayTag: "Paradox", aliases: ["Paradox", "Olivia"], orgNames: ["Paradox"] },
  eightfold: { name: "Eightfold AI", displayTag: "Eightfold", aliases: ["Eightfold", "Eightfold AI"], orgNames: ["Eightfold"] },
  icims: { name: "iCIMS", displayTag: null, aliases: ["iCIMS"], orgNames: ["iCIMS"] },
  greenhouse: { name: "Greenhouse", displayTag: "Greenhouse", aliases: ["Greenhouse", "Greenhouse Software"], orgNames: ["Greenhouse"] },
  lever: { name: "Lever", displayTag: "Lever", aliases: ["Lever", "Lever.co"], orgNames: ["Lever"] },
  ashby: { name: "Ashby", displayTag: "Ashby", aliases: ["Ashby", "Ashby HQ"], orgNames: ["Ashby"] },
  smartrecruiters: { name: "SmartRecruiters", displayTag: "SmartRecruiters", aliases: ["SmartRecruiters"], orgNames: ["SmartRecruiters"] },
  deel: { name: "Deel", displayTag: "Deel", aliases: ["Deel"], orgNames: ["Deel"] },
  remote: { name: "Remote", displayTag: "Remote", aliases: ["Remote", "Remote.com"], orgNames: ["Remote"] },
  rippling: { name: "Rippling", displayTag: "Rippling", aliases: ["Rippling"], orgNames: ["Rippling"] },
  hibob: { name: "HiBob", displayTag: "HiBob", aliases: ["HiBob", "Bob"], orgNames: ["HiBob"] },
  personio: { name: "Personio", displayTag: "Personio", aliases: ["Personio"], orgNames: ["Personio"] },
  lattice: { name: "Lattice", displayTag: "Lattice", aliases: ["Lattice"], orgNames: ["Lattice"] },
  "culture-amp": { name: "Culture Amp", displayTag: "Culture Amp", aliases: ["Culture Amp", "CultureAmp"], orgNames: ["Culture Amp"] },
  visier: { name: "Visier", displayTag: "Visier", aliases: ["Visier"], orgNames: ["Visier"] },
  "josh-bersin": { name: "Josh Bersin", displayTag: null, aliases: ["Josh Bersin", "Bersin"], orgNames: ["Josh Bersin Company"] },
  palantir: { name: "Palantir", displayTag: "Palantir", aliases: ["Palantir", "Palantir Technologies", "Foundry", "Gotham", "AIP"], orgNames: ["Palantir"] },
  sierra: { name: "Sierra", displayTag: "Sierra", aliases: ["Sierra", "Sierra AI"], orgNames: ["Sierra"] },
  decagon: { name: "Decagon", displayTag: "Decagon", aliases: ["Decagon"], orgNames: ["Decagon"] },
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT"], orgNames: ["OpenAI"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], orgNames: ["Anthropic"] },
  "scale-ai": { name: "Scale AI", displayTag: "Scale AI", aliases: ["Scale AI", "Scale"], orgNames: ["Scale AI"] },
  salesforce: { name: "Salesforce", displayTag: "Salesforce", aliases: ["Salesforce", "Slack", "Tableau"], orgNames: ["Salesforce"] },
  servicenow: { name: "ServiceNow", displayTag: "ServiceNow", aliases: ["ServiceNow"], orgNames: ["ServiceNow"] },
  beisen: { name: "北森", displayTag: "北森", aliases: ["北森", "Beisen"], orgNames: ["北森", "Beisen"] },
  moka: { name: "Moka", displayTag: "Moka", aliases: ["Moka", "摩卡"], orgNames: ["Moka"] },
  moseeker: { name: "仟寻", displayTag: "仟寻", aliases: ["仟寻", "MoSeeker"], orgNames: ["仟寻", "MoSeeker"] },
  liepin: { name: "猎聘", displayTag: "猎聘", aliases: ["猎聘", "Liepin"], orgNames: ["猎聘", "Liepin"] },
  "boss-zhipin": { name: "BOSS直聘", displayTag: "BOSS直聘", aliases: ["BOSS直聘", "Boss直聘", "Kanzhun"], orgNames: ["BOSS直聘", "Kanzhun"] },
  zhaopin: { name: "智联招聘", displayTag: "智联招聘", aliases: ["智联招聘", "Zhaopin"], orgNames: ["智联招聘", "Zhaopin"] },
  "51job": { name: "前程无忧", displayTag: "前程无忧", aliases: ["前程无忧", "51job"], orgNames: ["前程无忧", "51job"] },
  "feishu-people": { name: "飞书 People", displayTag: "飞书 People", aliases: ["飞书 People", "Feishu People", "Lark People"], orgNames: ["飞书", "Feishu", "Lark"] },
  dingtalk: { name: "钉钉", displayTag: "钉钉", aliases: ["钉钉", "DingTalk"], orgNames: ["钉钉", "DingTalk"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "workday", name: "Workday", patterns: [/\bWorkday\b/] },
  { id: "sap", name: "SAP SuccessFactors", patterns: [/\bSAP\b|SuccessFactors/i] },
  { id: "oracle", name: "Oracle HCM", patterns: [/\bOracle\b/] },
  { id: "adp", name: "ADP", patterns: [/\bADP\b|Automatic Data Processing/i] },
  { id: "dayforce", name: "Dayforce", patterns: [/\bDayforce\b|\bCeridian\b/i] },
  { id: "cornerstone", name: "Cornerstone", patterns: [/\bCornerstone\b/] },
  { id: "phenom", name: "Phenom", patterns: [/\bPhenom\b/] },
  { id: "paradox", name: "Paradox", patterns: [/\bParadox\b/] },
  { id: "eightfold", name: "Eightfold AI", patterns: [/\bEightfold\b/] },
  { id: "greenhouse", name: "Greenhouse", patterns: [/\bGreenhouse\b/] },
  { id: "lever", name: "Lever", patterns: [/\bLever\b/] },
  { id: "ashby", name: "Ashby", patterns: [/\bAshby\b/] },
  { id: "smartrecruiters", name: "SmartRecruiters", patterns: [/SmartRecruiters/i] },
  { id: "deel", name: "Deel", patterns: [/\bDeel\b/] },
  { id: "remote", name: "Remote", patterns: [/\bRemote(?:\.com)?\b/] },
  { id: "rippling", name: "Rippling", patterns: [/\bRippling\b/] },
  { id: "hibob", name: "HiBob", patterns: [/\bHiBob\b/] },
  { id: "personio", name: "Personio", patterns: [/\bPersonio\b/] },
  { id: "lattice", name: "Lattice", patterns: [/\bLattice\b/] },
  { id: "culture-amp", name: "Culture Amp", patterns: [/Culture\s?Amp/i] },
  { id: "visier", name: "Visier", patterns: [/\bVisier\b/] },
  { id: "palantir", name: "Palantir", patterns: [/\bPalantir\b|\bFoundry\b|\bGotham\b|\bAIP\b/] },
  { id: "sierra", name: "Sierra", patterns: [/\bSierra(?: AI)?\b/] },
  { id: "decagon", name: "Decagon", patterns: [/\bDecagon\b/] },
  { id: "openai", name: "OpenAI", patterns: [/\bopenai\b|\bchatgpt\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/\banthropic\b|\bclaude\b/i] },
  { id: "scale-ai", name: "Scale AI", patterns: [/\bscale\s?ai\b/i] },
  { id: "salesforce", name: "Salesforce", patterns: [/\bsalesforce\b|\bslack\b|\btableau\b/i] },
  { id: "servicenow", name: "ServiceNow", patterns: [/servicenow/i] },
  { id: "beisen", name: "北森", patterns: [/北森|\bbeisen\b/i] },
  { id: "moka", name: "Moka", patterns: [/\bmoka\b|摩卡/i] },
  { id: "moseeker", name: "仟寻", patterns: [/仟寻|\bmoseeker\b/i] },
  { id: "liepin", name: "猎聘", patterns: [/猎聘|\bliepin\b/i] },
  { id: "boss-zhipin", name: "BOSS直聘", patterns: [/boss直聘|kanzhun/i] },
  { id: "zhaopin", name: "智联招聘", patterns: [/智联招聘|\bzhaopin\b/i] },
  { id: "51job", name: "前程无忧", patterns: [/前程无忧|\b51job\b/i] },
  { id: "feishu-people", name: "飞书 People", patterns: [/飞书\s?people|\bfeishu\b|\blark\b/i] },
  { id: "dingtalk", name: "钉钉", patterns: [/钉钉|\bdingtalk\b/i] },
  { id: "icims", name: "iCIMS", patterns: [/\biCIMS\b/i] },
  { id: "josh-bersin", name: "Josh Bersin", patterns: [/\bJosh Bersin\b|\bBersin\b/] },
];

/** 这些域名上的文章，发布方就是对应的公司（托管平台如 GitHub、arXiv 不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "workday", domains: ["workday.com"] },
  { entityId: "sap", domains: ["sap.com"] },
  { entityId: "oracle", domains: ["oracle.com"] },
  { entityId: "adp", domains: ["adp.com"] },
  { entityId: "dayforce", domains: ["dayforce.com"] },
  { entityId: "cornerstone", domains: ["cornerstoneondemand.com"] },
  { entityId: "phenom", domains: ["phenompeople.com"] },
  { entityId: "paradox", domains: ["paradox.ai"] },
  { entityId: "eightfold", domains: ["eightfold.ai"] },
  { entityId: "icims", domains: ["icims.com"] },
  { entityId: "greenhouse", domains: ["greenhouse.io"] },
  { entityId: "lever", domains: ["lever.co"] },
  { entityId: "ashby", domains: ["ashbyhq.com"] },
  { entityId: "smartrecruiters", domains: ["smartrecruiters.com"] },
  { entityId: "deel", domains: ["deel.com"] },
  { entityId: "remote", domains: ["remote.com"] },
  { entityId: "rippling", domains: ["rippling.com"] },
  { entityId: "hibob", domains: ["hibob.com"] },
  { entityId: "personio", domains: ["personio.com"] },
  { entityId: "lattice", domains: ["lattice.com"] },
  { entityId: "culture-amp", domains: ["cultureamp.com"] },
  { entityId: "visier", domains: ["visier.com"] },
  { entityId: "josh-bersin", domains: ["joshbersin.com"] },
  { entityId: "palantir", domains: ["palantir.com"] },
  { entityId: "sierra", domains: ["sierra.ai"] },
  { entityId: "decagon", domains: ["decagon.ai"] },
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com"] },
  { entityId: "scale-ai", domains: ["scale.com"] },
  { entityId: "salesforce", domains: ["salesforce.com"] },
  { entityId: "servicenow", domains: ["servicenow.com"] },
  { entityId: "beisen", domains: ["beisen.com"] },
  { entityId: "moka", domains: ["mokahr.com"] },
  { entityId: "moseeker", domains: ["moseeker.com"] },
  { entityId: "liepin", domains: ["liepin.com"] },
  { entityId: "boss-zhipin", domains: ["zhipin.com"] },
  { entityId: "zhaopin", domains: ["zhaopin.com"] },
  { entityId: "51job", domains: ["51job.com"] },
  { entityId: "feishu-people", domains: ["feishu.cn"] },
  { entityId: "dingtalk", domains: ["dingtalk.com"] },
];

/** 原文里的这些写法也算提到了对应公司。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "workday", pattern: /@Workday\b/i },
  { entityId: "palantir", pattern: /@PalantirTech\b/i },
  { entityId: "hibob", pattern: /@HiBob\b/i },
];
