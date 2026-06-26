import { useState, useEffect, useRef, useCallback } from 'react'

// ==================== Data ====================

interface Task {
  id: number
  title: string
  category: 'food' | 'travel' | 'retail' | 'beauty'
  categoryLabel: string
  merchantName: string
  merchantFeature: string
  difficulty: string
  trained: number
  lastScore: number | null
}

const TASKS: Task[] = [
  { id: 1, title: '电销通用训练 - 美食火锅', category: 'food', categoryLabel: '美食', merchantName: '蜀味老火锅', merchantFeature: '新店开业3个月，日均客流50人，想提升线上曝光', difficulty: '友好型', trained: 4, lastScore: 78 },
  { id: 2, title: '电销通用训练 - 文旅景点', category: 'travel', categoryLabel: '文旅', merchantName: '阳光旅行社', merchantFeature: '经营5年，有稳定客源但线上转化率低', difficulty: '犹豫型', trained: 2, lastScore: 65 },
  { id: 3, title: '电销通用训练 - 美容美发', category: 'beauty', categoryLabel: '丽人', merchantName: '悦颜美容SPA', merchantFeature: '连锁品牌，注重ROI，已有美团合作', difficulty: '抵触型', trained: 1, lastScore: 52 },
  { id: 4, title: '电销通用训练 - 零售便利', category: 'retail', categoryLabel: '零售', merchantName: '好邻居便利店', merchantFeature: '社区店，老板忙碌经常挂电话', difficulty: '刁难型', trained: 0, lastScore: null },
]

const SPECIAL_TASKS: Task[] = [
  { id: 5, title: '专项 - 开场白训练', category: 'food', categoryLabel: '通用', merchantName: '随机商户', merchantFeature: '专项训练开场白30秒黄金话术', difficulty: '友好型', trained: 6, lastScore: 85 },
  { id: 6, title: '专项 - 异议处理训练', category: 'travel', categoryLabel: '通用', merchantName: '随机商户', merchantFeature: '专项训练常见拒绝理由应对', difficulty: '抵触型', trained: 3, lastScore: 70 },
  { id: 7, title: '专项 - 逼单促成训练', category: 'retail', categoryLabel: '通用', merchantName: '随机商户', merchantFeature: '专项训练临门一脚促成签约', difficulty: '犹豫型', trained: 1, lastScore: 60 },
]

interface ScoreDetail {
  name: string
  score: number
  feedback: string
  suggestion: string
}

const MOCK_SCORES: ScoreDetail[] = [
  { name: '身份介绍', score: 92, feedback: '清晰介绍了高德身份和来意，节奏自然。', suggestion: '可以在介绍时加入一句"我们最近在您这个区域有一个专属扶持活动"，提升商户兴趣。' },
  { name: '负责人确认', score: 85, feedback: '成功确认了对方是店长，但确认过程略显生硬。', suggestion: '建议用"请问您是负责门店运营的X总吗？"替代"你是老板吗？"，更显尊重。' },
  { name: '需求挖掘', score: 68, feedback: '问了客流量但没有深挖线上渠道使用情况。', suggestion: '增加探需问题："目前咱们店在线上平台的曝光情况怎么样？有没有觉得还可以再提升的地方？"' },
  { name: '产品介绍', score: 75, feedback: '介绍了扫街榜功能但缺少数据支撑。', suggestion: '加入成功案例数据："附近XX火锅店上线后，日均线上曝光提升了40%，到店核销率提升15%。"' },
  { name: '异议处理', score: 55, feedback: '商户提出"已经有美团了"的异议时，回应不够有力。', suggestion: '标准应对："美团和高德的用户群体不同，高德覆盖的是导航找店的精准用户，和您现有渠道互补而非竞争。"' },
  { name: '促成/逼单', score: 60, feedback: '未在通话中推动下一步行动。', suggestion: '结尾应明确下一步："X总，我这边可以先帮您免费开通一个体验账号，明天下午3点我给您回电话看看效果怎么样？"' },
]

interface ChatMessage {
  role: 'ai' | 'user'
  content: string
}

const AI_RESPONSES: Record<string, string[]> = {
  opening: [
    '喂，你好，哪位？',
    '嗯你好，你说。',
    '哦高德地图啊，你们打电话来干嘛？',
  ],
  busy: [
    '我现在店里忙着呢，有什么事快说吧。',
    '行，你简单说说，我就两分钟时间。',
  ],
  interest: [
    '嗯...曝光提升这个听着还行，具体怎么做的？',
    '那你们这个和美团有什么区别？',
    '多少钱？先说价格。',
  ],
  objection: [
    '我们已经在美团上了，不需要再搞一个了吧。',
    '之前也有人来推销过，效果不怎么样啊。',
    '太贵了，我考虑考虑吧。',
  ],
  closing: [
    '行吧，你把资料发我微信看看。',
    '嗯，那你明天下午打给我吧，我再想想。',
    '可以，先帮我开个试用看看效果。',
  ],
}

interface Student {
  name: string
  trainCount: number
  avgScore: number
  lastActive: string
  alert?: string
}

const STUDENTS: Student[] = [
  { name: '张小明', trainCount: 12, avgScore: 82, lastActive: '2小时前' },
  { name: '李思思', trainCount: 8, avgScore: 75, lastActive: '3小时前' },
  { name: '王大伟', trainCount: 15, avgScore: 88, lastActive: '1小时前' },
  { name: '赵芳芳', trainCount: 3, avgScore: 45, lastActive: '1天前', alert: '连续低分' },
  { name: '陈建国', trainCount: 6, avgScore: 62, lastActive: '5小时前', alert: '探需遗漏' },
  { name: '刘晓燕', trainCount: 10, avgScore: 79, lastActive: '4小时前' },
  { name: '周杰', trainCount: 2, avgScore: 38, lastActive: '2天前', alert: '练习不足' },
  { name: '黄丽华', trainCount: 9, avgScore: 71, lastActive: '6小时前' },
]

// ==================== Components ====================

function StatusBar() {
  return (
    <div className="status-bar">
      <span>20:17</span>
      <div className="status-bar-icons">
        <span>&#9679;&#9679;&#9679;&#9679;</span>
        <span> WiFi </span>
        <span>100%</span>
      </div>
    </div>
  )
}

function BottomNav({ active, onNavigate, role }: { active: string; onNavigate: (page: string) => void; role: string }) {
  const items = role === 'trainer'
    ? [
        { key: 'dashboard', icon: '📊', label: '看板' },
        { key: 'students', icon: '👥', label: '学员' },
        { key: 'profile', icon: '👤', label: '我的' },
      ]
    : [
        { key: 'practice', icon: '🎯', label: '练习' },
        { key: 'records', icon: '📋', label: '记录' },
        { key: 'cert', icon: '🏆', label: '认证' },
        { key: 'profile', icon: '👤', label: '我的' },
      ]

  return (
    <div className="bottom-nav">
      {items.map(item => (
        <button
          key={item.key}
          className={`nav-item ${active === item.key ? 'active' : ''}`}
          onClick={() => onNavigate(item.key)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ==================== Pages ====================

function TaskListPage({ onStartChat }: { onStartChat: (task: Task) => void }) {
  const [tab, setTab] = useState<'general' | 'special'>('general')
  const tasks = tab === 'general' ? TASKS : SPECIAL_TASKS

  return (
    <>
      <div className="tab-bar">
        <button className={`tab-item ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>通用任务</button>
        <button className={`tab-item ${tab === 'special' ? 'active' : ''}`} onClick={() => setTab('special')}>专项任务</button>
      </div>
      <div className="content">
        {tasks.map(task => (
          <div key={task.id} className="task-card" onClick={() => onStartChat(task)}>
            <div className="task-card-header">
              <div className="task-card-title">{task.title}</div>
              <span className={`task-card-badge badge-${task.category}`}>{task.categoryLabel}</span>
            </div>
            <div className="task-card-meta">
              <div className="task-meta-item">商户：<span>{task.merchantName}</span></div>
              <div className="task-meta-item">特征：<span>{task.merchantFeature}</span></div>
            </div>
            <div className="difficulty-selector">
              <span className={`diff-tag ${task.difficulty === '友好型' ? 'easy' : task.difficulty === '犹豫型' ? 'medium' : 'hard'}`}>
                {task.difficulty}
              </span>
            </div>
            <div className="task-card-footer" style={{ marginTop: 10 }}>
              <span className="task-trained">
                已训练 {task.trained} 次{task.lastScore !== null && ` · 最近 ${task.lastScore}分`}
              </span>
              <button className="btn-start" onClick={(e) => { e.stopPropagation(); onStartChat(task) }}>
                开始对练
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ChatPage({ task, onEnd, onBack }: { task: Task; onEnd: () => void; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showTaskInfo, setShowTaskInfo] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationStage = useRef(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    setIsTyping(true)
    const timer = setTimeout(() => {
      setIsTyping(false)
      setMessages([{ role: 'ai', content: '喂，你好，哪位？我这边在忙呢。' }])
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const getAIResponse = (): string => {
    const stage = conversationStage.current
    let pool: string[]
    if (stage < 2) pool = AI_RESPONSES.busy
    else if (stage < 4) pool = AI_RESPONSES.interest
    else if (stage < 6) pool = AI_RESPONSES.objection
    else pool = AI_RESPONSES.closing

    conversationStage.current++
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, { role: 'ai', content: getAIResponse() }])
    }, 800 + Math.random() * 1200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-page">
      <StatusBar />
      <div className="chat-header">
        <div className="header">
          <button className="header-back" onClick={onBack}>&#8249;</button>
          <div className="header-title">{task.merchantName}</div>
          <button className="header-action" onClick={() => setShowTaskInfo(!showTaskInfo)}>
            {showTaskInfo ? '收起' : '任务详情'}
          </button>
        </div>
        {showTaskInfo && (
          <div className="chat-task-info">
            <div className="chat-task-info-title">{task.title}</div>
            <div className="chat-task-info-desc">
              商户特征：{task.merchantFeature}<br />
              难度模式：{task.difficulty}
            </div>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'ai' && <div className="chat-bubble-label">🏪 {task.merchantName}</div>}
            {msg.role === 'user' && <div className="chat-bubble-label user-label">🎧 销售</div>}
            {msg.content}
          </div>
        ))}
        {isTyping && (
          <div className="chat-bubble ai">
            <div className="chat-bubble-label">🏪 {task.merchantName}</div>
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <button className="chat-end-btn" onClick={onEnd} title="结束对练">📞</button>
        <input
          className="chat-input"
          placeholder="输入你的话术..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

function ScorePage({ task, onRetry, onDone }: { task: Task; onRetry: () => void; onDone: () => void }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const totalScore = Math.round(MOCK_SCORES.reduce((sum, s) => sum + s.score, 0) / MOCK_SCORES.length)
  const rank = totalScore >= 90 ? '优秀' : totalScore >= 70 ? '良好' : totalScore >= 60 ? '一般' : '待加强'

  const getScoreClass = (score: number) => {
    if (score >= 90) return 'score-excellent'
    if (score >= 60) return 'score-good'
    return 'score-poor'
  }

  return (
    <div className="score-page">
      <StatusBar />
      <div className="header">
        <button className="header-back" onClick={onDone}>&#8249;</button>
        <div className="header-title">评分详情</div>
        <div style={{ width: 32 }} />
      </div>

      <div className="score-summary">
        <div className="score-total">{totalScore}</div>
        <div className="score-label">{task.title}</div>
        <div className="score-rank">{rank}</div>
      </div>

      <div className="score-details">
        {MOCK_SCORES.map((item, index) => (
          <div key={index} className="score-item">
            <div className="score-item-header" onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}>
              <span className="score-item-name">{item.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`score-item-value ${getScoreClass(item.score)}`}>{item.score}</span>
                <span className="score-item-expand">{expandedIndex === index ? '▲' : '▼'}</span>
              </div>
            </div>
            {expandedIndex === index && (
              <div className="score-item-detail">
                <div>{item.feedback}</div>
                <div className="score-suggestion">
                  💡 改进建议：{item.suggestion}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="score-actions">
        <button className="btn-retry" onClick={onRetry}>再练一次</button>
        <button className="btn-done" onClick={onDone}>返回首页</button>
      </div>
    </div>
  )
}

function RecordsPage() {
  const records = [
    { title: '电销通用训练 - 美食火锅', score: 78, date: '今天 19:30', duration: '5分32秒' },
    { title: '专项 - 开场白训练', score: 85, date: '今天 16:20', duration: '3分15秒' },
    { title: '电销通用训练 - 文旅景点', score: 65, date: '昨天 14:10', duration: '6分48秒' },
    { title: '专项 - 异议处理训练', score: 70, date: '昨天 10:30', duration: '4分22秒' },
    { title: '电销通用训练 - 美容美发', score: 52, date: '前天 15:45', duration: '7分10秒' },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="content">
      <div className="section-title">对练记录</div>
      {records.map((r, i) => (
        <div key={i} className="record-card">
          <div className="record-header">
            <div className="record-title">{r.title}</div>
            <span className="record-score" style={{ color: getScoreColor(r.score) }}>{r.score}分</span>
          </div>
          <div className="record-meta">
            <span>{r.date}</span>
            <span>时长 {r.duration}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${r.score}%`, background: getScoreColor(r.score) }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CertPage() {
  const requirements = [
    { text: '完成10次通用任务练习', done: true, current: '12/10' },
    { text: '完成3次专项任务练习', done: true, current: '4/3' },
    { text: '通用任务平均分 ≥ 75', done: true, current: '78分' },
    { text: '各维度评分均 ≥ 60', done: false, current: '异议处理 55分' },
  ]

  const allDone = requirements.every(r => r.done)

  return (
    <div className="content">
      <div className="cert-status">
        <div className="cert-icon">{allDone ? '🎉' : '📝'}</div>
        <div className="cert-title">{allDone ? '已满足认证条件' : '话术认证考试'}</div>
        <div className="cert-desc">
          通过AI模拟认证考试后，将推送给主管进行终审。<br />
          请确保所有前置条件已达标。
        </div>

        <div className="cert-requirements">
          <div className="cert-req-title">认证前置条件</div>
          {requirements.map((req, i) => (
            <div key={i} className="cert-req-item">
              <div className={`cert-req-check ${req.done ? 'done' : 'pending'}`}>
                {req.done ? '✓' : '○'}
              </div>
              <span style={{ flex: 1 }}>{req.text}</span>
              <span style={{ fontSize: 12, color: req.done ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                {req.current}
              </span>
            </div>
          ))}
        </div>

        <button className="btn-cert" disabled={!allDone}>
          {allDone ? '发起认证考试' : '条件未满足'}
        </button>
      </div>
    </div>
  )
}

function DashboardPage() {
  return (
    <div className="content">
      <div className="section-title">培训数据总览</div>
      <div className="dashboard-cards">
        <div className="dash-card">
          <div className="dash-card-value">38</div>
          <div className="dash-card-label">在训学员</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-value success">72</div>
          <div className="dash-card-label">平均得分</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-value warning">156</div>
          <div className="dash-card-label">今日练习次数</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-value danger">3</div>
          <div className="dash-card-label">预警学员</div>
        </div>
      </div>

      <div className="section-title">薄弱环节分布</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { name: '异议处理', pct: 42, color: '#ef4444' },
          { name: '逼单促成', pct: 28, color: '#f59e0b' },
          { name: '需求挖掘', pct: 18, color: '#f59e0b' },
          { name: '产品介绍', pct: 8, color: '#10b981' },
          { name: '身份介绍', pct: 4, color: '#10b981' },
        ].map(item => (
          <div key={item.name} style={{
            padding: '6px 12px',
            borderRadius: 16,
            background: `${item.color}15`,
            border: `1px solid ${item.color}40`,
            fontSize: 12,
            color: item.color,
            fontWeight: 500,
          }}>
            {item.name} {item.pct}%
          </div>
        ))}
      </div>

      <div className="student-list-header">
        <span className="student-list-title">学员列表</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>按平均分排序</span>
      </div>
      {STUDENTS.sort((a, b) => b.avgScore - a.avgScore).map((s, i) => {
        const scoreColor = s.avgScore >= 80 ? '#10b981' : s.avgScore >= 60 ? '#f59e0b' : '#ef4444'
        return (
          <div key={i} className="student-row">
            <div className="student-avatar">{s.name.slice(-2)}</div>
            <div className="student-info">
              <div className="student-name">
                {s.name}
                {s.alert && <span className="alert-badge">⚠️ {s.alert}</span>}
              </div>
              <div className="student-meta">练习 {s.trainCount} 次 · {s.lastActive}</div>
            </div>
            <span className="student-score" style={{ color: scoreColor }}>{s.avgScore}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProfilePage({ role, onSwitchRole }: { role: string; onSwitchRole: (role: string) => void }) {
  return (
    <div className="content">
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-light)',
          color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, margin: '0 auto 12px',
        }}>
          {role === 'trainer' ? '培' : '销'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--gray-900)' }}>
          {role === 'trainer' ? '张培训师' : '新人销售'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
          {role === 'trainer' ? '高德电销培训组 · 培训师' : '高德电销团队 · 实习期'}
        </div>
      </div>

      <div className="section-title">切换视角（Demo）</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`role-btn ${role === 'sales' ? 'active' : ''}`}
          onClick={() => onSwitchRole('sales')}
        >
          👤 新人销售
        </button>
        <button
          className={`role-btn ${role === 'trainer' ? 'active' : ''}`}
          onClick={() => onSwitchRole('trainer')}
        >
          👨‍🏫 培训师
        </button>
      </div>

      {role === 'sales' && (
        <>
          <div className="section-title">练习统计</div>
          <div className="dashboard-cards">
            <div className="dash-card">
              <div className="dash-card-value">18</div>
              <div className="dash-card-label">总练习次数</div>
            </div>
            <div className="dash-card">
              <div className="dash-card-value success">72</div>
              <div className="dash-card-label">平均得分</div>
            </div>
            <div className="dash-card">
              <div className="dash-card-value warning">85</div>
              <div className="dash-card-label">最高得分</div>
            </div>
            <div className="dash-card">
              <div className="dash-card-value">4.2h</div>
              <div className="dash-card-label">总练习时长</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ==================== Main App ====================

type Page = 'main' | 'chat' | 'score'

function App() {
  const [page, setPage] = useState<Page>('main')
  const [activeTab, setActiveTab] = useState('practice')
  const [role, setRole] = useState('sales')
  const [currentTask, setCurrentTask] = useState<Task | null>(null)

  const handleStartChat = (task: Task) => {
    setCurrentTask(task)
    setPage('chat')
  }

  const handleEndChat = () => {
    setPage('score')
  }

  const handleRetry = () => {
    setPage('chat')
  }

  const handleDone = () => {
    setPage('main')
    setActiveTab('practice')
  }

  const handleSwitchRole = (newRole: string) => {
    setRole(newRole)
    setActiveTab(newRole === 'trainer' ? 'dashboard' : 'practice')
  }

  if (page === 'chat' && currentTask) {
    return <ChatPage task={currentTask} onEnd={handleEndChat} onBack={() => setPage('main')} />
  }

  if (page === 'score' && currentTask) {
    return <ScorePage task={currentTask} onRetry={handleRetry} onDone={handleDone} />
  }

  const renderContent = () => {
    if (role === 'trainer') {
      if (activeTab === 'dashboard' || activeTab === 'students') return <DashboardPage />
      return <ProfilePage role={role} onSwitchRole={handleSwitchRole} />
    }

    switch (activeTab) {
      case 'practice': return <TaskListPage onStartChat={handleStartChat} />
      case 'records': return <RecordsPage />
      case 'cert': return <CertPage />
      case 'profile': return <ProfilePage role={role} onSwitchRole={handleSwitchRole} />
      default: return <TaskListPage onStartChat={handleStartChat} />
    }
  }

  return (
    <div className="app">
      <StatusBar />
      <div className="header">
        <div style={{ width: 32 }} />
        <div className="header-title">
          {role === 'trainer' ? '📊 培训看板' : '🎯 AI 销售陪练'}
        </div>
        <button className="header-action" onClick={() => handleSwitchRole(role === 'sales' ? 'trainer' : 'sales')}>
          {role === 'sales' ? '培训师' : '学员'}视角
        </button>
      </div>
      {renderContent()}
      <BottomNav active={activeTab} onNavigate={setActiveTab} role={role} />
    </div>
  )
}

export default App
