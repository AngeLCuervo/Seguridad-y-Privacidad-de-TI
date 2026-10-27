import { useState } from 'react'
import { login, logout, helloPublico, helloSeguro, helloAdmin } from './services/authService'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [respuesta, setRespuesta] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({ username: 'usuario', password: 'user123' })

  const limpiar = () => { setError(null); setRespuesta(null) }

  const handleLogin = async (e) => {
    e.preventDefault()
    limpiar()
    setCargando(true)
    try {
      const data = await login(form.username, form.password)
      setUsuario(data.usuario)
      setRespuesta({ tipo: 'Login exitoso', ...data })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleLogout = () => {
    logout()
    setUsuario(null)
    limpiar()
  }

  const llamar = (fn, tipo) => async () => {
    limpiar()
    setCargando(true)
    try {
      const data = await fn()
      setRespuesta({ tipo, ...data })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={s.contenedor}>
      <h1 style={s.titulo}>Demo SPTI-1 Observabilidad y logging de seguridad en aplicaciones</h1>

      <div style={s.sesion}>
        {usuario
          ? <span style={s.badge('verde')}>Autenticado: {usuario}</span>
          : <span style={s.badge('gris')}>No autenticado</span>
        }
      </div>

      {!usuario && (
        <form onSubmit={handleLogin} style={s.form}>
          <h2 style={s.subtitulo}>Iniciar sesión</h2>
          <input
            style={s.input}
            placeholder="Usuario (admin / usuario)"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          />
          <input
            style={s.input}
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          <button style={s.btn('azul')} type="submit" disabled={cargando}>
            {cargando ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
      )}

      <div style={s.botones}>
        <button style={s.btn('gris')} onClick={llamar(helloPublico, 'GET /api/hello (público)')} disabled={cargando}>
          GET /api/hello
        </button>
        {usuario && (
        <button style={s.btn('gris')} onClick={llamar(helloSeguro, 'GET /api/hello/seguro')} disabled={cargando || !usuario}>
          GET /api/hello/seguro
        </button>
        )}
        {usuario && (
        <button style={s.btn('gris')} onClick={llamar(helloAdmin, 'GET /api/admin/hello')} disabled={cargando || !usuario}>
          GET /api/admin/hello
        </button>
        )}
        {usuario && (
          <button style={s.btn('rojo')} onClick={handleLogout}>
            Cerrar sesión
          </button>
        )}
      </div>

      {respuesta && (
        <div style={s.respuesta}>
          <p style={s.label}>{respuesta.tipo}</p>
          <pre style={s.pre}>{JSON.stringify(respuesta, null, 2)}</pre>
          {respuesta.traceId && (
            <p style={s.traceHint}>
              TraceID: <code>{respuesta.traceId}</code>
            </p>
          )}
        </div>
      )}

      {error && (
        <div style={s.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}

const s = {
  contenedor: { maxWidth: 640, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' },
  titulo: { fontSize: 22, fontWeight: 600, marginBottom: 8 },
  subtitulo: { fontSize: 16, fontWeight: 500, marginBottom: 12 },
  sesion: { marginBottom: 20 },
  badge: (c) => ({
    padding: '4px 10px', borderRadius: 12, fontSize: 13,
    background: c === 'verde' ? '#e6f4ea' : '#f1efea',
    color: c === 'verde' ? '#1a6e35' : '#5f5e5a'
  }),
  form: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, padding: 20, border: '1px solid #e0e0e0', borderRadius: 10 },
  input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 14, outline: 'none' },
  btn: (c) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
    background: c === 'azul' ? '#378add' : c === 'verde' ? '#1d9e75' : c === 'rojo' ? '#e24b4a' : c === 'morado' ? '#7f77dd' : '#d3d1c7',
    color: c === 'gris' ? '#2c2c2a' : '#fff'
  }),
  botones: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  respuesta: { padding: 16, borderRadius: 10, background: '#f8f8f6', border: '1px solid #e0e0e0', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 600, color: '#534ab7', marginBottom: 6 },
  pre: { fontSize: 12, overflow: 'auto', margin: 0 },
  traceHint: { fontSize: 12, color: '#854f0b', marginTop: 8 },
  errorBox: { padding: 12, borderRadius: 8, background: '#fcebeb', color: '#a32d2d', fontSize: 14, marginBottom: 16 },
  hint: { fontSize: 12, color: '#888', margin: 0 },
  info: { padding: 12, borderRadius: 8, background: '#e6f1fb', color: '#0c447c', fontSize: 13, marginTop: 12 }
}
