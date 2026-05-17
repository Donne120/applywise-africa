import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Task, TaskCategory, TaskStatus } from '../types';
import { generateId } from '../utils/helpers';

const STATUS_FILTERS: (TaskStatus | 'All')[] = ['All', 'Pending', 'In Progress', 'Completed'];
const CAT_FILTERS: (TaskCategory | 'All')[] = ['All', 'Documents', 'Essays', 'Research', 'Logistics'];

export default function Tasks() {
  const { tasks, updateTask, addTask, scholarships } = useApp();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [catFilter, setCatFilter] = useState<TaskCategory | 'All'>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = tasks.filter(t => {
    const statusMatch = statusFilter === 'All' || t.status === statusFilter;
    const catMatch = catFilter === 'All' || t.category === catFilter;
    return statusMatch && catMatch;
  });

  const grouped = CAT_FILTERS.filter(c => c !== 'All').reduce((acc, cat) => {
    const items = filtered.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Task[]>);

  const done = tasks.filter(t => t.status === 'Completed').length;

  // Brand-new state: zero tasks at all. Different copy from "no tasks match filter."
  if (tasks.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Tasks</h1>
            <p className="page-subtitle">Every step toward every application, organized.</p>
          </div>
        </div>
        <div className="empty applications-empty">
          <div className="empty-emoji">🪐</div>
          <h2>No tasks yet — and that's normal.</h2>
          <p>
            Tasks usually live inside a specific scholarship application — things like{' '}
            <em>"Email Prof. Wanjiru by Friday"</em> or <em>"Request transcript from registrar"</em>.{' '}
            Start by tracking a scholarship in <strong>My Applications</strong>, and tasks will
            naturally follow. Or add one here yourself right now.
          </p>
          <div className="applications-empty-actions">
            {scholarships.length === 0 ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/applications')}>
                Start with My Applications
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add my first task
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setShowAdd(true)}>
              Or add a standalone task
            </button>
          </div>
        </div>
        {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} addTask={addTask} scholarships={scholarships} />}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="page-subtitle">{done}/{tasks.length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div className="filter-bar">
        {STATUS_FILTERS.map(f => (
          <button key={f} className={`filter-pill ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="filter-bar mt-2">
        {CAT_FILTERS.map(f => (
          <button key={f} className={`filter-pill ${catFilter === f ? 'active' : ''}`} onClick={() => setCatFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="task-groups">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="task-group">
            <div className="task-group-header">{cat.toUpperCase()} ({items.length})</div>
            {items.map(t => (
              <TaskRow key={t.id} task={t} onToggle={() => updateTask(t.id, t.status === 'Completed' ? 'Pending' : 'Completed')} />
            ))}
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="empty">
            <div className="empty-emoji">🌸</div>
            <h3>No tasks match your filters</h3>
            <p>Try clearing a filter, or add a new task to keep your scholarship journey on track.</p>
            <button className="btn btn-primary mt-2" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add a task
            </button>
          </div>
        )}
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} addTask={addTask} scholarships={scholarships} />}
    </div>
  );
}

function TaskRow({ task: t, onToggle }: { task: Task; onToggle: () => void }) {
  const dueDate = new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div className={`task-row ${t.status === 'Completed' ? 'completed' : ''}`}>
      <button className={`task-check ${t.status === 'Completed' ? 'checked' : ''}`} onClick={onToggle}>
        {t.status === 'Completed' && <span>✓</span>}
      </button>
      <div className="task-row-content">
        <div className="task-row-title">{t.title}</div>
        <div className="task-row-meta">
          <span className={`cat-badge cat-${t.category.toLowerCase()}`}>{t.category}</span>
          <span className="task-scholarship-link">{t.scholarshipName}</span>
          <span className="task-due">🕐 {dueDate}</span>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, addTask, scholarships }: {
  onClose: () => void;
  addTask: (t: Task) => void;
  scholarships: ReturnType<typeof useApp>['scholarships'];
}) {
  const [form, setForm] = useState({ title: '', category: 'Essays' as TaskCategory, scholarshipId: scholarships[0]?.id ?? '', dueDate: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scholarship = scholarships.find(s => s.id === form.scholarshipId);
    addTask({
      id: generateId(),
      ...form,
      status: 'Pending',
      scholarshipName: scholarship?.name ?? '',
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Task</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label>Task Title *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Write personal statement draft" />
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TaskCategory }))}>
                <option>Essays</option>
                <option>Documents</option>
                <option>Research</option>
                <option>Logistics</option>
              </select>
            </div>
            <div className="form-field">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label>Related Scholarship</label>
            <select value={form.scholarshipId} onChange={e => setForm(f => ({ ...f, scholarshipId: e.target.value }))}>
              {scholarships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
