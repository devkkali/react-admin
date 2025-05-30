// src/pages/UserRoles.tsx

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api'

interface Role       { id: number; name: string }
interface Program    { id: number; name: string }
interface Perm       { id: number; name: string }
interface Assignment {
  program_id:  number
  roles:       string[]
  permissions: string[]
}

export default function UserRoles() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  const navigate = useNavigate()

  // master lists
  const [roles, setRoles]   = useState<Role[]>([])
  const [perms, setPerms]   = useState<Perm[]>([])
  // per‐program assignments
  const [programs, setPrograms]               = useState<Program[]>([])
  const [rolesByProgram, setRolesByProgram]   = useState<Record<number, Set<string>>>({})
  const [permsByProgram, setPermsByProgram]   = useState<Record<number, Set<string>>>({})
  const [message, setMessage] = useState<string>('')

  function redirectToLogin() {
    localStorage.removeItem('token')
    navigate('/')
  }

  // 1) Load everything (roles, perms, assignments)
  useEffect(() => {
    async function fetchAll() {
      try {
        const [ rolesRes, permsRes, assignRes ] = await Promise.all([
          api.get<Role[]>      ('/roles'),
          api.get<Perm[]>      ('/permissions'),
          api.get<{ programs: Array<{
            id: number
            name: string
            roles: string[]
            permissions: string[]
          }> }>(`/users/${userId}/assignments`),
        ])

        setRoles(rolesRes.data)
        setPerms(permsRes.data)

        // unpack assignments
        const assignments = assignRes.data.programs
        setPrograms(assignments.map(p => ({ id: p.id, name: p.name })))

        // build two maps of Sets
        const rMap: Record<number, Set<string>> = {}
        const pMap: Record<number, Set<string>> = {}
        assignments.forEach(p => {
          rMap[p.id] = new Set(p.roles)
          pMap[p.id] = new Set(p.permissions)
        })
        setRolesByProgram(rMap)
        setPermsByProgram(pMap)

      } catch (e: any) {
        if (e.response?.status === 401) redirectToLogin()
        else setMessage('Failed to load data')
      }
    }
    fetchAll()
  }, [userId])

  // 2) Immutable toggles
  const toggleRole = (pid: number, name: string) => {
    setRolesByProgram(prev => {
      const current = prev[pid] ?? new Set<string>()
      const nextSet = new Set(current)
      if (nextSet.has(name)) nextSet.delete(name)
      else nextSet.add(name)
      return { ...prev, [pid]: nextSet }
    })
  }
  const togglePerm = (pid: number, name: string) => {
    setPermsByProgram(prev => {
      const current = prev[pid] ?? new Set<string>()
      const nextSet = new Set(current)
      if (nextSet.has(name)) nextSet.delete(name)
      else nextSet.add(name)
      return { ...prev, [pid]: nextSet }
    })
  }

  // 3) Bulk save via one endpoint
  const save = async () => {
    setMessage('Saving…')
    const assignments: Assignment[] = programs.map(p => ({
      program_id:  p.id,
      roles:        Array.from(rolesByProgram[p.id]  || []),
      permissions: Array.from(permsByProgram[p.id]  || []),
    }))

    try {
      const { data } = await api.post(
        `/users/${userId}/assignments`,
        { assignments }
      )
      setMessage(data.message || 'Saved successfully')
    } catch (e: any) {
      if (e.response?.status === 401) redirectToLogin()
      else setMessage(e.response?.data?.message || 'Save failed')
    } finally {
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">

        <header className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Assign Roles & Permissions for User #{userId}
          </h2>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            ← Back
          </Link>
        </header>

        {programs.map(program => (
          <section key={program.id} className="mb-8">
            <h3 className="text-lg font-semibold mb-2">
              {program.name}
            </h3>

            {/* Roles */}
            <div className="mb-4">
              <p className="font-medium mb-1">Roles</p>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(r => (
                  <label key={r.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={rolesByProgram[program.id]?.has(r.name) ?? false}
                      onChange={() => toggleRole(program.id, r.name)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-4">
              <p className="font-medium mb-1">Permissions</p>
              <div className="grid grid-cols-3 gap-2">
                {perms.map(p => (
                  <label key={p.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={permsByProgram[program.id]?.has(p.name) ?? false}
                      onChange={() => togglePerm(program.id, p.name)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          </section>
        ))}

        <button
          onClick={save}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Save All Programs
        </button>

        {message && (
          <div className="mt-4 text-center text-sm text-green-700">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
