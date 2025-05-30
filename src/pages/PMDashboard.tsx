// src/pages/PMDashboard.tsx

import { useState, useEffect } from 'react'
import { useNavigate, Link }   from 'react-router-dom'
import api                     from '../api'

// Mirror your PHP enum values here
enum Permission {
  VIEWPASSENGER   = 'view-passenger',
  CREATEPASSENGER = 'create-passenger',
  DELETEPASSENGER = 'delete-passenger',
}

interface Passenger {
  id: number
  name: string
  program_id: number
  program: string
}

// programs come back with their own roles & permissions
interface ProgramAssignment {
  id:          number
  name:        string
  roles:       string[]
  permissions: string[]
}

interface Me {
  id:          number
  name:        string
  email:       string
  roles:       string[]
  permissions: string[]           // global union of all perms
  programs:    ProgramAssignment[] 
}

export default function PMDashboard() {
  const [me, setMe]                 = useState<Me|null>(null)
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [newName, setNewName]       = useState('')
  const [newProgram, setNewProgram] = useState<number|''>('')
  const [error, setError]           = useState<string|null>(null)
  const navigate = useNavigate()

  // 1) Load current user (with program assignments)
  useEffect(() => {
    api.get<Me>('/user')
      .then(({ data }) => setMe(data))
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/')
      })
  }, [navigate])

  // 2) Load passenger list (already filtered by backend)
  useEffect(() => {
    api.get<Passenger[]>('/passengers')
      .then(r => setPassengers(r.data))
      .catch(err => {
        if ([401,403].includes(err.response?.status)) {
          localStorage.removeItem('token')
          navigate('/')
        } else {
          setError('Failed to load passengers')
        }
      })
  }, [navigate])

  if (!me) return null  // or a loader

  // permission flags (global union)
  const canView   = me.permissions.includes(Permission.VIEWPASSENGER)
  const canCreate = me.permissions.includes(Permission.CREATEPASSENGER)
  const canDelete = me.permissions.includes(Permission.DELETEPASSENGER)

  // for creation: only programs where they have create-passenger
  const createPrograms = me.programs.filter(p =>
    p.permissions.includes(Permission.CREATEPASSENGER)
  )

  // Create handler
  const create = async () => {
    setError(null)
    if (!newName || newProgram === '') {
      setError('Please enter a name and select a program.')
      return
    }
    try {
      await api.post('/passengers', {
        name: newName,
        program_id: newProgram,
      })
      setNewName('')
      setNewProgram('')
      const { data } = await api.get<Passenger[]>('/passengers')
      setPassengers(data)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create passenger')
    }
  }

  // Delete handler
  const remove = async (p: Passenger) => {
    setError(null)
    // only if they have delete-passenger on that program
    const prog = me.programs.find(x => x.id === p.program_id)
    if (!prog || !prog.permissions.includes(Permission.DELETEPASSENGER)) {
      setError('You are not allowed to delete this passenger.')
      return
    }
    try {
      await api.delete(`/passengers/${p.id}`)
      setPassengers(ps => ps.filter(x => x.id !== p.id))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to delete passenger')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">

        {/* Header */}
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Passenger List</h2>
          <div className="space-x-4">
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              Admin Dashboard
            </Link>
            <button
              onClick={async () => {
                await api.post('/logout')
                localStorage.removeItem('token')
                navigate('/')
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Create Passenger Form */}
        {canCreate && (
          <div className="mb-6 flex space-x-2">
            <input
              className="flex-1 border px-3 py-2 rounded"
              placeholder="New passenger name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <select
              className="border px-3 py-2 rounded"
              value={newProgram}
              onChange={e => setNewProgram(Number(e.target.value))}
            >
              <option value="" disabled>Select program</option>
              {createPrograms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={create}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create
            </button>
          </div>
        )}

        {/* Passenger Table */}
        {canView ? (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2 text-left">ID</th>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Program</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map(p => {
                const prog = me.programs.find(x => x.id === p.program_id)
                const showDelete = prog?.permissions.includes(Permission.DELETEPASSENGER)
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="border px-4 py-2">{p.id}</td>
                    <td className="border px-4 py-2">{p.name}</td>
                    <td className="border px-4 py-2">{p.program}</td>
                    <td className="border px-4 py-2">
                      {showDelete && (
                        <button
                          onClick={() => remove(p)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-600">You do not have permission to view passengers.</p>
        )}
      </div>
    </div>
  )
}
