import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Filters from './components/Filters'
import JobList from './components/JobList'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import Profile from './components/Profile'
import Settings from './components/Settings'
import Register from './components/Register'
import Login from './components/Login'
import EmployerDashboard from './components/EmployerDashboard'
import AdminDashboard from './components/AdminDashboard'
import { AdminLogin } from './components/AdminLogin'
import OffresPage from './components/OffresPage'
import EntreprisesPage from './components/EntreprisesPage'
import SalairesPage from './components/SalairesPage'
import TendancesPage from './components/TendancesPage'
import OfferDetailPage from './components/OfferDetailPage'
import { jobsAPI, jobsResponseToArray, applicationsAPI, usersAPI } from './services/api'
import { saveCatalogCache } from './utils/jobsCatalogCache'
import {
  readSavedIds,
  toggleSavedJob,
  mergeSavedFromServer,
  jobToSnapshot,
} from './utils/savedJobsStorage'
import {
  normalizeJobsList,
  filterJobs,
  filterBySearchOnly,
  computeFacetCounts,
  topRecruiters,
  type NormalizedJob,
  type FilterState,
} from './utils/jobModel'

type Page = 'home' | 'register' | 'login' | 'profile' | 'offres' | 'entreprises' | 'salaires' | 'tendances' | 'offerDetail' | 'settings' | 'adminLogin' | 'adminDashboard'

interface AppUser {
  id: number
  firstName: string
  lastName: string
  email: string
  role: 'candidate' | 'recruiter' | 'admin'
  company?: string
  searchType?: string
}

const defaultFilters: FilterState = {
  contractTypes: [],
  workModes: [],
  experience: [],
  salaryMin: 25,
  salaryMax: 120,
}

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

function App() {
  const [page, setPage] = useState<Page>(() => {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/admin') {
      const stored = sessionStorage.getItem('adminUser');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user.role === 'admin') return 'adminDashboard';
        } catch {}
      }
      return 'adminLogin';
    }
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/profile') return 'profile';
    if (path === '/settings') return 'settings';
    return 'home';
  });
  const [catalogJobs, setCatalogJobs] = useState<NormalizedJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [lastJobsSyncAt, setLastJobsSyncAt] = useState<string>('-')
  const [heroQuery, setHeroQuery] = useState('')
  const [heroLocation, setHeroLocation] = useState('')
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [savedIds, setSavedIds] = useState<string[]>(() => readSavedIds())
  const [savedCount, setSavedCount] = useState(() => readSavedIds().length)
  const [applicationsCount, setApplicationsCount] = useState(0)

  const [oauth2faToken, setOauth2faToken] = useState<string | null>(null)
  const [oauth2faCode, setOauth2faCode] = useState('')
  const [oauth2faError, setOauth2faError] = useState('')
  const [oauth2faLoading, setOauth2faLoading] = useState(false)

  const [loggedAdminUser, setLoggedAdminUser] = useState<AppUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('adminUser')
      return stored ? JSON.parse(stored) as AppUser : null
    } catch {
      return null
    }
  })

  const [loggedUser, setLoggedUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('user')
      const user = stored ? JSON.parse(stored) as AppUser : null
      if (user && !user.firstName) {
        const token = localStorage.getItem('token')
        if (token) {
          const decoded = parseJwt(token)
          if (decoded?.first_name) {
            user.firstName = decoded.first_name
            user.lastName = decoded.last_name || ''
            user.searchType = decoded.search_type || user.searchType
            localStorage.setItem('user', JSON.stringify(user))
          } else if (decoded?.email) {
            user.firstName = decoded.email.split('@')[0]
            localStorage.setItem('user', JSON.stringify(user))
          }
        }
      }
      return user
    } catch {
      return null
    }
  })

  const loadJobs = useCallback(async (opts?: { noCache?: boolean }) => {
    try {
      setLoadingJobs(true)
      let apiJobs: unknown[] = []

      try {
        const catalog = await jobsAPI.getCatalog(Boolean(opts?.noCache))
        apiJobs = jobsResponseToArray(catalog)
      } catch {
        const response = await jobsAPI.getJobs({ limit: 2000, noCache: opts?.noCache })
        apiJobs = jobsResponseToArray(response)
      }

      const normalized = normalizeJobsList(apiJobs.length > 0 ? apiJobs : [])
      setCatalogJobs(normalized)
      saveCatalogCache(
        normalized.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          description: j.description,
          summary: j.summary,
          location: j.location,
          contract_type: j.contract_type,
          remote: j.remote,
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          url: j.applyUrl,
          logo: j.logo,
          tags: j.tags,
        })),
      )
      setLastJobsSyncAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    } catch (error) {
      console.error('Failed to load jobs:', error)
      setCatalogJobs([])
      setLastJobsSyncAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  useEffect(() => {
    console.log('App.tsx - Bootstrapping jobs...');
    const bootstrap = async () => {
      try {
        setLastJobsSyncAt('Synchronisation WeLoveDevs…')
        await jobsAPI.syncJobs({ full: true })
      } catch (err) {
        console.warn('Sync WeLoveDevs:', err)
      }
      await loadJobs({ noCache: true })
    }
    void bootstrap()

    const id = window.setInterval(() => {
      void loadJobs({ noCache: true })
    }, 5 * 60_000)
    return () => window.clearInterval(id)
  }, [loadJobs])

  useEffect(() => {
    console.log('App.tsx - Checking URL params for token...');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const oauth2fa = params.get('oauth2fa');
    
    console.log('App.tsx - URL params:', { token, oauth2fa });
    
    if (oauth2fa) {
      console.log('App.tsx - OAuth 2FA token found, redirecting to login');
      setOauth2faToken(oauth2fa);
      setPage('login');
      window.history.replaceState({}, document.title, '/login');
    } else if (token) {
      console.log('App.tsx - Token found, decoding...');
      const decodedUser = parseJwt(token);
      if (decodedUser) {
        console.log('App.tsx - Decoded user:', decodedUser);
        const mappedUser = {
          id: decodedUser.id,
          firstName: decodedUser.first_name || decodedUser.firstName,
          lastName: decodedUser.last_name || decodedUser.lastName,
          email: decodedUser.email,
          role: decodedUser.role,
          searchType: decodedUser.search_type || decodedUser.searchType,
          company: decodedUser.company,
          jobTitle: decodedUser.job_title || decodedUser.jobTitle
        };
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(mappedUser));
        setLoggedUser(mappedUser as AppUser);
        window.history.replaceState({}, document.title, window.location.pathname);
        if (decodedUser.role === 'admin') {
          console.log('App.tsx - Admin user, redirecting to admin login');
          setPage('adminLogin');
        } else if (decodedUser.role === 'candidate') {
          console.log('App.tsx - Candidate user, redirecting to profile');
          setPage('profile');
        } else {
          console.log('App.tsx - Other user, redirecting to home');
          setPage('home');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (page !== 'login' && page !== 'adminLogin') {
      console.log('App.tsx - Cleaning OAuth 2FA token');
      setOauth2faToken(null)
      setOauth2faCode('')
      setOauth2faError('')
    }
  }, [page])
  
  useEffect(() => {
    if (page !== 'adminDashboard' && page !== 'adminLogin') {
      console.log('App.tsx - Cleaning admin session');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      setLoggedAdminUser(null);
    }
  }, [page]);

  useEffect(() => {
    const titles: Record<Page, string> = {
      home: 'JobSense - Offres tech et stages',
      register: 'Créer un compte - JobSense',
      login: 'Connexion - JobSense',
      profile: 'Profil candidat - JobSense',
      offres: "Offres d'emploi - JobSense",
      entreprises: 'Entreprises - JobSense',
      salaires: 'Grille des salaires - JobSense',
      tendances: 'Tendances du marché - JobSense',
      offerDetail: "Détail de l'offre - JobSense",
      settings: 'Paramètres - JobSense',
      adminLogin: 'Connexion admin - JobSense',
      adminDashboard: 'Administration - JobSense',
    };
    document.title = titles[page];
  }, [page]);

  const facetBase = useMemo(
    () => filterBySearchOnly(catalogJobs, heroQuery, heroLocation),
    [catalogJobs, heroQuery, heroLocation],
  )
  const facetCounts = useMemo(() => computeFacetCounts(facetBase), [facetBase])
  const filteredJobs = useMemo(
    () => filterJobs(catalogJobs, heroQuery, heroLocation, filters),
    [catalogJobs, heroQuery, heroLocation, filters],
  )
  const recruiters = useMemo(() => topRecruiters(facetBase, 4), [facetBase])

  const handleSaveJob = useCallback(async (jobId: string, hint?: NormalizedJob) => {
    try {
      console.log('App.tsx - Saving job:', jobId);
      const jobHint = hint ?? catalogJobs.find((j) => j.id === jobId)
      const { ids, added } = toggleSavedJob(jobId, jobHint)
      setSavedIds(ids)
      setSavedCount(ids.length)

      const token = localStorage.getItem('token')
      if (!token) return

      if (added) {
        const snapshot = jobHint ? jobToSnapshot(jobHint) : undefined
        await usersAPI.addSavedJob(jobId, snapshot)
      } else {
        await usersAPI.removeSavedJob(jobId)
      }
    } catch (err) {
      console.warn('Save job:', err)
    }
  }, [catalogJobs])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !loggedUser) return

    console.log('App.tsx - Loading saved jobs for user:', loggedUser.email);
    void (async () => {
      try {
        const res = await usersAPI.getSavedJobs()
        const ids = mergeSavedFromServer(res.data)
        setSavedIds(ids)
        setSavedCount(ids.length)
      } catch {
        console.log('App.tsx - Failed to load saved jobs, using local favorites');
        /* favoris locaux */
      }
    })()
  }, [loggedUser?.email])

  const handleLoginSuccess = (user: AppUser, token?: string) => {
    console.log('App.tsx - Login success:', user, token);
    if (token) localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setLoggedUser(user)
    if (user.role === 'candidate') setPage('profile')
  }

  const handleAdminLoginSuccess = (user: AppUser) => {
    console.log('App.tsx - Admin login success:', user);
    setLoggedAdminUser(user)
    setPage('adminDashboard')
  }

  const handleOAuth2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauth2faCode || !oauth2faToken) return;
    setOauth2faLoading(true);
    setOauth2faError('');
    try {
      console.log('App.tsx - Verifying OAuth 2FA token...');
      const res = await fetch('/api/auth/2fa/verify-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: oauth2faToken, token: oauth2faCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Code invalide.');
      
      console.log('App.tsx - OAuth 2FA success, setting token and user');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setLoggedUser(data.user);
      setOauth2faToken(null);
      setPage(data.user.role === 'candidate' ? 'profile' : 'home');
    } catch (err: any) {
      console.log('App.tsx - OAuth 2FA error:', err);
      setOauth2faError(err.message);
    } finally {
      setOauth2faLoading(false);
    }
  };

  const handleAdminLogout = () => {
    console.log('App.tsx - Admin logging out');
    sessionStorage.removeItem('adminToken')
    sessionStorage.removeItem('adminUser')
    setLoggedAdminUser(null)
    setPage('adminLogin')
  }

  const handleLogout = () => {
    console.log('App.tsx - Logging out');
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setLoggedUser(null)
    setPage('home')
  }

  if (page === 'adminLogin') {
    return (
      <AdminLogin 
        onBack={() => {
          window.history.replaceState({}, document.title, '/');
          setPage('home');
        }} 
        onLoginSuccess={handleAdminLoginSuccess} 
      />
    );
  }

  if (page === 'adminDashboard' && loggedAdminUser?.role === 'admin') {
    return (
      <>
        {oauth2faToken && (
          <div className="pf-modal-overlay">
            <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="oauth2fa-title">
              <div className="pf-modal-header">
                <h2 id="oauth2fa-title">Vérification 2FA</h2>
              </div>
              <div className="pf-modal-body">
                <p style={{ marginBottom: '1rem' }}>Entrez le code à 6 chiffres généré par votre application d'authentification.</p>
                <form onSubmit={handleOAuth2FASubmit} aria-describedby={oauth2faError ? 'oauth2fa-modal-error' : undefined}>
                  <label className="sr-only" htmlFor="oauth2fa-modal-code">Code de vérification 2FA</label>
                  <input 
                    id="oauth2fa-modal-code"
                    type="text" 
                    value={oauth2faCode} 
                    onChange={e => setOauth2faCode(e.target.value)} 
                    placeholder="123456" 
                    className="pf-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                  {oauth2faError && <p id="oauth2fa-modal-error" className="form-error" role="alert" style={{ marginTop: '0.5rem' }}>{oauth2faError}</p>}
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={oauth2faLoading}>
                    {oauth2faLoading ? 'Vérification...' : 'Valider'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        <AdminDashboard
          user={loggedAdminUser as AppUser & { role: 'admin' }}
          onLogout={handleAdminLogout}
        />
      </>
    )
  }

  if (loggedUser?.role === 'recruiter') {
    return (
      <>
        {oauth2faToken && (
          <div className="pf-modal-overlay">
            <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="oauth2fa-title">
              <div className="pf-modal-header">
                <h2 id="oauth2fa-title">Vérification 2FA</h2>
              </div>
              <div className="pf-modal-body">
                <p style={{ marginBottom: '1rem' }}>Entrez le code à 6 chiffres généré par votre application d'authentification.</p>
                <form onSubmit={handleOAuth2FASubmit} aria-describedby={oauth2faError ? 'oauth2fa-modal-error' : undefined}>
                  <label className="sr-only" htmlFor="oauth2fa-modal-code">Code de vérification 2FA</label>
                  <input 
                    id="oauth2fa-modal-code"
                    type="text" 
                    value={oauth2faCode} 
                    onChange={e => setOauth2faCode(e.target.value)} 
                    placeholder="123456" 
                    className="pf-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                  {oauth2faError && <p id="oauth2fa-modal-error" className="form-error" role="alert" style={{ marginTop: '0.5rem' }}>{oauth2faError}</p>}
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={oauth2faLoading}>
                    {oauth2faLoading ? 'Vérification...' : 'Valider'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        <EmployerDashboard
          user={loggedUser as AppUser & { role: 'recruiter' }}
          onLogout={handleLogout}
        />
      </>
    )
  }

  const nav = (
    <Navigation
      onLogoClick={() => setPage('home')}
      onLoginClick={() => setPage('login')}
      onSignupClick={() => setPage('register')}
      onProfileClick={loggedUser ? () => setPage('profile') : undefined}
      onNavClick={(p) => setPage(p as 'offres' | 'entreprises' | 'salaires' | 'tendances')}
      activePage={(['offres', 'entreprises', 'salaires', 'tendances'].includes(page) ? page : 'home') as 'home' | 'offres' | 'entreprises' | 'salaires' | 'tendances'}
      userFirstName={loggedUser?.firstName || loggedUser?.email?.split('@')[0]}
    />
  )

  if (page === 'offres')      return <>{nav}<OffresPage onBack={() => setPage('home')} onOpenJob={(jobId) => { setSelectedJobId(jobId); setPage('offerDetail'); }} /><Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} /></>
  if (page === 'entreprises') return <>{nav}<EntreprisesPage onBack={() => setPage('home')} /><Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} /></>
  if (page === 'salaires')    return <>{nav}<SalairesPage onBack={() => setPage('home')} /><Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} /></>
  if (page === 'tendances')   return <>{nav}<TendancesPage onBack={() => setPage('home')} /><Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} /></>
  if (page === 'offerDetail') {
    const selectedJob = catalogJobs.find(job => job.id === selectedJobId) || filteredJobs[0]
    if (!selectedJob) return <>{nav}<OffresPage onBack={() => setPage('home')} onOpenJob={(jobId) => { setSelectedJobId(jobId); setPage('offerDetail'); }} /><Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} /></>
    return (
      <>
        {nav}
        <OfferDetailPage
          job={selectedJob}
          isSaved={savedIds.includes(selectedJob.id)}
          onSave={() => void handleSaveJob(selectedJob.id, selectedJob)}
          onBack={() => setPage('offres')}
          isLoggedIn={!!loggedUser}
          userRole={loggedUser?.role}
          onLoginRequired={() => setPage('login')}
        />
        <Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} />
      </>
    )
  }

  if (page === 'login') {
    return (
      <div className="page-register">
        {nav}
        <Login
          onBack={() => { setOauth2faToken(null); setPage('home') }}
          onSignupClick={() => setPage('register')}
          oauth2faTempToken={oauth2faToken}
          onLoginSuccess={handleLoginSuccess}
        />
        <Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} />
      </div>
    )
  }

  if (page === 'profile') {
    if (!loggedUser) {
      setPage('login')
      return null
    }
    return (
      <>
        <Profile 
          onBack={() => setPage('home')} 
          onLogout={() => { handleLogout(); setPage('home'); }} 
          onSettingsClick={() => setPage('settings')}
          onProfileSaved={(u) => setLoggedUser((prev) => (prev ? { ...prev, ...u } : prev))}
          user={loggedUser as any} 
        />
        <Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={true} />
      </>
    )
  }

  if (page === 'settings') {
    if (!loggedUser) {
      setPage('login')
      return null
    }
    return (
      <>
        <Settings onBack={() => setPage('profile')} user={loggedUser as any} />
        <Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={true} />
      </>
    )
  }

  if (page === 'register') {
    return (
      <div className="page-register">
        {nav}
        <Register
          onBack={() => setPage('home')}
          onLoginClick={() => setPage('login')}
          onRegisterSuccess={({ user, token }) => { handleLoginSuccess(user as AppUser, token); setPage('profile') }}
        />
        <Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} />
      </div>
    )
  }

  const uniqueCompanies = new Set(catalogJobs.map(job => job.company)).size
  const normalizedRate = catalogJobs.length > 0
    ? Math.min(100, Math.round((catalogJobs.filter(job => job.title && job.company && job.location).length / catalogJobs.length) * 100))
    : 0

  return (
    <>
      {nav}
      <Hero
        query={heroQuery}
        location={heroLocation}
        onQueryChange={setHeroQuery}
        onLocationChange={setHeroLocation}
        onSearch={() => {
          document.querySelector('.main .jobs-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        onTagClick={(t) => {
          setHeroQuery((q) => (q ? `${q} ${t}`.trim() : t))
        }}
        stats={{
          indexedJobs: catalogJobs.length,
          companies: uniqueCompanies,
          lastSyncLabel: lastJobsSyncAt,
          normalizedRate,
        }}
      />
      <div className="main">
        <Filters
          facetCounts={facetCounts}
          value={filters}
          onChange={setFilters}
          onApply={() => {
            document.querySelector('.main .jobs-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
        <JobList
          jobs={filteredJobs}
          loading={loadingJobs}
          savedIds={savedIds}
          onOpenJob={(jobId) => { setSelectedJobId(jobId); setPage('offerDetail'); }}
          onSaveJob={handleSaveJob}
        />
        <Sidebar
          userEmail={loggedUser?.email}
          userFirstName={loggedUser?.firstName}
          userLastName={loggedUser?.lastName}
          searchType={loggedUser?.searchType}
          onLoginClick={() => setPage('login')}
          onSignupClick={() => setPage('register')}
          onProfileClick={() => setPage('profile')}
          onAlertCreate={(e) => console.log('alert', e)}
          topRecruiters={recruiters}
          savedCount={savedCount}
          applicationsCount={applicationsCount}
        />
      </div>
      <Footer onCreateAccountClick={() => setPage('register')} isLoggedIn={!!loggedUser} />
    </>
  )
}

export default App
