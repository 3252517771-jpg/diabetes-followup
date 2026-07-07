import axios from 'axios'

import { API_BASE_URL } from '../config/api'

export const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
