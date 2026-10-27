// src/services/authService.js
import { tracer } from './otel'
import { SpanStatusCode } from '@opentelemetry/api'

let _token = null

const BASE_URL = '/api'

export async function login(username, password) {
  const span = tracer.startSpan('frontend.auth.login', {
    attributes: { 'auth.username': username, 'auth.method': 'password' }
  })
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: data.error })
      throw new Error(data.error || 'Login fallido')
    }
    _token = data.token
    span.setAttribute('auth.success', true)
    return data
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
    throw err
  } finally {
    span.end()
  }
}

export function logout() {
  _token = null
}

export function getToken() {
  return _token
}

export async function helloPublico() {
  const span = tracer.startSpan('frontend.hello.publico')
  try {
    const res = await fetch(`${BASE_URL}/hello`)
    const data = await res.json()
    span.setAttribute('response.traceId', data.traceId || '')
    return data
  } finally {
    span.end()
  }
}

export async function helloSeguro() {
  const span = tracer.startSpan('frontend.hello.seguro')
  try {
    const res = await fetch(`${BASE_URL}/hello/seguro`, {
      headers: { Authorization: `Bearer ${_token}` }
    })
    if (res.status === 401) throw new Error('No autenticado — haz login primero')
    const data = await res.json()
    span.setAttribute('response.traceId', data.traceId || '')
    return data
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
    throw err
  } finally {
    span.end()
  }
}

export async function helloAdmin() {
  const span = tracer.startSpan('frontend.hello.admin')
  try {
    const res = await fetch(`${BASE_URL}/admin/hello`, {
      headers: { Authorization: `Bearer ${_token}` }
    })
    if (res.status === 401) throw new Error('No autenticado — haz login primero')
    if (res.status === 403) throw new Error('Acceso denegado — necesitas rol ADMIN')
    const data = await res.json()
    span.setAttribute('response.traceId', data.traceId || '')
    return data
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
    throw err
  } finally {
    span.end()
  }
}
