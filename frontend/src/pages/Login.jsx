import { useState } from 'react'
import PageMeta from '../components/common/PageMeta'
import Input from '../components/form/input/InputField'
import Label from '../components/form/Label'
import Button from '../components/ui/button/Button'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.user, data.token)
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <PageMeta title="Connexion | GalaxyFood" description="Connectez-vous à votre compte" />

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <img src="/favicon.svg" alt="GalaxyFood" className="h-9 w-9" />
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Galaxy<span className="text-brand-500">Food</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connectez-vous à votre compte
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="mb-5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@galaxyfood.com"
              error={!!error}
              required
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              error={!!error}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Login
