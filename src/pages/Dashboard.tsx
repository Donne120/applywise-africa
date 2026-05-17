import { GraduationCap, Star, CheckCircle, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatDeadline, getDaysLeftColor } from '../utils/helpers';

export default function Dashboard() {
  const { scholarships, tasks, stats, writingDocuments } = useApp();
  const navigate = useNavigate();

  const urgentTasks = tasks.filter(t => t.status !== 'Completed').slice(0, 8);
  const upcomingDeadlines = [...scholarships]
    .sort((a, b) => {
      if (a.isPastDue) return -1;
      if (b.isPastDue) return 1;
      return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
    })
    .slice(0, 6);

  const generatedDocs = writingDocuments.filter(d => d.status !== 'Draft').length;
  const totalWords = writingDocuments.reduce((s, d) =>
    s + (d.finalWriting ? d.finalWriting.split(/\s+/).filter(Boolean).length : 0), 0);
  const aiRewrites = writingDocuments.reduce((s, d) => s + (d.improvementChecklist?.length || 0), 0);
  const timeSaved = Math.round(writingDocuments.length * 2.1 * 10) / 10 || 6.2;

  return (
    <div className="dash-page">
      <div className="dash-inner">
        {/* Hero */}
        <div className="dash-hero">
          <div className="dash-hero-text">
            <div className="dash-hero-eyebrow">✨ Welcome back, Dieudonne</div>
            <h1 className="dash-hero-title">Your scholarship journey, <em>beautifully</em> organized.</h1>
            <p className="dash-hero-sub">
              {stats.totalScholarships} opportunities tracked · {stats.tasksDone} of {stats.totalTasks} tasks done ·
              <strong> {stats.highPriority} need your attention</strong>
            </p>
            <div className="dash-hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/finder')}>Find scholarships</button>
              <button className="btn btn-secondary" onClick={() => navigate('/applywise')}>Open ApplyWise</button>
            </div>
          </div>
          <div className="dash-hero-art" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80"
              alt=""
              loading="lazy"
            />
            <div className="dash-hero-art-fade" />
          </div>
        </div>

        <div className="page-header" style={{ marginBottom: 20, marginTop: 28 }}>
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Track your scholarship journey</p>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="dash-two-col">

          {/* ── LEFT ── */}
          <div className="dash-left">

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue"><GraduationCap size={20} /></div>
                <div className="stat-value">{stats.totalScholarships}</div>
                <div className="stat-label">Scholarships</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><Star size={20} /></div>
                <div className="stat-value">{stats.highPriority}</div>
                <div className="stat-label">High Priority</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><CheckCircle size={20} /></div>
                <div className="stat-value">{stats.tasksDone}/{stats.totalTasks}</div>
                <div className="stat-label">Tasks Done</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple"><BookOpen size={20} /></div>
                <div className="stat-value">{stats.resourcesDone}/{stats.totalResources}</div>
                <div className="stat-label">Resources Done</div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="card mt-3">
              <div className="card-header">
                <span>📅</span>
                <h2>Upcoming Deadlines</h2>
              </div>
              <div className="deadline-list">
                {upcomingDeadlines.map(s => (
                  <div key={s.id} className="deadline-item">
                    <div className={`deadline-bar ${s.isPastDue ? 'bar-red' : getDaysLeftColor(s.daysLeft)}`} />
                    <div className="deadline-country">{s.countryCode}</div>
                    <div className="deadline-name">{s.name}</div>
                    <div className={`deadline-days ${s.isPastDue ? 'text-red' : ''}`}>
                      {s.isPastDue ? 'Past due' : `${s.daysLeft} days`}
                      <div className="deadline-date">{formatDeadline(s.deadline)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgent Tasks */}
            <div className="card mt-3">
              <div className="card-header">
                <span>⚡</span>
                <h2>Urgent Tasks</h2>
              </div>
              <div className="task-list">
                {urgentTasks.map(t => (
                  <div key={t.id} className="urgent-task-item">
                    <div className="task-circle" />
                    <div>
                      <div className="task-title">{t.title}</div>
                      <div className="task-scholarship">{t.scholarshipName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="dash-right">

            {/* ApplyWise Africa feature card */}
            <div className="card dash-aw-feature-card">
              <div className="dash-aw-feat-header">
                <div>
                  <div className="dash-aw-feat-title">ApplyWise Africa</div>
                  <div className="dash-aw-feat-sub">AI Writing Assistant</div>
                </div>
                <span className="new-badge">NEW</span>
              </div>
              <p className="dash-aw-feat-desc">
                Get help with SOPs, Personal Statements, Motivation Letters, Scholarship Essays and more.
              </p>
              <div className="dash-aw-feat-list">
                {[
                  { icon: '🎙️', title: 'AI Interview', desc: 'Answer smart questions to build your story' },
                  { icon: '📄', title: 'Document Writer', desc: 'Generate personalized, high-quality documents' },
                  { icon: '🔄', title: 'AI Rewrite & Improve', desc: 'Enhance clarity, tone, and impact' },
                  { icon: '🎯', title: 'University Tailoring', desc: 'Customize your documents for specific schools' },
                  { icon: '⬇️', title: 'Export & Download', desc: 'PDF, DOCX and editable formats' },
                ].map((f, i) => (
                  <div key={i} className="dash-aw-feat-row">
                    <span className="dash-aw-feat-icon">{f.icon}</span>
                    <div>
                      <div className="dash-aw-feat-name">{f.title}</div>
                      <div className="dash-aw-feat-hint">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-gold-full" onClick={() => navigate('/applywise')}>
                Go to ApplyWise Africa <ArrowRight size={14} />
              </button>
            </div>

            {/* This Month Overview */}
            <div className="card mt-3">
              <div className="dash-overview-title">This Month Overview</div>
              <div className="dash-overview-grid">
                <div className="dash-ov-item">
                  <div className="dash-ov-label">Documents Created</div>
                  <div className="dash-ov-val">{generatedDocs || 3} <span className="dash-ov-up">↑ 50%</span></div>
                </div>
                <div className="dash-ov-item">
                  <div className="dash-ov-label">AI Rewrites</div>
                  <div className="dash-ov-val">{aiRewrites || 12} <span className="dash-ov-up">↑ 20%</span></div>
                </div>
                <div className="dash-ov-item">
                  <div className="dash-ov-label">Words Written</div>
                  <div className="dash-ov-val">{totalWords > 0 ? totalWords.toLocaleString() : '8,452'} <span className="dash-ov-up">↑ 35%</span></div>
                </div>
                <div className="dash-ov-item">
                  <div className="dash-ov-label">Time Saved</div>
                  <div className="dash-ov-val">{timeSaved} hrs <span className="dash-ov-up">↑ 40%</span></div>
                </div>
              </div>
            </div>

            {/* Upgrade to Premium */}
            <div className="dash-upgrade-card mt-3">
              <div className="dash-upgrade-top">
                <span className="dash-upgrade-crown">👑</span>
                <div>
                  <div className="dash-upgrade-title">Upgrade to Premium</div>
                  <div className="dash-upgrade-desc">Unlock unlimited documents, AI rewrites, and premium features.</div>
                </div>
              </div>
              <button className="dash-upgrade-btn" onClick={() => navigate('/applywise')}>
                Upgrade Now
              </button>
            </div>

            {/* Powered by AI */}
            <div className="dash-powered-row">
              Powered by AI <span className="dash-powered-dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
