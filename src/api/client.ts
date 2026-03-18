import axios from 'axios'

const host = window.location.hostname
const SERVER_PORT = 8888

export const API_BASE = (host === 'localhost' || host === '127.0.0.1')
  ? `http://localhost:${SERVER_PORT}`
  : `http://${host}:${SERVER_PORT}`

const api = axios.create({ baseURL: `${API_BASE}/api` })

export default api



// import axios from 'axios'

// const host = window.location.hostname
// const SERVER_PORT = 5173

// export const API_BASE = (host === 'localhost' || host === '127.0.0.1')
//   ? `http://localhost:${SERVER_PORT}`
//   : `http://${host}:${SERVER_PORT}`

// const api = axios.create({ baseURL: `http://10.35.14.13:5173/api` })

// export default api