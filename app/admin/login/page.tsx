'use client'

import { useState } from 'react'
import { loginAdmin } from '../actions'

export default function AdminLogin() {
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(formData: FormData) {
    setErrorMessage('')
    // When using standard form action in Next.js/React, we can wrap the server action
    // to handle the return value on the client side.
    const result = await loginAdmin(formData)
    
    // If we are here, it means redirect didn't happen (and likely an error occurred)
    if (result?.error) {
      setErrorMessage(result.error)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h1>
        <form action={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input 
              type="text" 
              name="id" 
              required 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {errorMessage && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}
