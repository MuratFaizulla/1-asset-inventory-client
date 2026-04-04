import axios from 'axios'

// Берём базовый URL из переменной окружения Vite.
// В dev режиме: VITE_API_URL=http://localhost:8888/api
// В prod: укажите адрес сервера в .env перед сборкой
const baseURL = import.meta.env.VITE_API_URL ?? (() => {
  const host = window.location.hostname
  const SERVER_PORT = 8888
  return `http://${host}:${SERVER_PORT}/api`
})()

export const API_BASE = baseURL.replace(/\/api$/, '')

const api = axios.create({ baseURL })

export default api
