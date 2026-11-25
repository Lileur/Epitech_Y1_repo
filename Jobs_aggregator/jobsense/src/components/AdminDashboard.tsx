import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { jobsAPI } from '../services/api'

interface AdminUser {
  id: number
  firstName: string
  lastName: string
  email: string
  role: 'admin'
}

interface Props {
  user: AdminUser
  onLogout: () => void
}

type Section = 'overview' | 'users' | 'clients' | 'jobs' | 'api' | 'infra' | 'activity' | 'settings'
type UserRole = 'candidate' | 'recruiter' | 'admin'
type UserStatus = 'active' | 'suspended' | 'banned' | 'pending'
type JobStatus = 'published' | 'pending' | 'rejected' | 'hidden'

interface DashboardUser {
  id: number
  name: string
  email: string
  role: UserRole
  joined: string
  status: UserStatus
  verified: boolean
}

interface DashboardJob {
  id: string
  title: string
  company: string
  date: string
  status: JobStatus
  flags: number
  location: string
}



interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ModalState {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  isDanger?: boolean
}

interface AdminSettings {
  autoApproveJobs: boolean
  maintenanceMode: boolean
  notifyNewUsers: boolean
  maxJobsPerRecruiter: string
}

interface ApiJob {
  id?: string | number
  title?: string
  company?: string
  created_at?: string
  tags?: string[]
  location?: string
}

const INITIAL_USERS: DashboardUser[] = []



const DEFAULT_SETTINGS: AdminSettings = {
  autoApproveJobs: false,
  maintenanceMode: false,
  notifyNewUsers: true,
  maxJobsPerRecruiter: '50',
}

const SETTINGS_STORAGE_KEY = 'jobsense_admin_settings'

const formatDate = (dateLike: string | Date) => {
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('fr-FR')
}

const getNowTime = (dateLike: string | Date = new Date()) =>
  new Date(dateLike).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function AdminDashboard({ user, onLogout }: Props) {
  const [section, setSection] = useState<Section>('overview')
  const [userSearch, setUserSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [jobFilter, setJobFilter] = useState<'all' | JobStatus>('all')

  const [users, setUsers] = useState<DashboardUser[]>([])
  const [jobs, setJobs] = useState<DashboardJob[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => undefined,
  })

  const [loadingJobs, setLoadingJobs] = useState(false)
  const [syncingJobs, setSyncingJobs] = useState(false)
  const [promoteModal, setPromoteModal] = useState<{ isOpen: boolean; userId: number | null; token2fa: string }>({ isOpen: false, userId: null, token2fa: '' })
  const [lastSync, setLastSync] = useState('-')
  const [settings, setSettings] = useState<AdminSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) return DEFAULT_SETTINGS
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const toastIdRef = useRef(1)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = toastIdRef.current++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }, [])

  const confirmAction = useCallback((title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setModal({
      isOpen: true,
      title,
      message,
      isDanger,
      onConfirm: () => {
        onConfirm()
        setModal(prev => ({ ...prev, isOpen: false }))
      },
    })
  }, [])

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    try {
      const response = await jobsAPI.getAdminJobs({ limit: 500 })
      const rawJobs = Array.isArray(response.data) ? response.data : []
      const normalized: DashboardJob[] = rawJobs.map((job, index) => {
        const row = job as Record<string, unknown>
        const status = String(row.status ?? 'published') as JobStatus
        return {
          id: String(row.id ?? `job-${index}`),
          title: String(row.title ?? 'Titre indisponible'),
          company: String(row.company ?? 'Entreprise inconnue'),
          date: formatDate(String(row.date ?? new Date())),
          status,
          flags: Number(row.flags ?? 0) > 0 ? 1 : status === 'pending' ? 1 : 0,
          location: String(row.location ?? 'Non précisé'),
        }
      })
      setJobs(normalized)
      setLastSync(getNowTime())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Chargement des offres impossible', 'error')
    } finally {
      setLoadingJobs(false)
    }
  }, [showToast])

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const fetchUsers = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token')
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setUsers(data.data)
        }
      }
    } catch {
      showToast('Erreur lors du chargement des utilisateurs', 'error')
    }
  }, [showToast])

  useEffect(() => {
    void loadJobs()
    void fetchUsers()
  }, [loadJobs, fetchUsers])

  const handleSyncJobs = async () => {
    setSyncingJobs(true)
    try {
      await jobsAPI.syncJobs()
      await loadJobs()
      showToast('Synchronisation WeLoveDevs terminee')
    } catch {
      showToast('Echec de synchronisation API', 'error')
    } finally {
      setSyncingJobs(false)
    }
  }

  const runApiCheck = () => {
    showToast('Diagnostic API et serveur execute')
  }

  const updateUserStatus = async (userId: number, status: UserStatus) => {
    try {
      const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token')
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur API')
      }
      setUsers(prev => prev.map(current => (current.id === userId ? { ...current, status } : current)))
      return true
    } catch (err: any) {
      showToast(err.message, 'error')
      return false
    }
  }

  const handleSuspendUser = (userId: number) => {
    confirmAction(
      'Suspendre cet utilisateur',
      'Il ne pourra plus se connecter tant que le compte est suspendu.',
      async () => {
        const success = await updateUserStatus(userId, 'suspended')
        if (success) showToast('Utilisateur suspendu')
      },
      true,
    )
  }

  const handleBanUser = (userId: number) => {
    confirmAction(
      'Bannir cet utilisateur',
      'Action forte: le compte est banni et bloque.',
      async () => {
        const success = await updateUserStatus(userId, 'banned')
        if (success) showToast('Utilisateur banni', 'error')
      },
      true,
    )
  }

  const handleUnblockUser = async (userId: number) => {
    const success = await updateUserStatus(userId, 'active')
    if (success) {
      const target = users.find(u => u.id === userId)
      showToast(`Statut mis a jour pour ${target?.name ?? 'Utilisateur'}`)
    }
  }

  const handlePromoteClick = (userId: number, currentRole: string) => {
    if (currentRole === 'admin') return
    setPromoteModal({ isOpen: true, userId, token2fa: '' })
  }

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { userId, token2fa } = promoteModal
    if (!userId || !token2fa) return

    try {
      const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token')
      const res = await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token2fa })
      })
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la promotion')
      }
      
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: 'admin' } : u)))
      showToast('Utilisateur promu administrateur avec succès')
      setPromoteModal({ isOpen: false, userId: null, token2fa: '' })
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleVerifyProfile = (userId: number) => {
    setUsers(prev =>
      prev.map(current => (current.id === userId ? { ...current, verified: !current.verified, status: current.status === 'pending' ? 'active' : current.status } : current)),
    )
    const target = users.find(current => current.id === userId)
    showToast('Verification profil mise a jour')
  }

  const handleDeleteUser = (userId: number) => {
    confirmAction(
      'Supprimer l’utilisateur',
      'Cette action est irreversible. L’email sera banni pour empêcher une nouvelle inscription.',
      async () => {
        try {
          const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token')
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Erreur API')
          }
          setUsers(prev => prev.filter(u => u.id !== userId))
          showToast('Compte supprimé et email banni')
        } catch (err: any) {
          showToast(err.message, 'error')
        }
      },
      true,
    )
  }

  const handleUpdateJobStatus = (jobId: string, status: JobStatus) => {
    confirmAction(
      status === 'published' ? 'Publier cette offre' : 'Modérer cette offre',
      `L'offre sera marquée « ${status} » et ${status === 'published' ? 'visible' : 'masquée'} pour les utilisateurs.`,
      async () => {
        try {
          await jobsAPI.moderateJob(jobId, status)
          setJobs(prev => prev.map(job => (job.id === jobId ? { ...job, status } : job)))
          showToast(status === 'published' ? 'Offre publiée' : 'Modération enregistrée')
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Erreur modération', 'error')
        }
      },
      status !== 'published',
    )
  }

  const handleHideJob = (jobId: string) => {
    handleUpdateJobStatus(jobId, 'hidden')
  }

  const handleDeleteJob = (jobId: string) => {
    confirmAction(
      'Supprimer l’offre',
      'Suppression définitive en base. Action irréversible.',
      async () => {
        try {
          await jobsAPI.deleteAdminJob(jobId)
          setJobs(prev => prev.filter(job => job.id !== jobId))
          showToast('Offre supprimée')
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Suppression impossible', 'error')
        }
      },
      true,
    )
  }

  const filteredUsers = useMemo(
    () =>
      users.filter(
        current =>
          current.name.toLowerCase().includes(userSearch.toLowerCase()) || current.email.toLowerCase().includes(userSearch.toLowerCase()),
      ),
    [users, userSearch],
  )

  const clients = useMemo(() => users.filter(current => current.role === 'recruiter'), [users])

  const filteredJobs = useMemo(() => {
    const searched = jobs.filter(job => job.title.toLowerCase().includes(jobSearch.toLowerCase()) || job.company.toLowerCase().includes(jobSearch.toLowerCase()))
    return jobFilter === 'all' ? searched : searched.filter(job => job.status === jobFilter)
  }, [jobs, jobFilter, jobSearch])

  const stats = {
    totalUsers: users.length,
    verifiedUsers: users.filter(current => current.verified).length,
    bannedUsers: users.filter(current => current.status === 'banned').length,
    recruiters: users.filter(current => current.role === 'recruiter').length,
    activeJobs: jobs.filter(job => job.status === 'published').length,
    pendingJobs: jobs.filter(job => job.status === 'pending').length,
    flagged: jobs.filter(job => job.flags > 0).length,
  }

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: 'overview', label: 'Vue globale', icon: '◈' },
    { key: 'users', label: 'Candidats', icon: '◉' },
    { key: 'clients', label: 'Recruteurs', icon: '◎' },
    { key: 'jobs', label: 'Offres', icon: '◇' },
    { key: 'settings', label: 'Paramètres', icon: '⚙' },
  ]



  return (
    <div className="adm-root">
      <a className="skip-link" href="#main-content">
        Aller au contenu principal
      </a>
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top">
          <div className="adm-logo">
            Job<span>sense</span>
          </div>
          <div className="adm-badge">ADMIN</div>
        </div>

        <nav className="adm-nav" aria-label="Navigation administration">
          {navItems.map(item => (
            <button
              key={item.key}
              type="button"
              id={`admin-nav-${item.key}`}
              className={`adm-nav-item ${section === item.key ? 'adm-nav-item--active' : ''}`}
              onClick={() => setSection(item.key)}
              aria-current={section === item.key ? 'page' : undefined}
            >
              <span className="adm-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-user-info">
            <div className="adm-user-avatar">
              {(user.firstName?.[0] || user.email?.[0] || 'A').toUpperCase()}
              {(user.lastName?.[0] || '').toUpperCase()}
            </div>
            <div>
              <div className="adm-user-name">{user.firstName || user.email?.split('@')[0]} {user.lastName || ''}</div>
              <div className="adm-user-role">Admin</div>
            </div>
          </div>
          <button id="admin-logout-btn" className="adm-logout-btn" type="button" onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Deconnexion
          </button>
        </div>
      </aside>

      <main id="main-content" className="adm-main" tabIndex={-1}>
        <header className="adm-header">
          <div>
            <h1 className="adm-header-title">{navItems.find(item => item.key === section)?.label}</h1>
            <p className="adm-header-sub">Console d’administration complete: users, clients, API, reseau et serveur.</p>
          </div>
          <div className="adm-header-meta">
            <span
              className="adm-online-dot"
              aria-hidden="true"
              style={{
                background: settings.maintenanceMode ? '#ef4444' : '#22c55e',
                boxShadow: settings.maintenanceMode ? '0 0 0 2px rgba(239,68,68,0.2)' : '0 0 0 2px rgba(34,197,94,0.2)',
              }}
            />
            {settings.maintenanceMode ? 'Mode maintenance' : 'Plateforme en ligne'} · Sync {lastSync}
          </div>
        </header>

        {section === 'overview' && (
          <div className="adm-section">
            <div className="adm-stats-grid">
              <div className="adm-stat-card">
                <div className="adm-stat-label">Users total</div>
                <div className="adm-stat-value">{stats.totalUsers}</div>
                <div className="adm-stat-sub">Tous comptes confondus</div>
              </div>
              <div className="adm-stat-card adm-stat-card--accent">
                <div className="adm-stat-label">Profils verifies</div>
                <div className="adm-stat-value">{stats.verifiedUsers}</div>
                <div className="adm-stat-sub">Validation profil active</div>
              </div>
              <div className="adm-stat-card adm-stat-card--danger">
                <div className="adm-stat-label">Comptes bannis</div>
                <div className="adm-stat-value">{stats.bannedUsers}</div>
                <div className="adm-stat-sub">Moderation forte</div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-label">Clients recruteurs</div>
                <div className="adm-stat-value">{stats.recruiters}</div>
                <div className="adm-stat-sub">Comptes entreprise</div>
              </div>
              <div className="adm-stat-card adm-stat-card--amber">
                <div className="adm-stat-label">Offres en attente</div>
                <div className="adm-stat-value">{stats.pendingJobs}</div>
                <div className="adm-stat-sub">A moduler / valider</div>
              </div>
              <div className="adm-stat-card adm-stat-card--danger">
                <div className="adm-stat-label">Signalements</div>
                <div className="adm-stat-value">{stats.flagged}</div>
                <div className="adm-stat-sub">Priorite moderation</div>
              </div>
            </div>

            <div className="adm-panel">
              <div className="adm-panel-header">
                <span className="adm-panel-title">Actions rapides admin</span>
                <button className="adm-link-btn" type="button" onClick={runApiCheck}>
                  Diagnostic instantane →
                </button>
              </div>
              <div className="adm-quick-actions">
                <button className="adm-filter-tab" type="button" onClick={loadJobs} disabled={loadingJobs}>{loadingJobs ? 'Chargement...' : 'Recharger les offres'}</button>
                <button className="adm-filter-tab" type="button" onClick={handleSyncJobs} disabled={syncingJobs}>{syncingJobs ? 'Sync...' : 'Sync WeLoveDevs'}</button>
                <button className="adm-filter-tab" type="button" onClick={() => setSection('users')}>Gerer les users</button>
                <button className="adm-filter-tab" type="button" onClick={() => setSection('api')}>Verifier API</button>
              </div>
            </div>
          </div>
        )}

        {section === 'users' && (
          <div className="adm-section">
            <div className="adm-toolbar">
              <div className="adm-search-wrap">
                <svg className="adm-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="admin-user-search"
                  className="adm-search-input"
                  placeholder="Rechercher user..."
                  aria-label="Rechercher un utilisateur"
                  value={userSearch}
                  onChange={event => setUserSearch(event.target.value)}
                />
              </div>
              <div className="adm-toolbar-meta">{filteredUsers.length} user(s)</div>
            </div>

            <div className="adm-panel">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Inscrit le</th>
                    <th>Statut</th>
                    <th>Profil</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(current => (
                    <tr key={current.id}>
                      <td className="adm-td-name">{current.name}</td>
                      <td className="adm-td-muted">{current.email}</td>
                      <td>
                        <button
                          type="button"
                          className={`adm-role-badge adm-role-badge--${current.role} ${current.role !== 'admin' ? 'adm-role-badge--clickable' : ''}`}
                          onClick={() => handlePromoteClick(current.id, current.role)}
                          disabled={current.role === 'admin'}
                          style={{ cursor: current.role !== 'admin' ? 'pointer' : 'default' }}
                          title={current.role !== 'admin' ? 'Promouvoir en Administrateur' : ''}
                          aria-label={current.role !== 'admin' ? `Promouvoir ${current.name} en administrateur` : `${current.name} est administrateur`}
                        >
                          {current.role}
                        </button>
                      </td>
                      <td className="adm-td-muted">{current.joined}</td>
                      <td><span className={`adm-status-badge adm-status-badge--${current.status}`}>{current.status}</span></td>
                      <td>
                        <button className={`adm-mini-pill ${current.verified ? 'adm-mini-pill--ok' : ''}`} type="button" onClick={() => handleVerifyProfile(current.id)} aria-pressed={current.verified}>
                          {current.verified ? 'Verifie' : 'A verifier'}
                        </button>
                      </td>
                      <td>
                        <div className="adm-action-btns">
                          {current.status === 'active' && (
                            <button className="adm-action-btn" type="button" title="Suspendre" aria-label={`Suspendre ${current.name}`} onClick={() => handleSuspendUser(current.id)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="6" y1="6" x2="18" y2="18" />
                                <line x1="6" y1="18" x2="18" y2="6" />
                              </svg>
                            </button>
                          )}
                          {(current.status === 'suspended' || current.status === 'banned' || current.status === 'pending') && (
                            <button className="adm-action-btn adm-action-btn--approve" type="button" title="Reactiver" aria-label={`Réactiver ${current.name}`} onClick={() => handleUnblockUser(current.id)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                          )}
                          {current.status !== 'banned' && (
                            <button className="adm-action-btn adm-action-btn--danger" type="button" title="Ban" aria-label={`Bannir ${current.name}`} onClick={() => handleBanUser(current.id)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            </button>
                          )}
                          <button className="adm-action-btn adm-action-btn--danger" type="button" title="Supprimer" aria-label={`Supprimer ${current.name}`} onClick={() => handleDeleteUser(current.id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'clients' && (
          <div className="adm-section">
            <div className="adm-panel">
              <div className="adm-panel-header">
                <span className="adm-panel-title">Gestion clients recruteurs</span>
                <span className="adm-toolbar-meta">{clients.length} client(s)</span>
              </div>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Entreprise verifiee</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <tr key={client.id}>
                      <td className="adm-td-name">{client.name}</td>
                      <td className="adm-td-muted">{client.email}</td>
                      <td><span className={`adm-status-badge adm-status-badge--${client.status}`}>{client.status}</span></td>
                      <td>
                        <button className={`adm-mini-pill ${client.verified ? 'adm-mini-pill--ok' : ''}`} type="button" onClick={() => handleVerifyProfile(client.id)} aria-pressed={client.verified}>
                          {client.verified ? 'Entreprise verifiee' : 'A verifier'}
                        </button>
                      </td>
                      <td>
                        <div className="adm-action-btns">
                          <button className="adm-filter-tab" type="button" onClick={() => handleSuspendUser(client.id)}>Suspendre</button>
                          <button className="adm-filter-tab" type="button" onClick={() => handleUnblockUser(client.id)}>Reactiver</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'jobs' && (
          <div className="adm-section">
            <div className="adm-toolbar">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="adm-filter-tabs">
                  {(['all', 'published', 'pending', 'hidden', 'rejected'] as const).map(filter => (
                    <button
                      key={filter}
                      type="button"
                      id={`admin-job-filter-${filter}`}
                      className={`adm-filter-tab ${jobFilter === filter ? 'adm-filter-tab--active' : ''}`}
                      onClick={() => setJobFilter(filter)}
                      aria-pressed={jobFilter === filter}
                    >
                      {filter === 'all' ? 'Toutes' : filter === 'published' ? 'Publiées' : filter === 'pending' ? 'En attente' : filter === 'hidden' ? 'Masquées' : 'Rejetées'}
                    </button>
                  ))}
                </div>
                <button className="adm-filter-tab" type="button" onClick={loadJobs} disabled={loadingJobs}>{loadingJobs ? 'Chargement...' : 'Refresh'}</button>
                <button className="adm-filter-tab" type="button" onClick={handleSyncJobs} disabled={syncingJobs}>{syncingJobs ? 'Sync...' : 'Sync API'}</button>
              </div>
              <div className="adm-search-wrap" style={{ maxWidth: 280 }}>
                <svg className="adm-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="adm-search-input" placeholder="Titre ou entreprise..." aria-label="Rechercher une offre par titre ou entreprise" value={jobSearch} onChange={event => setJobSearch(event.target.value)} />
              </div>
              <div className="adm-toolbar-meta">{filteredJobs.length} offre(s)</div>
            </div>

            <div className="adm-panel">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Entreprise</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Signalements</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(job => (
                    <tr key={job.id}>
                      <td className="adm-td-name">{job.title}</td>
                      <td className="adm-td-muted">{job.company} · {job.location}</td>
                      <td className="adm-td-muted">{job.date}</td>
                      <td><span className={`adm-status-badge adm-status-badge--${job.status}`}>{job.status}</span></td>
                      <td>{job.flags > 0 ? <span className="adm-flag-badge">⚑ {job.flags}</span> : <span className="adm-td-muted">—</span>}</td>
                      <td>
                        <div className="adm-action-btns">
                          {job.status !== 'published' && (
                            <button className="adm-action-btn adm-action-btn--approve" type="button" title="Approuver" aria-label={`Approuver l'offre ${job.title}`} onClick={() => handleUpdateJobStatus(job.id, 'published')}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                          )}
                          {job.status === 'published' && (
                            <button className="adm-action-btn" type="button" title="Masquer" onClick={() => handleHideJob(job.id)}>
                              Masquer
                            </button>
                          )}
                          {job.status !== 'rejected' && job.status !== 'hidden' && (
                            <button className="adm-action-btn adm-action-btn--danger" type="button" title="Rejeter" aria-label={`Rejeter l'offre ${job.title}`} onClick={() => handleUpdateJobStatus(job.id, 'rejected')}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                          <button className="adm-action-btn adm-action-btn--danger" type="button" title="Supprimer" aria-label={`Supprimer l'offre ${job.title}`} onClick={() => handleDeleteJob(job.id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {section === 'settings' && (
          <div className="adm-section">
            <div className="adm-panel" style={{ padding: '2rem' }}>
              <div className="adm-settings-group">
                <h2 className="adm-settings-title">Plateforme & securite</h2>
                <div className="adm-setting-item">
                  <div className="adm-setting-info">
                    <span className="adm-setting-label">Mode maintenance</span>
                    <span className="adm-setting-desc">Bloque l’acces hors admin.</span>
                  </div>
                  <input
                    aria-label="Activer le mode maintenance"
                    type="checkbox"
                    className="adm-toggle"
                    checked={settings.maintenanceMode}
                    onChange={event => setSettings(prev => ({ ...prev, maintenanceMode: event.target.checked }))}
                  />
                </div>
                <div className="adm-setting-item">
                  <div className="adm-setting-info">
                    <span className="adm-setting-label">Notifications admin</span>
                    <span className="adm-setting-desc">Alertes sur nouvelles inscriptions.</span>
                  </div>
                  <input
                    aria-label="Activer les notifications admin"
                    type="checkbox"
                    className="adm-toggle"
                    checked={settings.notifyNewUsers}
                    onChange={event => setSettings(prev => ({ ...prev, notifyNewUsers: event.target.checked }))}
                  />
                </div>
              </div>

              <div className="adm-settings-group">
                <h2 className="adm-settings-title">Moderation des offres</h2>
                <div className="adm-setting-item">
                  <div className="adm-setting-info">
                    <span className="adm-setting-label">Approbation automatique</span>
                    <span className="adm-setting-desc">Publie automatiquement les offres.</span>
                  </div>
                  <input
                    aria-label="Activer l'approbation automatique des offres"
                    type="checkbox"
                    className="adm-toggle"
                    checked={settings.autoApproveJobs}
                    onChange={event => setSettings(prev => ({ ...prev, autoApproveJobs: event.target.checked }))}
                  />
                </div>
                <div className="adm-setting-item">
                  <div className="adm-setting-info">
                    <span className="adm-setting-label">Limite offres/client</span>
                    <span className="adm-setting-desc">Nombre maximal d’offres actives.</span>
                  </div>
                  <input
                    aria-label="Limite d'offres par client"
                    type="number"
                    className="adm-input"
                    min={1}
                    max={999}
                    value={settings.maxJobsPerRecruiter}
                    onChange={event => setSettings(prev => ({ ...prev, maxJobsPerRecruiter: event.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="adm-btn"
                  style={{ background: 'var(--ink)', color: 'white' }}
                  onClick={() => {
                    showToast('Parametres sauvegardes')
                    logActivity('Parametres', 'Configuration admin mise a jour')
                  }}
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="adm-toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(toast => (
          <div key={toast.id} className={`adm-toast adm-toast--${toast.type}`}>{toast.message}</div>
        ))}
      </div>

      {modal.isOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-desc">
            <h2 id="admin-confirm-title" className="adm-modal-title">{modal.title}</h2>
            <p id="admin-confirm-desc" className="adm-modal-desc">{modal.message}</p>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn--ghost" type="button" onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}>Annuler</button>
              <button className={`adm-btn ${modal.isDanger ? 'adm-btn--danger' : ''}`} type="button" onClick={modal.onConfirm}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {promoteModal.isOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="promote-modal-title" aria-describedby="promote-modal-desc">
            <h2 id="promote-modal-title" className="adm-modal-title">Promouvoir en Administrateur</h2>
            <p id="promote-modal-desc" className="adm-modal-text">
              Veuillez entrer votre code 2FA pour confirmer cette action de haute sécurité.
            </p>
            <form onSubmit={handlePromoteSubmit}>
              <label className="sr-only" htmlFor="admin-promote-2fa">Code de vérification 2FA</label>
              <input
                id="admin-promote-2fa"
                type="text"
                autoFocus
                placeholder="Code 2FA (6 chiffres)"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="adm-search-input"
                style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.2rem' }}
                value={promoteModal.token2fa}
                onChange={e => setPromoteModal(prev => ({ ...prev, token2fa: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              />
              <div className="adm-modal-actions">
                <button type="button" className="adm-action-btn" onClick={() => setPromoteModal({ isOpen: false, userId: null, token2fa: '' })}>
                  Annuler
                </button>
                <button type="submit" className="adm-action-btn" style={{ color: 'var(--amber)' }} disabled={promoteModal.token2fa.length < 6}>
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
