import { useState } from 'react';
import { useGetAllUsersQuery, useToggleUserBlockStatusMutation } from './adminApiSlice';
import { toast } from 'react-toastify';
import { Search, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react';
import { getApiErrorMessage } from '@/app/apiError';

const UserManagementPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetAllUsersQuery({ pageNumber: page, pageSize: 10 });
  const [toggleBlock, { isLoading: isToggling }] = useToggleUserBlockStatusMutation();

  const filteredUsers =
    data?.items?.filter((user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const handleToggleBlock = async (userId: string, currentStatus: boolean, userName: string) => {
    const action = currentStatus ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`¿Estás seguro de que deseas ${action} a ${userName}?`)) return;

    try {
      await toggleBlock(userId).unwrap();
      toast.success(`Usuario ${currentStatus ? 'desbloqueado' : 'bloqueado'} correctamente`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, `No se pudo ${action} al usuario`));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Controles de clientes</p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#111827]">Usuarios</h2>
        <p className="mt-2 text-sm text-[#6f6659]">Revisa roles de cuenta, estado activo y controles de acceso de clientes.</p>
      </div>

      <section className="border border-[#e1d5c2] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#eee6da] bg-[#fbfaf7] p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
            <input
              type="search"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full border border-[#d8cdbb] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#9d731e]"
            />
          </label>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c7467]">
            {data?.totalCount || 0} usuarios
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center p-10">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#eee6da] bg-[#f3ecdf] text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43] dark:border-[#33363d] dark:bg-[#16181d] dark:text-[#9a9388]">
                  <tr>
                    <th className="px-5 py-4">Usuario</th>
                    <th className="px-5 py-4">Rol</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee6da]">
                  {filteredUsers.length ? (
                    filteredUsers.map((user) => (
                      <tr key={user.userId} className="transition-colors hover:bg-[#fbfaf7]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="grid h-11 w-11 place-items-center bg-[#111827] text-sm font-black uppercase text-[#d7b46a]">
                              {user.name?.charAt(0).toUpperCase() || <UserRound className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#111827]">{user.name}</p>
                              <p className="mt-1 text-xs text-[#7c7467]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            user.role === 'Admin' ? 'bg-[#111827] text-[#d7b46a]' : 'bg-[#f3ecdf] text-[#514b43] dark:bg-[#16181d] dark:text-[#9a9388]'
                          }`}>
                            {user.role || 'Usuario'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            user.isBlocked ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.isBlocked ? 'Bloqueado' : 'Activo'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {user.role !== 'Admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(user.userId, user.isBlocked, user.name)}
                              disabled={isToggling}
                              className={`inline-flex h-9 items-center justify-center gap-2 border px-4 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-50 ${
                                user.isBlocked
                                  ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                  : 'border-red-200 text-red-700 hover:bg-red-50'
                              }`}
                            >
                              {user.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                               {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron usuarios.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden divide-y divide-[#eee6da]">
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <div key={user.userId} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 grid h-10 w-10 place-items-center bg-[#111827] text-sm font-black uppercase text-[#d7b46a]">
                        {user.name?.charAt(0).toUpperCase() || <UserRound className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#111827] truncate">{user.name}</p>
                        <p className="text-xs text-[#7c7467] truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          user.role === 'Admin' ? 'bg-[#111827] text-[#d7b46a]' : 'bg-[#f3ecdf] text-[#514b43] dark:bg-[#16181d] dark:text-[#9a9388]'
                        }`}>
                          {user.role || 'User'}
                        </span>
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          user.isBlocked ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                            {user.isBlocked ? 'Bloqueado' : 'Activo'}
                        </span>
                      </div>
                      {user.role !== 'Admin' && (
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(user.userId, user.isBlocked, user.name)}
                          disabled={isToggling}
                          className={`shrink-0 inline-flex h-8 items-center justify-center gap-1.5 border px-3 text-[10px] font-black uppercase tracking-[0.16em] disabled:opacity-50 ${
                            user.isBlocked
                              ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'border-red-200 text-red-700 hover:bg-red-50'
                          }`}
                        >
                          {user.isBlocked ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                           {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron usuarios.</div>
              )}
            </div>
          </>
        )}

        {data && data.totalCount > 10 && (
          <div className="flex items-center justify-between border-t border-[#eee6da] bg-[#fbfaf7] px-5 py-4">
            <p className="text-sm text-[#6f6659]">
              Página <span className="font-bold text-[#111827]">{data.pageNumber}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
                className="h-9 border border-[#d8cdbb] bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={data.items.length < data.pageSize}
                onClick={() => setPage((value) => value + 1)}
                className="h-9 border border-[#d8cdbb] bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserManagementPage;
