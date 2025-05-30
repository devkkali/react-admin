import { useState, useEffect } from 'react'
import { Link, useNavigate }   from 'react-router-dom'
import api                     from '../api'

interface Role    { id: number; name: string }
interface Perm    { id: number; name: string }
interface Program { id: number; name: string }

export default function RolesPermissions() {
  const [roles, setRoles]                   = useState<Role[]>([])
  const [perms, setPerms]                   = useState<Perm[]>([])
  const [programs, setPrograms]             = useState<Program[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number|null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState<number|null>(null)
  const [assigned, setAssigned]             = useState<Set<string>>(new Set())
  const [message, setMessage]               = useState<string>('')
  const navigate = useNavigate()

  // 1) load roles, permissions & programs
  useEffect(() => {
    api.get<Role[]>('/roles').then(r => setRoles(r.data))
    api.get<Perm[]>('/permissions').then(r => setPerms(r.data))
    api.get<Program[]>('/programs').then(r => setPrograms(r.data))
  }, [])

  // 2) when role or program changes, fetch scoped perms
  useEffect(() => {
    if (selectedRoleId === null || selectedProgramId === null) {
      setAssigned(new Set())
      return
    }
    api.get<string[]>(`/roles/${selectedRoleId}/permissions`, {
      params: { program_id: selectedProgramId }
    })
    .then(r => setAssigned(new Set(r.data)))
    .catch(err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        navigate('/')
      }
    })
  }, [selectedRoleId, selectedProgramId, navigate])

  const togglePerm = (name: string) => {
    setAssigned(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const save = async () => {
    if (selectedRoleId === null || selectedProgramId === null) return
    const { data } = await api.post(
      `/roles/${selectedRoleId}/permissions`,
      {
        permissions: Array.from(assigned),
        program_id: selectedProgramId
      }
    )
    setMessage(data.message)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">

        <header className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Roles & Permissions</h2>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </header>

        <div className="mb-4">
          <label className="block mb-1 text-gray-700">Select Role</label>
          <select
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedRoleId ?? ''}
            onChange={e => setSelectedRoleId(Number(e.target.value))}
          >
            <option value="" disabled>— choose a role —</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-gray-700">Select Program</label>
          <select
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedProgramId ?? ''}
            onChange={e => setSelectedProgramId(Number(e.target.value))}
          >
            <option value="" disabled>— choose a program —</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedRoleId !== null && selectedProgramId !== null && (
          <>
            <div className="mb-4">
              <label className="block mb-1 text-gray-700">Assign Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {perms.map(p => (
                  <label key={p.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={assigned.has(p.name)}
                      onChange={() => togglePerm(p.name)}
                      className="mr-2"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={save}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Save Changes
            </button>

            {message && (
              <div className="mt-3 text-sm text-green-700">
                {message}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
